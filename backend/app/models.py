from datetime import datetime
from app import db
from werkzeug.security import generate_password_hash, check_password_hash


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    push_token = db.Column(db.String(255), nullable=True)
    notifications_enabled = db.Column(db.Boolean, default=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        # Using a lower work factor for local dev so login is fast
        self.password_hash = generate_password_hash(password, method="pbkdf2:sha256:1000")

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class City(db.Model):
    __tablename__ = "cities"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    slug = db.Column(db.String(100), unique=True, nullable=False)
    state = db.Column(db.String(100))
    country = db.Column(db.String(100), default="India")
    lat = db.Column(db.Float)
    lng = db.Column(db.Float)

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

    lat = db.Column(db.Float, nullable=False)
    lng = db.Column(db.Float, nullable=False)

    source = db.Column(db.String(50), default="user")
    verified_status = db.Column(db.String(20), default="verified")  # "pending", "verified", "rejected"

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    place_id = db.Column(db.String(200))
    photo_reference = db.Column(db.String(500))
    image_url = db.Column(db.String(500))


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
    status = db.Column(db.String(20), default="approved") # pending, approved, rejected
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
