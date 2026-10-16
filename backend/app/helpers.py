"""Shared helpers used by the public, auth, premium and admin blueprints."""
import json
import math
import re
from datetime import datetime, timedelta
from functools import wraps

import jwt
from flask import abort, current_app, has_request_context, jsonify, make_response, request

from app import db
from app.models import AppSetting, Category, City, Rating, User, Vendor


# -------------------- ERRORS --------------------

def api_error(message, code, status, **extra):
    """Contract error shape: {"error": <human message>, "code": <MACHINE_CODE>}."""
    return jsonify({"error": message, "code": code, **extra}), status


def abort_api(message, code, status, **extra):
    abort(make_response(*api_error(message, code, status, **extra)))


# -------------------- APP SETTINGS --------------------

PAYMENT_METHODS = ("upi", "card", "netbanking", "wallet", "emi", "paylater")

# Every key the admin panel can edit. All of them are also served to the apps and website.
DEFAULT_SETTINGS = {
    "maintenance_mode": False,
    "maintenance_message": "HungryBird is currently down for scheduled maintenance. We will be back shortly!",
    "min_app_version": "1.0.0",
    "latest_app_version": "1.0.0",
    "force_update_message": "A new version of HungryBird is available. Please update to continue.",
    "announcement": "",
    "support_email": "support@hungrybird.in",
    "support_phone": "",
    "play_store_url": "",
    "app_store_url": "",
    "website_url": "https://hungry-bird-gamma.vercel.app",
    "instagram_url": "",
    "facebook_url": "",
    "x_url": "",
    "youtube_url": "",
    "allow_guest_reviews": True,
    "default_city": "jaipur",
    # Premium stays off until the owner switches it on; nothing is locked while it is off.
    "premium_enabled": False,
    "payment_methods": ["upi"],
    "premium_benefits": ["Every hidden gem with address & directions", "All food trails"],
}

PUBLIC_SETTING_KEYS = tuple(DEFAULT_SETTINGS.keys())
URL_SETTING_KEYS = ("play_store_url", "app_store_url", "website_url", "instagram_url", "facebook_url", "x_url", "youtube_url")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PHONE_RE = re.compile(r"^\+?[0-9][0-9\s\-()]{5,19}$")


def _request_cache():
    # Settings are read several times per request (vendor locks, config); cache them per request only.
    return request._get_current_object() if has_request_context() else None


def get_settings():
    holder = _request_cache()
    cached = getattr(holder, "_hb_settings", None)
    if cached is not None:
        return dict(cached)
    settings = {k: (list(v) if isinstance(v, list) else v) for k, v in DEFAULT_SETTINGS.items()}
    for row in AppSetting.query.all():
        if row.key not in DEFAULT_SETTINGS:
            continue
        try:
            settings[row.key] = json.loads(row.value) if row.value is not None else None
        except (TypeError, ValueError):
            settings[row.key] = row.value
    if holder is not None:
        holder._hb_settings = settings
    return dict(settings)


def _coerce_setting(key, value):
    """Validate one setting against the type of its default. Raises ValueError with a human message."""
    default = DEFAULT_SETTINGS[key]
    if isinstance(default, bool):
        return value if isinstance(value, bool) else str(value).strip().lower() in ("1", "true", "yes", "on")
    if key == "payment_methods":
        items = value if isinstance(value, list) else str(value or "").split(",")
        methods = [str(m).strip().lower() for m in items if str(m).strip()]
        if not methods or any(m not in PAYMENT_METHODS for m in methods):
            raise ValueError(f"payment_methods must be a non-empty list from: {', '.join(PAYMENT_METHODS)}")
        return list(dict.fromkeys(methods))
    if key == "premium_benefits":
        items = value if isinstance(value, list) else str(value or "").splitlines()
        benefits = [str(b).strip()[:200] for b in items if str(b).strip()]
        if len(benefits) > 12:
            raise ValueError("premium_benefits can have at most 12 lines")
        return benefits
    value = "" if value is None else str(value).strip()
    if len(value) > 1000:
        raise ValueError(f"{key} is too long")
    if value and key in URL_SETTING_KEYS and not re.match(r"^https?://\S+$", value):
        raise ValueError(f"{key} must be a full http(s) link")
    if value and key == "support_email" and not EMAIL_RE.match(value):
        raise ValueError("support_email must be a valid email address")
    if value and key == "support_phone" and not PHONE_RE.match(value):
        raise ValueError("support_phone must be a phone number")
    return value


def save_settings(updates):
    """Persist known keys only (unknown/read-only keys are ignored). Raises ValueError on bad input."""
    clean = {}
    for key, value in (updates or {}).items():
        if key in DEFAULT_SETTINGS:
            clean[key] = _coerce_setting(key, value)
    for key, value in clean.items():
        row = db.session.get(AppSetting, key)
        if not row:
            row = AppSetting(key=key)
            db.session.add(row)
        row.value = json.dumps(value)
    db.session.commit()
    holder = _request_cache()
    if holder is not None:
        holder._hb_settings = None
    return get_settings()


# -------------------- INPUT VALIDATION --------------------

def finite_float(value):
    """float(value) that rejects NaN/Infinity (they pass range checks and break JSON). Raises ValueError."""
    if isinstance(value, bool):
        raise ValueError("Not a number")
    number = float(value)
    if not math.isfinite(number):
        raise ValueError("Not a finite number")
    return number


def optional_float(value, minimum=None, maximum=None):
    """None for blank input, else a finite float within [minimum, maximum]. Raises ValueError."""
    if value is None or (isinstance(value, str) and not value.strip()):
        return None
    number = finite_float(value)
    if (minimum is not None and number < minimum) or (maximum is not None and number > maximum):
        raise ValueError("Out of range")
    return number


def arg_float(name, minimum=None, maximum=None, default=None):
    """Query-string float; anything invalid, non-finite or out of range falls back to the default."""
    try:
        value = optional_float(request.args.get(name), minimum, maximum)
    except (TypeError, ValueError):
        return default
    return default if value is None else value


def arg_int(name, default, minimum, maximum):
    value = request.args.get(name, default, type=int)
    if value is None:
        value = default
    return max(minimum, min(value, maximum))


def valid_lat_lng(lat, lng):
    return lat is not None and lng is not None and -90 <= lat <= 90 and -180 <= lng <= 180


def password_error(password):
    """Contract password policy: 8+ characters with at least one letter and one digit."""
    password = password or ""
    if len(password) < 8 or not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        return "Password must be at least 8 characters and include a letter and a number"
    if len(password) > 128:
        return "Password is too long"
    return None


def clean_text(value, max_len):
    value = (value or "").strip() if isinstance(value, str) else ("" if value is None else str(value).strip())
    return value[:max_len] if max_len else value


# -------------------- VENDORS --------------------

def active_city_ids_query():
    return db.session.query(City.id).filter(db.or_(City.is_active == True, City.is_active.is_(None)))  # noqa: E712


def public_vendor_query():
    """Vendors that may be shown publicly: live ("verified" or legacy NULL) and in an active city.

    "pending" and "rejected" vendors are hidden; admins hide a vendor by rejecting it.
    """
    return Vendor.query.filter(
        db.or_(Vendor.verified_status.is_(None), Vendor.verified_status == "verified"),
        Vendor.city_id.in_(active_city_ids_query()),
    )


def is_public_vendor(vendor):
    if not vendor or vendor.verified_status not in (None, "verified"):
        return False
    return not (vendor.city and vendor.city.is_active is False)


def recompute_vendor_rating(vendor):
    ratings = Rating.query.filter_by(vendor_id=vendor.id).all()
    values = [r.rating_value for r in ratings if r.rating_value is not None and math.isfinite(r.rating_value)]
    total = len(values)
    vendor.avg_rating = round(sum(values) / total, 1) if total else None
    vendor.total_ratings = total


def category_filter(category):
    """Match an app category (slug or name) against vendor data.

    Categories carry admin-editable keywords ("tea, chai") because vendor data uses both data keys
    (food_category "tea_chai") and free-text Google categories ("Tea store").
    """
    category = category.strip()
    terms = {category, category.lower().replace(" ", "_").replace("-", "_")}
    cat = Category.query.filter(
        db.or_(Category.slug == category.lower(), Category.name.ilike(category))
    ).first()
    if cat:
        terms.update({cat.name, cat.slug, cat.slug.replace("-", "_")})
        terms.update(cat.keyword_list)
    clauses = []
    for t in sorted(t for t in terms if t):
        like = f"%{t}%"
        clauses += [
            Vendor.food_category.ilike(like),
            Vendor.cuisine_type.ilike(like),
            Vendor.food_subcategories.ilike(like),
        ]
    return db.or_(*clauses)


def haversine_km(lat1, lng1, lat2, lng2):
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def slugify(text):
    slug = re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-")
    return slug or "item"


# -------------------- AUTH --------------------

USER_TOKEN_AUDIENCE = "hungrybird-app"
ADMIN_TOKEN_AUDIENCE = "hungrybird-admin"
USER_TOKEN_LIFETIME = timedelta(days=7)


def issue_user_token(user):
    now = datetime.utcnow()
    return jwt.encode({
        "user_id": user.id,
        "tv": user.token_version or 0,
        "aud": USER_TOKEN_AUDIENCE,
        "iat": now,
        "exp": now + USER_TOKEN_LIFETIME,
    }, current_app.config["SECRET_KEY"], algorithm="HS256")


def _bearer_token():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    return auth_header.split(" ", 1)[1].strip() or None


def decode_user_token(token):
    """Return the User for a valid, current consumer token (any status), else None."""
    try:
        data = jwt.decode(token, current_app.config["SECRET_KEY"], algorithms=["HS256"],
                          audience=USER_TOKEN_AUDIENCE)
    except jwt.PyJWTError:
        return None
    if "user_id" not in data:
        return None
    user = db.session.get(User, data["user_id"])
    if not user or data.get("tv") != (user.token_version or 0):
        return None  # deleted account, or token revoked by a password reset/change
    return user


def get_optional_user(for_write=False):
    """Return the logged-in app user if a valid Bearer token was sent, else None (guest).

    Suspended accounts browse as guests, but `for_write=True` answers them with 403 instead of
    letting them post as a guest.
    """
    token = _bearer_token()
    if not token:
        return None
    user = decode_user_token(token)
    if not user:
        return None
    if user.is_suspended:
        if for_write:
            abort_api("Your account has been suspended. Please contact support.", "ACCOUNT_SUSPENDED", 403)
        return None
    return user


def token_required(f):
    """Consumer endpoints: pass the authenticated, non-suspended User as the first argument."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = _bearer_token()
        if not token:
            return api_error("Please log in to continue.", "UNAUTHORIZED", 401)
        current_user = decode_user_token(token)
        if not current_user:
            return api_error("Your session has expired. Please log in again.", "UNAUTHORIZED", 401)
        if current_user.is_suspended:
            return api_error("Your account has been suspended. Please contact support.", "ACCOUNT_SUSPENDED", 403)
        return f(current_user, *args, **kwargs)
    return decorated


def client_ip():
    from app import client_ip as _client_ip
    return _client_ip()


def user_or_ip_key():
    """Rate-limit key: the account for logged-in users (shared Wi-Fi/NAT), else the client IP."""
    token = _bearer_token()
    user = decode_user_token(token) if token else None
    return f"user:{user.id}" if user else f"ip:{client_ip()}"


def iso(dt):
    return dt.isoformat() if dt else None
