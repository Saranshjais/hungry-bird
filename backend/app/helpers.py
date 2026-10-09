"""Shared helpers used by the public, auth and admin blueprints."""
import json
import math
import re

import jwt
from flask import current_app, request

from app import db
from app.models import AppSetting, Rating, User, Vendor


# -------------------- APP SETTINGS --------------------

# Every key the admin panel can edit. "public" keys are also served to the mobile app.
DEFAULT_SETTINGS = {
    "maintenance_mode": False,
    "maintenance_message": "HungryBird is currently down for scheduled maintenance. We will be back shortly!",
    "min_app_version": "1.0.0",
    "latest_app_version": "1.0.0",
    "force_update_message": "A new version of HungryBird is available. Please update to continue.",
    "announcement": "",
    "support_email": "support@hungrybird.in",
    "play_store_url": "",
    "app_store_url": "",
    "website_url": "https://hungry-bird-gamma.vercel.app",
    "allow_guest_reviews": True,
    "default_city": "jaipur",
}

PUBLIC_SETTING_KEYS = tuple(DEFAULT_SETTINGS.keys())


def get_settings():
    settings = dict(DEFAULT_SETTINGS)
    for row in AppSetting.query.all():
        if row.key not in DEFAULT_SETTINGS:
            continue
        try:
            settings[row.key] = json.loads(row.value) if row.value is not None else None
        except (TypeError, ValueError):
            settings[row.key] = row.value
    return settings


def save_settings(updates):
    """Persist known keys only, coercing to the type of the default value."""
    for key, value in (updates or {}).items():
        if key not in DEFAULT_SETTINGS:
            continue
        default = DEFAULT_SETTINGS[key]
        if isinstance(default, bool):
            value = value if isinstance(value, bool) else str(value).lower() in ("1", "true", "yes", "on")
        elif isinstance(default, str):
            value = "" if value is None else str(value).strip()
        row = db.session.get(AppSetting, key)
        if not row:
            row = AppSetting(key=key)
            db.session.add(row)
        row.value = json.dumps(value)
    db.session.commit()
    return get_settings()


# -------------------- VENDORS --------------------

def public_vendor_query():
    """Vendors that may be shown publicly (admins can hide a vendor by rejecting it)."""
    return Vendor.query.filter(
        db.or_(Vendor.verified_status.is_(None), Vendor.verified_status != "rejected")
    )


def recompute_vendor_rating(vendor):
    ratings = Rating.query.filter_by(vendor_id=vendor.id).all()
    total = len(ratings)
    vendor.avg_rating = round(sum(r.rating_value for r in ratings) / total, 1) if total else None
    vendor.total_ratings = total


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

def get_optional_user():
    """Return the logged-in app user if a valid Bearer token was sent, else None."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    try:
        data = jwt.decode(
            auth_header.split(" ", 1)[1],
            current_app.config.get("SECRET_KEY", "hungrybird-secret"),
            algorithms=["HS256"],
        )
    except Exception:
        return None
    if "user_id" not in data:
        return None
    user = db.session.get(User, data["user_id"])
    if not user or user.is_suspended:
        return None
    return user


def iso(dt):
    return dt.isoformat() if dt else None
