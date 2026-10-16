import json
from datetime import datetime
from app import db
from werkzeug.security import generate_password_hash, check_password_hash

# Old consumer hashes used a 1000-iteration PBKDF2; they are upgraded on the next successful login.
LEGACY_HASH_PREFIX = "pbkdf2:sha256:1000$"


def utc_iso(dt):
    """ISO-8601 UTC with a trailing Z (all stored datetimes are naive UTC)."""
    return dt.replace(microsecond=0).isoformat() + "Z" if dt else None


def _blank_to_none(value):
    if isinstance(value, str) and not value.strip():
        return None
    return value


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    push_token = db.Column(db.String(255), nullable=True)
    notifications_enabled = db.Column(db.Boolean, default=True)
    password_hash = db.Column(db.String(255), nullable=False)
    status = db.Column(db.String(20), default="active")  # "active", "suspended"
    last_login_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    email_verified = db.Column(db.Boolean, default=False, nullable=False, server_default=db.false())
    # Bumped on password reset/change: every token carrying an older value stops working.
    token_version = db.Column(db.Integer, default=0, nullable=False, server_default="0")
    premium_until = db.Column(db.DateTime, nullable=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    @property
    def needs_rehash(self):
        return (self.password_hash or "").startswith(LEGACY_HASH_PREFIX)

    @property
    def is_suspended(self):
        return (self.status or "active") == "suspended"

    @property
    def is_premium(self):
        return bool(self.premium_until and self.premium_until > datetime.utcnow())

    def to_public_dict(self):
        """The user object returned by login, register, /api/auth/me and profile updates."""
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "notifications_enabled": self.notifications_enabled,
            "email_verified": bool(self.email_verified),
            "is_premium": self.is_premium,
            "premium_until": utc_iso(self.premium_until),
        }


class City(db.Model):
    __tablename__ = "cities"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    slug = db.Column(db.String(100), unique=True, nullable=False)
    state = db.Column(db.String(100))
    country = db.Column(db.String(100), default="India")
    lat = db.Column(db.Float)
    lng = db.Column(db.Float)
    description = db.Column(db.Text, nullable=True)
    image_url = db.Column(db.String(500), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False, server_default=db.true())
    sort_order = db.Column(db.Integer, default=0, nullable=False, server_default="0")

    vendors = db.relationship("Vendor", backref="city", lazy=True)


class Vendor(db.Model):
    __tablename__ = "vendors"

    id = db.Column(db.Integer, primary_key=True)
    city_id = db.Column(db.Integer, db.ForeignKey("cities.id"), nullable=False)

    name = db.Column(db.String(200), nullable=False)
    cuisine_type = db.Column(db.String(200))
    is_hidden_gem = db.Column(db.Boolean, default=True)
    is_famous = db.Column(db.Boolean, default=False)

    avg_rating = db.Column(db.Float)  # your rating later
    total_ratings = db.Column(db.Integer, default=0)
    price_level = db.Column(db.String(20))  # "₹", "₹₹", etc.

    address_text = db.Column(db.String(300))
    area = db.Column(db.String(150))

    description = db.Column(db.Text)  # vendor backstory / "why it's a hidden gem"
    specialty_dish = db.Column(db.String(150))  # e.g. "Butter Pav Bhaji"
    opening_hours = db.Column(db.String(150))  # free-text, e.g. "6 PM - 1 AM"

    lat = db.Column(db.Float, nullable=True)
    lng = db.Column(db.Float, nullable=True)

    source = db.Column(db.String(50), default="user")
    verified_status = db.Column(db.String(20), default="verified")  # "pending", "verified", "rejected"

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    place_id = db.Column(db.String(200))
    photo_reference = db.Column(db.String(500))
    image_url = db.Column(db.String(500))

    # Hungry Bird Data Schema Extensions
    vendor_code = db.Column(db.String(50), unique=True, nullable=True) # HB-DOC-0001, HB-OSM-*
    vendor_type = db.Column(db.String(80), nullable=True)
    locality = db.Column(db.String(100), nullable=True)
    market = db.Column(db.String(100), nullable=True)
    street = db.Column(db.String(150), nullable=True)
    landmark = db.Column(db.String(150), nullable=True)
    food_category = db.Column(db.String(80), nullable=True)
    food_subcategories = db.Column(db.String(300), nullable=True)
    price_min = db.Column(db.Float, nullable=True)
    price_max = db.Column(db.Float, nullable=True)
    price_currency = db.Column(db.String(10), default="INR")
    opening_time = db.Column(db.String(20), nullable=True)
    closing_time = db.Column(db.String(20), nullable=True)
    closed_days = db.Column(db.String(60), nullable=True)
    phone = db.Column(db.String(50), nullable=True)
    website = db.Column(db.String(300), nullable=True)
    instagram = db.Column(db.String(150), nullable=True)
    source_url = db.Column(db.String(500), nullable=True)
    source_type = db.Column(db.String(50), nullable=True)
    source_name = db.Column(db.String(200), nullable=True)
    verification_status = db.Column(db.String(30), default="VERIFIED")
    verification_level = db.Column(db.String(60), default="LEVEL_0_UNVERIFIED")
    last_verified_at = db.Column(db.String(30), nullable=True)
    verified_location = db.Column(db.Boolean, default=False)
    verified_business = db.Column(db.Boolean, default=False)
    verified_food_type = db.Column(db.Boolean, default=False)
    hidden_gem_candidate = db.Column(db.Boolean, default=False)
    hidden_gem_score = db.Column(db.Float, nullable=True)
    hidden_gem_score_status = db.Column(db.String(50), nullable=True)
    data_confidence = db.Column(db.String(20), default="MEDIUM")
    notes = db.Column(db.Text, nullable=True)

    # Premium content (locked for free users while premium is switched on) and the
    # "checked by the HungryBird team" badge. Both are set by staff only.
    is_premium = db.Column(db.Boolean, default=False, nullable=False, server_default=db.false())
    team_verified = db.Column(db.Boolean, default=False, nullable=False, server_default=db.false())

    @property
    def public_hidden_gem(self):
        return bool(self.is_hidden_gem or self.hidden_gem_candidate)

    def _public_fields(self):
        """Full public field set with real values only (null when unknown).

        Never call this from a route: app.serializers.serialize_vendor() decides whether the
        viewer gets these fields or the locked premium preview.
        """
        rated = bool(self.total_ratings)
        opening_hours = _blank_to_none(self.opening_hours)
        if not opening_hours and _blank_to_none(self.opening_time) and _blank_to_none(self.closing_time):
            opening_hours = f"{self.opening_time} - {self.closing_time}"
        address = _blank_to_none(self.address_text) or _blank_to_none(self.street)
        return {
            "id": self.id,
            "locked": False,
            "vendor_code": self.vendor_code,
            "name": self.name,
            "vendor_type": _blank_to_none(self.vendor_type),
            "city_id": self.city_id,
            "city_name": self.city.name if self.city else None,
            "city_slug": self.city.slug if self.city else None,
            "cuisine_type": _blank_to_none(self.cuisine_type) or _blank_to_none(self.food_category),
            "food_category": _blank_to_none(self.food_category) or _blank_to_none(self.cuisine_type),
            "food_subcategories": [s.strip() for s in self.food_subcategories.split(";") if s.strip()] if self.food_subcategories else [],
            "specialty_dish": _blank_to_none(self.specialty_dish),
            "is_hidden_gem": self.public_hidden_gem,
            "is_famous": bool(self.is_famous),
            "is_premium": bool(self.is_premium),
            "is_verified": bool(self.team_verified),
            # Real community ratings only: null until someone rates the vendor.
            "avg_rating": self.avg_rating if rated else None,
            "rating": self.avg_rating if rated else None,
            "total_ratings": self.total_ratings or 0,
            "price_level": _blank_to_none(self.price_level),
            "price_min": self.price_min,
            "price_max": self.price_max,
            "address_text": address,
            "address": address,
            "area": _blank_to_none(self.area),
            "locality": _blank_to_none(self.locality),
            "landmark": _blank_to_none(self.landmark),
            "market": _blank_to_none(self.market),
            "description": _blank_to_none(self.description),
            "opening_hours": opening_hours,
            "closed_days": _blank_to_none(self.closed_days),
            "lat": self.lat,
            "lng": self.lng,
            "verified_status": self.verified_status,
            "image_url": _blank_to_none(self.image_url),
            "website": _blank_to_none(self.website),
            "phone": _blank_to_none(self.phone),
            "instagram": _blank_to_none(self.instagram),
        }

    def to_admin_dict(self):
        """Raw values (no display fallbacks) so the admin panel edits real data."""
        return {
            "id": self.id,
            "city_id": self.city_id,
            "city_name": self.city.name if self.city else None,
            "name": self.name,
            "cuisine_type": self.cuisine_type,
            "food_category": self.food_category,
            "specialty_dish": self.specialty_dish,
            "description": self.description,
            "opening_hours": self.opening_hours,
            "closed_days": self.closed_days,
            "is_hidden_gem": bool(self.is_hidden_gem),
            "is_famous": bool(self.is_famous),
            "avg_rating": self.avg_rating,
            "total_ratings": self.total_ratings or 0,
            "price_level": self.price_level,
            "price_min": self.price_min,
            "price_max": self.price_max,
            "address_text": self.address_text,
            "area": self.area,
            "landmark": self.landmark,
            "lat": self.lat,
            "lng": self.lng,
            "phone": self.phone,
            "website": self.website,
            "instagram": self.instagram,
            "image_url": self.image_url,
            "source": self.source,
            "verified_status": self.verified_status or "verified",
            "is_premium": bool(self.is_premium),
            "team_verified": bool(self.team_verified),
            "hidden_gem_candidate": bool(self.hidden_gem_candidate),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }



class VendorSubmission(db.Model):
    __tablename__ = "vendor_submissions"

    id = db.Column(db.Integer, primary_key=True)
    city_id = db.Column(db.Integer, db.ForeignKey("cities.id"), nullable=False)

    stall_name = db.Column(db.String(200), nullable=False)
    cuisine_type = db.Column(db.String(200))
    description = db.Column(db.Text)

    google_maps_url = db.Column(db.String(500))
    approx_address = db.Column(db.String(300))
    lat = db.Column(db.Float)
    lng = db.Column(db.Float)
    estimated_price = db.Column(db.String(100))

    submitted_by_name = db.Column(db.String(100))
    submitted_by_email = db.Column(db.String(150))

    status = db.Column(db.String(20), default="pending")  # "pending", "approved", "rejected"
    review_notes = db.Column(db.Text)
    rating = db.Column(db.Float)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    city = db.relationship("City")
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    user = db.relationship("User", backref=db.backref("submissions", lazy=True))


class Rating(db.Model):
    __tablename__ = "ratings"

    id = db.Column(db.Integer, primary_key=True)
    vendor_id = db.Column(db.Integer, db.ForeignKey("vendors.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    
    rating_value = db.Column(db.Float, nullable=False)
    user_ip = db.Column(db.String(100))  # Optional: To track if a user already rated
    review_text = db.Column(db.Text, nullable=True)
    author_name = db.Column(db.String(100), nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    vendor = db.relationship("Vendor", backref=db.backref("ratings", lazy=True, cascade="all, delete-orphan"))
    user = db.relationship("User", backref=db.backref("ratings", lazy=True))

class SiteReview(db.Model):
    __tablename__ = "site_reviews"

    id = db.Column(db.Integer, primary_key=True)
    author_name = db.Column(db.String(100), nullable=False)
    review_text = db.Column(db.Text, nullable=False)
    rating_value = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default="pending")  # pending, approved, rejected (staff approve)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Favorite(db.Model):
    __tablename__ = "favorites"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    vendor_id = db.Column(db.Integer, db.ForeignKey("vendors.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", backref=db.backref("favorites", lazy=True, cascade="all, delete-orphan"))
    vendor = db.relationship("Vendor", backref=db.backref("favorited_by", lazy=True, cascade="all, delete-orphan"))


class SavedVendor(db.Model):
    __tablename__ = "saved_vendors"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    vendor_id = db.Column(db.Integer, db.ForeignKey("vendors.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", backref=db.backref("saved_vendors", lazy=True, cascade="all, delete-orphan"))
    vendor = db.relationship("Vendor", backref=db.backref("saved_by", lazy=True, cascade="all, delete-orphan"))


class ReelSubmission(db.Model):
    __tablename__ = "reel_submissions"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    author_name = db.Column(db.String(100), nullable=False)
    video_filename = db.Column(db.String(300), nullable=False)
    status = db.Column(db.String(20), default="pending")  # "pending", "approved", "rejected"
    views = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class OTPVerification(db.Model):
    __tablename__ = "otp_verifications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    otp_code = db.Column(db.String(10), nullable=False)
    new_name = db.Column(db.String(100))
    new_email = db.Column(db.String(150))
    new_phone = db.Column(db.String(20))
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", backref=db.backref("otps", lazy=True, cascade="all, delete-orphan"))


# ==================== ADMIN / APP MANAGEMENT ====================

ADMIN_ROLES = ("super_admin", "moderator", "support", "city_manager", "app_manager")


class AdminUser(db.Model):
    """Staff account for the admin panel (separate from app users)."""
    __tablename__ = "admin_users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    username = db.Column(db.String(80), unique=True, nullable=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(30), default="moderator")
    is_active = db.Column(db.Boolean, default=True)
    last_login = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "username": self.username,
            "role": self.role,
            "is_active": bool(self.is_active),
            "last_login": self.last_login.isoformat() if self.last_login else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Category(db.Model):
    __tablename__ = "categories"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    slug = db.Column(db.String(100), unique=True, nullable=False)
    icon = db.Column(db.String(20), nullable=True)  # emoji shown in the app chips
    image_url = db.Column(db.String(500), nullable=True)
    sort_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    # Comma-separated words matched against vendor food_category / cuisine_type when filtering.
    keywords = db.Column(db.String(500), nullable=True)

    @property
    def keyword_list(self):
        return [k.strip() for k in (self.keywords or "").split(",") if k.strip()]

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
            "icon": self.icon,
            "image_url": self.image_url,
            "sort_order": self.sort_order or 0,
            "is_active": bool(self.is_active),
            "keywords": self.keyword_list,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class ContactMessage(db.Model):
    """Support inbox: messages from the website contact page and the app's help screen."""
    __tablename__ = "contact_messages"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(150), nullable=False)
    subject = db.Column(db.String(200), nullable=True)
    message = db.Column(db.Text, nullable=False)
    source = db.Column(db.String(20), default="web")  # "web", "app"
    status = db.Column(db.String(20), default="unread")  # "unread", "read", "resolved"
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "subject": self.subject,
            "message": self.message,
            "source": self.source,
            "status": self.status,
            "user_id": self.user_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


REPORT_TARGETS = ("vendor", "review", "reel")


class Report(db.Model):
    """User-flagged content (wrong vendor info, abusive review, etc.)."""
    __tablename__ = "reports"

    id = db.Column(db.Integer, primary_key=True)
    target_type = db.Column(db.String(20), nullable=False)  # "vendor", "review", "reel"
    target_id = db.Column(db.Integer, nullable=False)
    reason = db.Column(db.String(100), nullable=False)
    details = db.Column(db.Text, nullable=True)
    reporter_user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reporter_name = db.Column(db.String(100), nullable=True)
    status = db.Column(db.String(20), default="pending")  # "pending", "resolved", "dismissed"
    admin_notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    resolved_at = db.Column(db.DateTime, nullable=True)


class AppBanner(db.Model):
    """Promo banners shown in the mobile app's home carousel."""
    __tablename__ = "app_banners"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    subtitle = db.Column(db.String(250), nullable=True)
    image_url = db.Column(db.String(500), nullable=False)
    link_type = db.Column(db.String(20), default="none")  # "none", "vendor", "city", "category", "url"
    link_value = db.Column(db.String(500), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    sort_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "subtitle": self.subtitle,
            "image_url": self.image_url,
            "link_type": self.link_type or "none",
            "link_value": self.link_value,
            "is_active": bool(self.is_active),
            "sort_order": self.sort_order or 0,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class AppSetting(db.Model):
    """Key/value app configuration (values are JSON-encoded)."""
    __tablename__ = "app_settings"

    key = db.Column(db.String(80), primary_key=True)
    value = db.Column(db.Text, nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AppNotification(db.Model):
    """Broadcast announcements sent from the admin panel; the app lists these in its inbox."""
    __tablename__ = "app_notifications"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    body = db.Column(db.Text, nullable=False)
    target = db.Column(db.String(100), default="all")  # "all" or "city:<slug>"
    link_type = db.Column(db.String(20), default="none")
    link_value = db.Column(db.String(500), nullable=True)
    push_sent_count = db.Column(db.Integer, default=0)
    sent_by = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_public_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "body": self.body,
            "target": self.target or "all",
            "link_type": self.link_type or "none",
            "link_value": self.link_value,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def to_dict(self):
        return {
            **self.to_public_dict(),
            "push_sent_count": self.push_sent_count or 0,
            "sent_by": self.sent_by,
        }


# ==================== EMAIL CODES ====================

class AuthCode(db.Model):
    """One-time 6-digit email code (email verification / password reset). Only a hash is stored."""
    __tablename__ = "auth_codes"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(150), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    purpose = db.Column(db.String(30), nullable=False)  # "verify_email", "reset_password"
    code_hash = db.Column(db.String(64), nullable=False)
    attempts = db.Column(db.Integer, default=0, nullable=False, server_default="0")
    expires_at = db.Column(db.DateTime, nullable=False)
    consumed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    ip = db.Column(db.String(100), nullable=True)


# ==================== PREMIUM ====================

def format_paise(paise):
    """4900 -> "₹49", 4950 -> "₹49.50"."""
    paise = int(paise or 0)
    rupees, rest = divmod(paise, 100)
    return f"₹{rupees:,}" if not rest else f"₹{rupees:,}.{rest:02d}"


class SubscriptionPlan(db.Model):
    """A fixed-duration Premium pass (one-time purchase, no auto-renew)."""
    __tablename__ = "subscription_plans"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(500), nullable=True)
    price_paise = db.Column(db.Integer, nullable=False)
    duration_days = db.Column(db.Integer, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False, server_default=db.true())
    sort_order = db.Column(db.Integer, default=0, nullable=False, server_default="0")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_public_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "price_paise": self.price_paise,
            "price_display": format_paise(self.price_paise),
            "duration_days": self.duration_days,
        }

    def to_admin_dict(self):
        return {
            **self.to_public_dict(),
            "is_active": bool(self.is_active),
            "sort_order": self.sort_order or 0,
            "created_at": utc_iso(self.created_at),
            "updated_at": utc_iso(self.updated_at),
        }


class Payment(db.Model):
    """A Razorpay order for a plan. Becomes "paid" once (verify call or webhook, whichever is first)."""
    __tablename__ = "payments"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    plan_id = db.Column(db.Integer, db.ForeignKey("subscription_plans.id", ondelete="SET NULL"), nullable=True)
    email = db.Column(db.String(150), nullable=True)  # snapshot, kept for accounting if the user is deleted
    plan_name = db.Column(db.String(100), nullable=True)
    days = db.Column(db.Integer, nullable=False)
    amount_paise = db.Column(db.Integer, nullable=False)
    currency = db.Column(db.String(10), default="INR", nullable=False, server_default="INR")
    status = db.Column(db.String(20), default="created", nullable=False, server_default="created")  # created, paid, failed, amount_mismatch
    method = db.Column(db.String(30), nullable=True)
    provider = db.Column(db.String(20), default="razorpay", nullable=False, server_default="razorpay")
    provider_order_id = db.Column(db.String(64), unique=True, nullable=False)
    provider_payment_id = db.Column(db.String(64), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    paid_at = db.Column(db.DateTime, nullable=True)

    user = db.relationship("User")
    plan = db.relationship("SubscriptionPlan")


SUBSCRIPTION_EVENT_KINDS = ("purchase", "grant", "extend", "revoke")


class SubscriptionEvent(db.Model):
    """Audit log of every change to a user's premium_until (purchases and staff actions)."""
    __tablename__ = "subscription_events"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    kind = db.Column(db.String(20), nullable=False)
    days = db.Column(db.Integer, nullable=True)
    previous_until = db.Column(db.DateTime, nullable=True)
    ends_at = db.Column(db.DateTime, nullable=True)
    payment_id = db.Column(db.Integer, db.ForeignKey("payments.id", ondelete="SET NULL"), nullable=True)
    staff_id = db.Column(db.Integer, db.ForeignKey("admin_users.id", ondelete="SET NULL"), nullable=True)
    staff_name = db.Column(db.String(100), nullable=True)
    note = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    payment = db.relationship("Payment")

    def to_dict(self, staff=False):
        data = {
            "id": self.id,
            "kind": self.kind,
            "days": self.days,
            "ends_at": utc_iso(self.ends_at),
            "created_at": utc_iso(self.created_at),
        }
        if self.payment is not None:
            data["amount_paise"] = self.payment.amount_paise
        if staff:
            data.update({
                "user_id": self.user_id,
                "previous_until": utc_iso(self.previous_until),
                "payment_id": self.payment_id,
                "staff_id": self.staff_id,
                "staff_name": self.staff_name,
                "note": self.note,
            })
        return data


# ==================== FOOD TRAILS ====================

class Trail(db.Model):
    """Admin-managed food trail: an ordered list of stops in one city."""
    __tablename__ = "trails"

    id = db.Column(db.Integer, primary_key=True)
    city_id = db.Column(db.Integer, db.ForeignKey("cities.id"), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    image_url = db.Column(db.String(500), nullable=True)
    duration_text = db.Column(db.String(100), nullable=True)
    price_text = db.Column(db.String(100), nullable=True)
    stops_json = db.Column("stops", db.Text, nullable=True)  # JSON list of {"name", "vendor_id", "note"}
    is_premium = db.Column(db.Boolean, default=True, nullable=False, server_default=db.true())
    is_active = db.Column(db.Boolean, default=True, nullable=False, server_default=db.true())
    sort_order = db.Column(db.Integer, default=0, nullable=False, server_default="0")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    city = db.relationship("City", backref=db.backref("trails", lazy=True))

    @property
    def stops(self):
        try:
            value = json.loads(self.stops_json or "[]")
        except (TypeError, ValueError):
            return []
        return value if isinstance(value, list) else []

    @stops.setter
    def stops(self, value):
        self.stops_json = json.dumps(value or [])

    def to_admin_dict(self):
        return {
            "id": self.id,
            "city_id": self.city_id,
            "city_name": self.city.name if self.city else None,
            "title": self.title,
            "description": self.description,
            "image_url": self.image_url,
            "duration_text": self.duration_text,
            "price_text": self.price_text,
            "stops": self.stops,
            "stop_count": len(self.stops),
            "is_premium": bool(self.is_premium),
            "is_active": bool(self.is_active),
            "sort_order": self.sort_order or 0,
            "created_at": utc_iso(self.created_at),
            "updated_at": utc_iso(self.updated_at),
        }
