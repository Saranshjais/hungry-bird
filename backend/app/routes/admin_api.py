import csv
import datetime
import io
import os
from collections import defaultdict
from functools import wraps

import jwt
import pandas as pd
from flask import Blueprint, Response, current_app, g, jsonify, request

from app import db
from app.helpers import get_settings, recompute_vendor_rating, save_settings, slugify, iso
from app.models import (
    ADMIN_ROLES, AdminUser, AppBanner, AppNotification, Category, City, ContactMessage,
    Rating, ReelSubmission, Report, SiteReview, User, Vendor, VendorSubmission,
)
from app.utils import send_push_batch

admin_api_bp = Blueprint("admin_api", __name__, url_prefix="/api/admin")

# Which areas each staff role may change. Every active staff member can read.
ROLE_PERMISSIONS = {
    "super_admin": {"*"},
    "moderator": {"submissions", "vendors", "reviews", "reports", "reels", "categories", "users", "inbox"},
    "support": {"inbox", "reports"},
    "city_manager": {"cities", "vendors", "submissions"},
    "app_manager": {"app", "categories"},
}

VENDOR_STATUSES = ("pending", "verified", "rejected")


def _now():
    return datetime.datetime.utcnow()


def _can(role, area):
    perms = ROLE_PERMISSIONS.get(role, set())
    return "*" in perms or area in perms


def admin_required(area=None, write=None, super_only=False):
    """Authenticate a staff token. `area` gates non-GET requests (or all requests if write=False)."""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            auth_header = request.headers.get("Authorization", "")
            token = auth_header.split(" ", 1)[1] if auth_header.startswith("Bearer ") else None
            if not token:
                return jsonify({"error": "Token is missing"}), 401
            try:
                data = jwt.decode(token, current_app.config["SECRET_KEY"], algorithms=["HS256"])
            except jwt.ExpiredSignatureError:
                return jsonify({"error": "Session expired, please log in again"}), 401
            except Exception:
                return jsonify({"error": "Invalid token"}), 401

            if data.get("role") != "admin" or not data.get("admin_id"):
                return jsonify({"error": "Invalid token, please log in again"}), 401
            admin = db.session.get(AdminUser, data["admin_id"])
            if not admin or not admin.is_active:
                return jsonify({"error": "Your admin access has been revoked"}), 401

            is_write = request.method != "GET" if write is None else write
            if super_only and admin.role != "super_admin":
                return jsonify({"error": "Only a Super Admin can do this"}), 403
            if area and is_write and not _can(admin.role, area):
                return jsonify({"error": "Your role does not allow this action"}), 403

            g.admin = admin
            return f(*args, **kwargs)
        return decorated
    return decorator


def _json():
    return request.get_json(silent=True) or {}


def _paginate(query, default_per_page=25):
    page = max(request.args.get("page", 1, type=int), 1)
    per_page = min(max(request.args.get("per_page", default_per_page, type=int), 1), 200)
    total = query.order_by(None).count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    pages = max((total + per_page - 1) // per_page, 1)
    return items, {"total": total, "page": page, "per_page": per_page, "pages": pages}


def _to_float(value):
    if value in (None, ""):
        return None
    return float(value)


def _to_bool(value):
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in ("1", "true", "yes", "y", "on")


def _clean_str(value, max_len=None):
    if value is None:
        return None
    value = str(value).strip()
    if not value:
        return None
    return value[:max_len] if max_len else value


# ==================== AUTH ====================

def _ensure_bootstrap_admin():
    """Create the first super admin so a fresh database is never locked out.

    Credentials come from ADMIN_USERNAME / ADMIN_EMAIL / ADMIN_PASSWORD; without them the
    legacy panel credentials are used. Change the password from the panel after first login.
    """
    if AdminUser.query.count() > 0:
        return
    username = os.getenv("ADMIN_USERNAME", "saransh")
    password = current_app.config.get("ADMIN_PASSWORD") or "Sara@123"
    admin = AdminUser(
        name=os.getenv("ADMIN_NAME", "Super Admin"),
        email=os.getenv("ADMIN_EMAIL", "admin@hungrybird.in").lower(),
        username=username,
        role="super_admin",
        is_active=True,
    )
    admin.set_password(password)
    db.session.add(admin)
    db.session.commit()


@admin_api_bp.route("/login", methods=["POST"])
def login():
    data = _json()
    identifier = (data.get("username") or data.get("email") or "").strip()
    password = data.get("password") or ""

    _ensure_bootstrap_admin()

    admin = None
    if identifier:
        admin = AdminUser.query.filter(
            db.or_(AdminUser.username == identifier, AdminUser.email == identifier.lower())
        ).first()

    if not admin or not admin.check_password(password):
        return jsonify({"error": "Invalid username or password"}), 401
    if not admin.is_active:
        return jsonify({"error": "This admin account is disabled"}), 403

    admin.last_login = _now()
    db.session.commit()

    token = jwt.encode({
        "role": "admin",
        "admin_id": admin.id,
        "staff_role": admin.role,
        "exp": _now() + datetime.timedelta(hours=24),
    }, current_app.config["SECRET_KEY"], algorithm="HS256")

    return jsonify({"token": token, "admin": admin.to_dict()}), 200


@admin_api_bp.route("/me", methods=["GET"])
@admin_required()
def me():
    perms = sorted(ROLE_PERMISSIONS.get(g.admin.role, set()))
    return jsonify({"admin": g.admin.to_dict(), "permissions": perms})


@admin_api_bp.route("/me/password", methods=["PUT"])
@admin_required()
def change_my_password():
    data = _json()
    if not g.admin.check_password(data.get("current_password") or ""):
        return jsonify({"error": "Current password is incorrect"}), 400
    new_password = data.get("new_password") or ""
    if len(new_password) < 8:
        return jsonify({"error": "New password must be at least 8 characters"}), 400
    g.admin.set_password(new_password)
    db.session.commit()
    return jsonify({"message": "Password updated"})


# ==================== DASHBOARD ====================

@admin_api_bp.route("/stats", methods=["GET"])
@admin_required()
def stats():
    days = min(max(request.args.get("days", 7, type=int), 1), 90)
    today = _now().date()
    start_date = today - datetime.timedelta(days=days - 1)
    start = datetime.datetime.combine(start_date, datetime.time.min)

    totals = {
        "vendors": Vendor.query.count(),
        "hidden_gems": Vendor.query.filter(
            db.or_(Vendor.is_hidden_gem == True, Vendor.hidden_gem_candidate == True)  # noqa: E712
        ).count(),
        "cities": City.query.count(),
        "categories": Category.query.count(),
        "users": User.query.count(),
        "suspended_users": User.query.filter(User.status == "suspended").count(),
        "reviews": Rating.query.count(),
        "pending_submissions": VendorSubmission.query.filter_by(status="pending").count(),
        "pending_reports": Report.query.filter_by(status="pending").count(),
        "unread_messages": ContactMessage.query.filter_by(status="unread").count(),
        "pending_reels": ReelSubmission.query.filter_by(status="pending").count(),
    }

    def bucket(column):
        counts = defaultdict(int)
        for (created,) in db.session.query(column).filter(column >= start).all():
            if created:
                counts[created.date()] += 1
        return counts

    series_sources = {
        "users": bucket(User.created_at),
        "submissions": bucket(VendorSubmission.created_at),
        "reviews": bucket(Rating.created_at),
        "vendors": bucket(Vendor.created_at),
    }
    series = []
    for i in range(days):
        day = start_date + datetime.timedelta(days=i)
        row = {"date": day.isoformat(), "label": day.strftime("%a" if days <= 7 else "%d %b")}
        for key, counts in series_sources.items():
            row[key] = counts.get(day, 0)
        series.append(row)

    activity = []
    for u in User.query.order_by(User.created_at.desc()).limit(5).all():
        activity.append({"type": "user", "title": "New user registered",
                         "detail": f"{u.name} joined the platform", "created_at": iso(u.created_at),
                         "link": "/admin/users"})
    for s in VendorSubmission.query.order_by(VendorSubmission.created_at.desc()).limit(5).all():
        activity.append({"type": "submission", "title": "New vendor submission",
                         "detail": f"{s.stall_name} ({s.city.name if s.city else 'Unknown city'}) - {s.status}",
                         "created_at": iso(s.created_at), "link": "/admin/submissions"})
    for r in Rating.query.order_by(Rating.created_at.desc()).limit(5).all():
        activity.append({"type": "review", "title": f"New {r.rating_value:g}★ review",
                         "detail": f"{r.author_name or 'Anonymous'} on {r.vendor.name if r.vendor else 'a vendor'}",
                         "created_at": iso(r.created_at), "link": "/admin/ratings"})
    for rep in Report.query.order_by(Report.created_at.desc()).limit(5).all():
        activity.append({"type": "report", "title": "Content reported",
                         "detail": f"{rep.target_type.title()} #{rep.target_id}: {rep.reason}",
                         "created_at": iso(rep.created_at), "link": "/admin/reports"})
    for m in ContactMessage.query.order_by(ContactMessage.created_at.desc()).limit(5).all():
        activity.append({"type": "message", "title": "New support message",
                         "detail": f"{m.name}: {m.subject or m.message[:60]}",
                         "created_at": iso(m.created_at), "link": "/admin/inbox"})
    activity.sort(key=lambda a: a["created_at"] or "", reverse=True)

    city_rows = (
        db.session.query(City.name, db.func.count(Vendor.id))
        .outerjoin(Vendor, Vendor.city_id == City.id)
        .group_by(City.id, City.name)
        .order_by(db.func.count(Vendor.id).desc())
        .all()
    )
    top_vendors = (
        Vendor.query.filter(Vendor.total_ratings > 0)
        .order_by(Vendor.total_ratings.desc(), Vendor.avg_rating.desc().nullslast())
        .limit(5)
        .all()
    )

    return jsonify({
        "totals": totals,
        "series": series,
        "recent_activity": activity[:12],
        "vendors_by_city": [{"city": name, "vendors": count} for name, count in city_rows],
        "top_vendors": [
            {"id": v.id, "name": v.name, "city_name": v.city.name if v.city else None,
             "avg_rating": v.avg_rating, "total_ratings": v.total_ratings}
            for v in top_vendors
        ],
    })


@admin_api_bp.route("/counts", methods=["GET"])
@admin_required()
def badge_counts():
    """Cheap pending-work counters for the sidebar badges."""
    return jsonify({"totals": {
        "pending_submissions": VendorSubmission.query.filter_by(status="pending").count(),
        "pending_reports": Report.query.filter_by(status="pending").count(),
        "unread_messages": ContactMessage.query.filter_by(status="unread").count(),
        "pending_reels": ReelSubmission.query.filter_by(status="pending").count(),
    }})


# ==================== SUBMISSIONS ====================

def _submission_dict(sub):
    return {
        "id": sub.id,
        "city_id": sub.city_id,
        "city_name": sub.city.name if sub.city else None,
        "stall_name": sub.stall_name,
        "cuisine_type": sub.cuisine_type,
        "description": sub.description,
        "google_maps_url": sub.google_maps_url,
        "approx_address": sub.approx_address,
        "lat": sub.lat,
        "lng": sub.lng,
        "estimated_price": sub.estimated_price,
        "rating": sub.rating,
        "submitted_by_name": sub.submitted_by_name,
        "submitted_by_email": sub.submitted_by_email,
        "user_id": sub.user_id,
        "status": sub.status,
        "review_notes": sub.review_notes,
        "created_at": iso(sub.created_at),
        "updated_at": iso(sub.updated_at),
    }


@admin_api_bp.route("/submissions", methods=["GET"])
@admin_required("submissions")
def get_submissions():
    status = request.args.get("status", "pending")
    query = VendorSubmission.query
    if status and status != "all":
        query = query.filter_by(status=status)
    submissions = query.order_by(VendorSubmission.created_at.desc()).all()
    counts = dict(
        db.session.query(VendorSubmission.status, db.func.count(VendorSubmission.id))
        .group_by(VendorSubmission.status).all()
    )
    return jsonify({"submissions": [_submission_dict(s) for s in submissions], "counts": counts}), 200


@admin_api_bp.route("/submissions/<int:submission_id>/approve", methods=["POST"])
@admin_required("submissions")
def approve_submission(submission_id):
    sub = db.get_or_404(VendorSubmission, submission_id)
    overrides = _json()

    if sub.status == "approved":
        return jsonify({"error": "This submission was already approved."}), 400

    try:
        lat = _to_float(overrides.get("lat", sub.lat))
        lng = _to_float(overrides.get("lng", sub.lng))
    except (TypeError, ValueError):
        return jsonify({"error": "Latitude/longitude must be numbers."}), 400
    if lat is None or lng is None:
        return jsonify({"error": "Cannot approve: Missing location (lat/lng). Add coordinates first."}), 400

    name = _clean_str(overrides.get("stall_name"), 200) or sub.stall_name
    existing = Vendor.query.filter_by(name=name, city_id=sub.city_id).first()
    if existing:
        return jsonify({"error": "Vendor already exists in this city."}), 400

    vendor = Vendor(
        city_id=sub.city_id,
        name=name,
        cuisine_type=_clean_str(overrides.get("cuisine_type"), 200) or sub.cuisine_type,
        description=_clean_str(overrides.get("description")) or sub.description,
        is_hidden_gem=_to_bool(overrides.get("is_hidden_gem", True)),
        is_famous=False,
        avg_rating=None,
        total_ratings=0,
        price_level=_clean_str(overrides.get("price_level"), 20) or (sub.estimated_price or "")[:20] or None,
        address_text=_clean_str(overrides.get("approx_address"), 300) or sub.approx_address,
        lat=lat,
        lng=lng,
        image_url=_clean_str(overrides.get("image_url"), 500),
        source="user",
        verified_status="verified",
    )
    db.session.add(vendor)
    db.session.flush()

    if sub.rating:
        db.session.add(Rating(
            vendor_id=vendor.id,
            user_id=sub.user_id,
            rating_value=sub.rating,
            author_name=sub.submitted_by_name or "Anonymous",
            review_text="Initial rating from submitter",
        ))
        db.session.flush()
        recompute_vendor_rating(vendor)

    sub.lat, sub.lng = lat, lng
    sub.status = "approved"
    sub.review_notes = _clean_str(overrides.get("notes")) or sub.review_notes
    db.session.commit()

    return jsonify({"message": f"'{vendor.name}' approved and converted to vendor.", "vendor_id": vendor.id}), 200


@admin_api_bp.route("/submissions/<int:submission_id>/reject", methods=["POST"])
@admin_required("submissions")
def reject_submission(submission_id):
    sub = db.get_or_404(VendorSubmission, submission_id)
    sub.status = "rejected"
    sub.review_notes = _clean_str(_json().get("notes")) or sub.review_notes
    db.session.commit()
    return jsonify({"message": "Submission rejected."}), 200


@admin_api_bp.route("/submissions/<int:submission_id>", methods=["DELETE"])
@admin_required("submissions")
def delete_submission(submission_id):
    sub = db.get_or_404(VendorSubmission, submission_id)
    db.session.delete(sub)
    db.session.commit()
    return jsonify({"message": "Submission deleted."}), 200


# ==================== VENDORS ====================

VENDOR_STR_FIELDS = {
    "name": 200, "cuisine_type": 200, "food_category": 80, "specialty_dish": 150,
    "description": None, "opening_hours": 150, "closed_days": 60, "price_level": 20,
    "address_text": 300, "area": 150, "landmark": 150, "phone": 50, "website": 300,
    "instagram": 150, "image_url": 500,
}
VENDOR_FLOAT_FIELDS = ("price_min", "price_max", "lat", "lng")
VENDOR_BOOL_FIELDS = ("is_hidden_gem", "is_famous")


def _apply_vendor_fields(vendor, data):
    """Validate and copy editable fields onto a vendor. Returns an error string or None."""
    for field, max_len in VENDOR_STR_FIELDS.items():
        if field in data:
            setattr(vendor, field, _clean_str(data[field], max_len))
    for field in VENDOR_FLOAT_FIELDS:
        if field in data:
            try:
                setattr(vendor, field, _to_float(data[field]))
            except (TypeError, ValueError):
                return f"{field} must be a number"
    for field in VENDOR_BOOL_FIELDS:
        if field in data:
            setattr(vendor, field, _to_bool(data[field]))
    if "verified_status" in data:
        if data["verified_status"] not in VENDOR_STATUSES:
            return "verified_status must be pending, verified or rejected"
        vendor.verified_status = data["verified_status"]
    if "city_id" in data:
        try:
            city = db.session.get(City, int(data["city_id"]))
        except (TypeError, ValueError):
            city = None
        if not city:
            return "Please choose a valid city"
        vendor.city_id = city.id

    if not vendor.name:
        return "Vendor name is required"
    if not vendor.city_id:
        return "Please choose a city"
    if vendor.lat is not None and not -90 <= vendor.lat <= 90:
        return "Latitude must be between -90 and 90"
    if vendor.lng is not None and not -180 <= vendor.lng <= 180:
        return "Longitude must be between -180 and 180"
    return None


@admin_api_bp.route("/vendors", methods=["GET"])
@admin_required("vendors")
def get_vendors():
    q = request.args.get("q", "").strip()
    city_id = request.args.get("city_id", type=int)
    status = request.args.get("status", "").strip()
    flag = request.args.get("flag", "").strip()
    sort = request.args.get("sort", "newest")

    query = Vendor.query
    if q:
        like = f"%{q}%"
        query = query.filter(db.or_(
            Vendor.name.ilike(like), Vendor.area.ilike(like), Vendor.cuisine_type.ilike(like),
            Vendor.address_text.ilike(like), Vendor.specialty_dish.ilike(like),
        ))
    if city_id:
        query = query.filter(Vendor.city_id == city_id)
    if status in VENDOR_STATUSES:
        if status == "verified":
            query = query.filter(db.or_(Vendor.verified_status == "verified", Vendor.verified_status.is_(None)))
        else:
            query = query.filter(Vendor.verified_status == status)
    if flag == "hidden_gem":
        query = query.filter(Vendor.is_hidden_gem == True)  # noqa: E712
    elif flag == "famous":
        query = query.filter(Vendor.is_famous == True)  # noqa: E712
    elif flag == "missing_location":
        query = query.filter(db.or_(Vendor.lat.is_(None), Vendor.lng.is_(None)))
    elif flag == "missing_details":
        query = query.filter(db.or_(Vendor.description.is_(None), Vendor.description == ""))

    order = {
        "name": [Vendor.name.asc()],
        "rating": [Vendor.avg_rating.desc().nullslast()],
        "oldest": [Vendor.id.asc()],
    }.get(sort, [Vendor.id.desc()])

    vendors, meta = _paginate(query.order_by(*order))
    return jsonify({"vendors": [v.to_admin_dict() for v in vendors], **meta}), 200


@admin_api_bp.route("/vendors/<int:vendor_id>", methods=["GET"])
@admin_required("vendors")
def get_vendor(vendor_id):
    vendor = db.get_or_404(Vendor, vendor_id)
    return jsonify({"vendor": vendor.to_admin_dict()})


@admin_api_bp.route("/vendors", methods=["POST"])
@admin_required("vendors")
def create_vendor():
    data = _json()
    vendor = Vendor(source="admin", verified_status="verified", is_hidden_gem=False, is_famous=False, total_ratings=0)
    error = _apply_vendor_fields(vendor, data)
    if error:
        return jsonify({"error": error}), 400
    if Vendor.query.filter_by(name=vendor.name, city_id=vendor.city_id).first():
        return jsonify({"error": "A vendor with this name already exists in this city"}), 400
    db.session.add(vendor)
    db.session.commit()
    return jsonify({"message": "Vendor created.", "vendor": vendor.to_admin_dict()}), 201


@admin_api_bp.route("/vendors/<int:vendor_id>", methods=["PUT"])
@admin_required("vendors")
def update_vendor(vendor_id):
    vendor = db.get_or_404(Vendor, vendor_id)
    error = _apply_vendor_fields(vendor, _json())
    if error:
        db.session.rollback()
        return jsonify({"error": error}), 400
    db.session.commit()
    return jsonify({"message": "Vendor updated successfully.", "vendor": vendor.to_admin_dict()}), 200


@admin_api_bp.route("/vendors/<int:vendor_id>", methods=["DELETE"])
@admin_required("vendors")
def delete_vendor(vendor_id):
    vendor = db.get_or_404(Vendor, vendor_id)
    db.session.delete(vendor)
    db.session.commit()
    return jsonify({"message": "Vendor deleted."}), 200


BULK_COLUMN_ALIASES = {
    "name": "stall_name", "vendor_name": "stall_name",
    "city": "city_name",
    "address": "address_text", "approx_address": "address_text",
    "latitude": "lat", "longitude": "lng", "lon": "lng",
    "category": "food_category", "signature_dish": "specialty_dish",
}


@admin_api_bp.route("/vendors/bulk-upload", methods=["POST"])
@admin_required("vendors")
def bulk_upload_vendors():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    try:
        if file.filename.lower().endswith(".csv"):
            df = pd.read_csv(file)
        elif file.filename.lower().endswith(".xlsx"):
            df = pd.read_excel(file, engine="openpyxl")
        else:
            return jsonify({"error": "Unsupported file format. Please upload .csv or .xlsx"}), 400
    except Exception as e:
        return jsonify({"error": f"Could not read file: {e}"}), 400

    df.columns = [str(c).strip().lower().replace(" ", "_") for c in df.columns]
    df = df.rename(columns={k: v for k, v in BULK_COLUMN_ALIASES.items() if k in df.columns and v not in df.columns})

    missing = [c for c in ("stall_name", "city_name") if c not in df.columns]
    if missing:
        return jsonify({"error": f"Missing required columns: {', '.join(missing)}"}), 400

    def cell(row, col):
        if col not in df.columns:
            return None
        value = row.get(col)
        return None if pd.isna(value) else value

    imported, skipped, errors = 0, 0, []
    try:
        for index, row in df.iterrows():
            line = index + 2  # header is line 1
            stall_name = _clean_str(cell(row, "stall_name"), 200)
            city_name = _clean_str(cell(row, "city_name"), 100)
            if not stall_name or not city_name:
                skipped += 1
                errors.append(f"Row {line}: missing stall_name or city_name")
                continue

            city_slug = slugify(city_name)
            city = City.query.filter_by(slug=city_slug).first()
            if not city:
                city = City(name=city_name.title(), slug=city_slug, country="India")
                db.session.add(city)
                db.session.flush()

            if Vendor.query.filter_by(name=stall_name, city_id=city.id).first():
                skipped += 1
                errors.append(f"Row {line}: '{stall_name}' already exists in {city.name}")
                continue

            vendor = Vendor(city_id=city.id, name=stall_name, source="admin_bulk", verified_status="verified",
                            is_hidden_gem=True, is_famous=False, total_ratings=0)
            fields = {k: cell(row, k) for k in list(VENDOR_STR_FIELDS) + list(VENDOR_FLOAT_FIELDS) + list(VENDOR_BOOL_FIELDS)
                      if k != "name" and cell(row, k) is not None}
            error = _apply_vendor_fields(vendor, fields)
            if error:
                skipped += 1
                errors.append(f"Row {line}: {error}")
                continue
            db.session.add(vendor)
            imported += 1
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        current_app.logger.exception("Bulk upload failed")
        return jsonify({"error": str(e)}), 500

    return jsonify({
        "message": f"Successfully imported {imported} vendors" + (f", skipped {skipped}." if skipped else "!"),
        "imported": imported,
        "skipped": skipped,
        "errors": errors[:50],
    }), 200


@admin_api_bp.route("/vendors/export", methods=["GET"])
@admin_required("vendors")
def export_vendors():
    columns = ["id", "name", "city_name", "cuisine_type", "food_category", "specialty_dish", "description",
               "opening_hours", "price_level", "address_text", "area", "landmark", "lat", "lng", "phone",
               "website", "instagram", "image_url", "is_hidden_gem", "is_famous", "avg_rating",
               "total_ratings", "verified_status", "created_at"]
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=columns, extrasaction="ignore")
    writer.writeheader()
    for v in Vendor.query.order_by(Vendor.id.asc()).all():
        writer.writerow(v.to_admin_dict())
    return Response(
        "﻿" + buf.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=hungrybird-vendors.csv"},
    )


# ==================== CITIES ====================

@admin_api_bp.route("/cities", methods=["GET"])
@admin_required("cities")
def get_cities():
    counts = dict(db.session.query(Vendor.city_id, db.func.count(Vendor.id)).group_by(Vendor.city_id).all())
    cities = City.query.order_by(City.name.asc()).all()
    data = [{
        "id": c.id, "name": c.name, "slug": c.slug, "state": c.state, "country": c.country,
        "lat": c.lat, "lng": c.lng, "vendor_count": counts.get(c.id, 0),
    } for c in cities]
    return jsonify({"cities": data}), 200


def _apply_city_fields(city, data):
    if "name" in data:
        city.name = _clean_str(data["name"], 100)
    if "slug" in data or (city.name and not city.slug):
        city.slug = slugify(data.get("slug") or city.name)
    for field in ("state", "country"):
        if field in data:
            setattr(city, field, _clean_str(data[field], 100))
    for field in ("lat", "lng"):
        if field in data:
            try:
                setattr(city, field, _to_float(data[field]))
            except (TypeError, ValueError):
                return f"{field} must be a number"
    if not city.name:
        return "City name is required"
    clash = City.query.filter(City.slug == city.slug, City.id != (city.id or 0)).first()
    if clash:
        return "City with this slug already exists"
    return None


@admin_api_bp.route("/cities", methods=["POST"])
@admin_required("cities")
def add_city():
    city = City(country="India")
    error = _apply_city_fields(city, _json())
    if error:
        return jsonify({"error": error}), 400
    db.session.add(city)
    db.session.commit()
    return jsonify({"message": "City added successfully.", "id": city.id}), 201


@admin_api_bp.route("/cities/<int:city_id>", methods=["PUT"])
@admin_required("cities")
def update_city(city_id):
    city = db.get_or_404(City, city_id)
    error = _apply_city_fields(city, _json())
    if error:
        db.session.rollback()
        return jsonify({"error": error}), 400
    db.session.commit()
    return jsonify({"message": "City updated."})


@admin_api_bp.route("/cities/<int:city_id>", methods=["DELETE"])
@admin_required("cities")
def delete_city(city_id):
    city = db.get_or_404(City, city_id)
    vendor_count = Vendor.query.filter_by(city_id=city.id).count()
    pending = VendorSubmission.query.filter_by(city_id=city.id).count()
    if vendor_count or pending:
        return jsonify({"error": f"Cannot delete: {city.name} still has {vendor_count} vendors and {pending} submissions."}), 400
    db.session.delete(city)
    db.session.commit()
    return jsonify({"message": "City deleted."})


# ==================== CATEGORIES ====================

def _category_vendor_count(cat):
    terms = {cat.name, cat.slug.replace("-", "_")}
    clauses = []
    for t in terms:
        clauses += [Vendor.food_category.ilike(f"%{t}%"), Vendor.cuisine_type.ilike(f"%{t}%")]
    return Vendor.query.filter(db.or_(*clauses)).count()


@admin_api_bp.route("/categories", methods=["GET"])
@admin_required("categories")
def get_categories():
    cats = Category.query.order_by(Category.sort_order.asc(), Category.name.asc()).all()
    return jsonify({"categories": [{**c.to_dict(), "vendor_count": _category_vendor_count(c)} for c in cats]})


def _apply_category_fields(cat, data):
    if "name" in data:
        cat.name = _clean_str(data["name"], 100)
    if "slug" in data or (cat.name and not cat.slug):
        cat.slug = slugify(data.get("slug") or cat.name)
    if "icon" in data:
        cat.icon = _clean_str(data["icon"], 20)
    if "image_url" in data:
        cat.image_url = _clean_str(data["image_url"], 500)
    if "sort_order" in data:
        try:
            cat.sort_order = int(data["sort_order"] or 0)
        except (TypeError, ValueError):
            return "sort_order must be a number"
    if "is_active" in data:
        cat.is_active = _to_bool(data["is_active"])
    if not cat.name:
        return "Category name is required"
    if Category.query.filter(Category.slug == cat.slug, Category.id != (cat.id or 0)).first():
        return "A category with this slug already exists"
    return None


@admin_api_bp.route("/categories", methods=["POST"])
@admin_required("categories")
def add_category():
    cat = Category(is_active=True, sort_order=Category.query.count())
    error = _apply_category_fields(cat, _json())
    if error:
        return jsonify({"error": error}), 400
    db.session.add(cat)
    db.session.commit()
    return jsonify({"message": "Category created.", "category": cat.to_dict()}), 201


@admin_api_bp.route("/categories/<int:cat_id>", methods=["PUT"])
@admin_required("categories")
def update_category(cat_id):
    cat = db.get_or_404(Category, cat_id)
    error = _apply_category_fields(cat, _json())
    if error:
        db.session.rollback()
        return jsonify({"error": error}), 400
    db.session.commit()
    return jsonify({"message": "Category updated.", "category": cat.to_dict()})


@admin_api_bp.route("/categories/<int:cat_id>", methods=["DELETE"])
@admin_required("categories")
def delete_category(cat_id):
    cat = db.get_or_404(Category, cat_id)
    db.session.delete(cat)
    db.session.commit()
    return jsonify({"message": "Category deleted."})


# ==================== RATINGS & REVIEWS ====================

@admin_api_bp.route("/ratings", methods=["GET"])
@admin_required("reviews")
def get_ratings():
    vendors = (
        Vendor.query.filter(Vendor.total_ratings > 0)
        .order_by(Vendor.avg_rating.desc().nullslast())
        .all()
    )
    data = [{
        "id": v.id, "city_name": v.city.name if v.city else None, "name": v.name,
        "cuisine_type": v.cuisine_type, "avg_rating": v.avg_rating, "total_ratings": v.total_ratings,
    } for v in vendors]
    return jsonify({"ratings": data}), 200


@admin_api_bp.route("/reviews", methods=["GET"])
@admin_required("reviews")
def get_reviews():
    q = request.args.get("q", "").strip()
    vendor_id = request.args.get("vendor_id", type=int)
    max_rating = request.args.get("max_rating", type=float)
    query = Rating.query.join(Vendor, Rating.vendor_id == Vendor.id)
    if q:
        like = f"%{q}%"
        query = query.filter(db.or_(Rating.review_text.ilike(like), Rating.author_name.ilike(like), Vendor.name.ilike(like)))
    if vendor_id:
        query = query.filter(Rating.vendor_id == vendor_id)
    if max_rating:
        query = query.filter(Rating.rating_value <= max_rating)
    reviews, meta = _paginate(query.order_by(Rating.created_at.desc()))
    data = [{
        "id": r.id, "vendor_id": r.vendor_id, "vendor_name": r.vendor.name if r.vendor else None,
        "city_name": r.vendor.city.name if r.vendor and r.vendor.city else None,
        "rating_value": r.rating_value, "review_text": r.review_text,
        "author_name": r.author_name or "Anonymous", "user_id": r.user_id,
        "user_email": r.user.email if r.user else None, "user_ip": r.user_ip,
        "created_at": iso(r.created_at),
    } for r in reviews]
    return jsonify({"reviews": data, **meta})


@admin_api_bp.route("/reviews/<int:review_id>", methods=["DELETE"])
@admin_required("reviews")
def delete_review(review_id):
    review = db.get_or_404(Rating, review_id)
    vendor = review.vendor
    db.session.delete(review)
    db.session.flush()
    if vendor:
        recompute_vendor_rating(vendor)
    db.session.commit()
    return jsonify({"message": "Review deleted."})


@admin_api_bp.route("/site-reviews", methods=["GET"])
@admin_required("reviews")
def get_site_reviews():
    status = request.args.get("status", "all")
    query = SiteReview.query
    if status != "all":
        query = query.filter_by(status=status)
    items = query.order_by(SiteReview.created_at.desc()).all()
    return jsonify({"site_reviews": [{
        "id": r.id, "author_name": r.author_name, "review_text": r.review_text,
        "rating_value": r.rating_value, "status": r.status, "created_at": iso(r.created_at),
    } for r in items]})


@admin_api_bp.route("/site-reviews/<int:review_id>", methods=["PUT"])
@admin_required("reviews")
def update_site_review(review_id):
    review = db.get_or_404(SiteReview, review_id)
    status = _json().get("status")
    if status not in ("pending", "approved", "rejected"):
        return jsonify({"error": "Invalid status"}), 400
    review.status = status
    db.session.commit()
    return jsonify({"message": f"Review {status}."})


@admin_api_bp.route("/site-reviews/<int:review_id>", methods=["DELETE"])
@admin_required("reviews")
def delete_site_review(review_id):
    review = db.get_or_404(SiteReview, review_id)
    db.session.delete(review)
    db.session.commit()
    return jsonify({"message": "Review deleted."})


# ==================== APP USERS ====================

def _user_row(u, review_counts, submission_counts):
    return {
        "id": u.id, "name": u.name, "email": u.email, "phone": u.phone,
        "role": "consumer",
        "status": u.status or "active",
        "joined": iso(u.created_at),
        "last_login": iso(u.last_login_at),
        "reviews_count": review_counts.get(u.id, 0),
        "submissions_count": submission_counts.get(u.id, 0),
        "notifications_enabled": u.notifications_enabled,
        "has_push_token": bool(u.push_token),
    }


@admin_api_bp.route("/users", methods=["GET"])
@admin_required("users")
def get_users():
    q = request.args.get("q", "").strip()
    status = request.args.get("status", "all")
    query = User.query
    if q:
        like = f"%{q}%"
        query = query.filter(db.or_(User.name.ilike(like), User.email.ilike(like), User.phone.ilike(like)))
    if status == "suspended":
        query = query.filter(User.status == "suspended")
    elif status == "active":
        query = query.filter(db.or_(User.status == "active", User.status.is_(None)))

    users, meta = _paginate(query.order_by(User.created_at.desc()))
    ids = [u.id for u in users]
    review_counts = dict(
        db.session.query(Rating.user_id, db.func.count(Rating.id)).filter(Rating.user_id.in_(ids)).group_by(Rating.user_id).all()
    ) if ids else {}
    submission_counts = dict(
        db.session.query(VendorSubmission.user_id, db.func.count(VendorSubmission.id))
        .filter(VendorSubmission.user_id.in_(ids)).group_by(VendorSubmission.user_id).all()
    ) if ids else {}
    return jsonify({"users": [_user_row(u, review_counts, submission_counts) for u in users], **meta})


@admin_api_bp.route("/users/<int:user_id>", methods=["GET"])
@admin_required("users")
def get_user(user_id):
    u = db.get_or_404(User, user_id)
    reviews = Rating.query.filter_by(user_id=u.id).order_by(Rating.created_at.desc()).limit(20).all()
    submissions = VendorSubmission.query.filter_by(user_id=u.id).order_by(VendorSubmission.created_at.desc()).limit(20).all()
    return jsonify({
        "user": _user_row(u, {u.id: Rating.query.filter_by(user_id=u.id).count()},
                          {u.id: VendorSubmission.query.filter_by(user_id=u.id).count()}),
        "favorites_count": len(u.favorites),
        "reviews": [{"id": r.id, "vendor_name": r.vendor.name if r.vendor else None, "rating_value": r.rating_value,
                     "review_text": r.review_text, "created_at": iso(r.created_at)} for r in reviews],
        "submissions": [{"id": s.id, "stall_name": s.stall_name, "status": s.status,
                         "created_at": iso(s.created_at)} for s in submissions],
    })


@admin_api_bp.route("/users/<int:user_id>/status", methods=["PUT"])
@admin_required("users")
def update_user_status(user_id):
    u = db.get_or_404(User, user_id)
    status = _json().get("status")
    if status not in ("active", "suspended"):
        return jsonify({"error": "Status must be active or suspended"}), 400
    u.status = status
    db.session.commit()
    return jsonify({"message": f"User {status}.", "status": status})


@admin_api_bp.route("/users/<int:user_id>", methods=["DELETE"])
@admin_required("users")
def delete_user(user_id):
    u = db.get_or_404(User, user_id)
    ContactMessage.query.filter_by(user_id=u.id).update({"user_id": None})
    Report.query.filter_by(reporter_user_id=u.id).update({"reporter_user_id": None})
    db.session.delete(u)
    db.session.commit()
    return jsonify({"message": "User deleted."})


# ==================== STAFF ====================

@admin_api_bp.route("/staff", methods=["GET"])
@admin_required()
def get_staff():
    staff = AdminUser.query.order_by(AdminUser.created_at.asc()).all()
    return jsonify({"staff": [s.to_dict() for s in staff]})


@admin_api_bp.route("/staff", methods=["POST"])
@admin_required(super_only=True)
def add_staff():
    data = _json()
    name = _clean_str(data.get("name"), 100)
    email = (_clean_str(data.get("email"), 150) or "").lower()
    username = _clean_str(data.get("username"), 80)
    role = data.get("role", "moderator")
    password = data.get("password") or ""

    if not name or not email:
        return jsonify({"error": "Name and email are required"}), 400
    if role not in ADMIN_ROLES:
        return jsonify({"error": "Invalid role"}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400
    if AdminUser.query.filter_by(email=email).first():
        return jsonify({"error": "An admin with this email already exists"}), 400
    if username and AdminUser.query.filter_by(username=username).first():
        return jsonify({"error": "This username is taken"}), 400

    staff = AdminUser(name=name, email=email, username=username, role=role, is_active=True)
    staff.set_password(password)
    db.session.add(staff)
    db.session.commit()
    return jsonify({"message": "Admin account created.", "staff": staff.to_dict()}), 201


def _other_active_super_admins(exclude_id):
    return AdminUser.query.filter(
        AdminUser.role == "super_admin", AdminUser.is_active == True, AdminUser.id != exclude_id  # noqa: E712
    ).count()


@admin_api_bp.route("/staff/<int:staff_id>", methods=["PUT"])
@admin_required(super_only=True)
def update_staff(staff_id):
    staff = db.get_or_404(AdminUser, staff_id)
    data = _json()
    demoting = ("role" in data and data["role"] != "super_admin") or ("is_active" in data and not _to_bool(data["is_active"]))
    if staff.role == "super_admin" and demoting and _other_active_super_admins(staff.id) == 0:
        return jsonify({"error": "There must be at least one active Super Admin"}), 400

    if "name" in data:
        staff.name = _clean_str(data["name"], 100) or staff.name
    if "role" in data:
        if data["role"] not in ADMIN_ROLES:
            return jsonify({"error": "Invalid role"}), 400
        staff.role = data["role"]
    if "is_active" in data:
        staff.is_active = _to_bool(data["is_active"])
    if data.get("password"):
        if len(data["password"]) < 8:
            return jsonify({"error": "Password must be at least 8 characters"}), 400
        staff.set_password(data["password"])
    db.session.commit()
    return jsonify({"message": "Staff updated.", "staff": staff.to_dict()})


@admin_api_bp.route("/staff/<int:staff_id>", methods=["DELETE"])
@admin_required(super_only=True)
def delete_staff(staff_id):
    staff = db.get_or_404(AdminUser, staff_id)
    if staff.id == g.admin.id:
        return jsonify({"error": "You cannot revoke your own access"}), 400
    if staff.role == "super_admin" and _other_active_super_admins(staff.id) == 0:
        return jsonify({"error": "There must be at least one active Super Admin"}), 400
    db.session.delete(staff)
    db.session.commit()
    return jsonify({"message": "Admin access revoked."})


# ==================== INBOX ====================

@admin_api_bp.route("/inbox", methods=["GET"])
@admin_required("inbox")
def get_inbox():
    status = request.args.get("status", "all")
    query = ContactMessage.query
    if status != "all":
        query = query.filter_by(status=status)
    messages = query.order_by(ContactMessage.created_at.desc()).all()
    counts = dict(db.session.query(ContactMessage.status, db.func.count(ContactMessage.id)).group_by(ContactMessage.status).all())
    return jsonify({"messages": [m.to_dict() for m in messages], "counts": counts})


@admin_api_bp.route("/inbox/<int:message_id>", methods=["PUT"])
@admin_required("inbox")
def update_message(message_id):
    msg = db.get_or_404(ContactMessage, message_id)
    status = _json().get("status")
    if status not in ("unread", "read", "resolved"):
        return jsonify({"error": "Invalid status"}), 400
    msg.status = status
    db.session.commit()
    return jsonify({"message": "Message updated.", "status": status})


@admin_api_bp.route("/inbox/<int:message_id>", methods=["DELETE"])
@admin_required("inbox")
def delete_message(message_id):
    msg = db.get_or_404(ContactMessage, message_id)
    db.session.delete(msg)
    db.session.commit()
    return jsonify({"message": "Message deleted."})


# ==================== REPORTS ====================

def _report_target(rep):
    if rep.target_type == "vendor":
        v = db.session.get(Vendor, rep.target_id)
        return {"exists": bool(v), "label": v.name if v else "Deleted vendor",
                "preview": (v.address_text or v.area) if v else None, "vendor_id": v.id if v else None}
    if rep.target_type == "review":
        r = db.session.get(Rating, rep.target_id)
        return {"exists": bool(r), "label": f"Review by {r.author_name or 'Anonymous'}" if r else "Deleted review",
                "preview": r.review_text if r else None, "vendor_id": r.vendor_id if r else None}
    if rep.target_type == "reel":
        reel = db.session.get(ReelSubmission, rep.target_id)
        return {"exists": bool(reel), "label": reel.title if reel else "Deleted reel", "preview": None, "vendor_id": None}
    return {"exists": False, "label": "Unknown", "preview": None, "vendor_id": None}


def _report_dict(rep):
    return {
        "id": rep.id, "target_type": rep.target_type, "target_id": rep.target_id,
        "target": _report_target(rep), "reason": rep.reason, "details": rep.details,
        "reporter_name": rep.reporter_name or "Anonymous", "reporter_user_id": rep.reporter_user_id,
        "status": rep.status, "admin_notes": rep.admin_notes,
        "created_at": iso(rep.created_at), "resolved_at": iso(rep.resolved_at),
    }


@admin_api_bp.route("/reports", methods=["GET"])
@admin_required("reports")
def get_reports():
    status = request.args.get("status", "pending")
    query = Report.query
    if status != "all":
        query = query.filter_by(status=status)
    reports = query.order_by(Report.created_at.desc()).all()
    counts = dict(db.session.query(Report.status, db.func.count(Report.id)).group_by(Report.status).all())
    return jsonify({"reports": [_report_dict(r) for r in reports], "counts": counts})


@admin_api_bp.route("/reports/<int:report_id>", methods=["PUT"])
@admin_required("reports")
def update_report(report_id):
    rep = db.get_or_404(Report, report_id)
    data = _json()
    status = data.get("status", rep.status)
    if status not in ("pending", "resolved", "dismissed"):
        return jsonify({"error": "Invalid status"}), 400
    rep.status = status
    rep.resolved_at = _now() if status != "pending" else None
    if "admin_notes" in data:
        rep.admin_notes = _clean_str(data["admin_notes"])
    db.session.commit()
    return jsonify({"message": "Report updated.", "report": _report_dict(rep)})


@admin_api_bp.route("/reports/<int:report_id>/take-down", methods=["POST"])
@admin_required("reports")
def take_down_report_target(report_id):
    """Remove a reported review/reel, or hide a reported vendor, then resolve the report."""
    rep = db.get_or_404(Report, report_id)
    if rep.target_type == "review":
        review = db.session.get(Rating, rep.target_id)
        if review:
            vendor = review.vendor
            db.session.delete(review)
            db.session.flush()
            if vendor:
                recompute_vendor_rating(vendor)
        action = "Review deleted"
    elif rep.target_type == "reel":
        reel = db.session.get(ReelSubmission, rep.target_id)
        if reel:
            reel.status = "rejected"
        action = "Reel hidden"
    else:
        vendor = db.session.get(Vendor, rep.target_id)
        if vendor:
            vendor.verified_status = "rejected"
        action = "Vendor hidden from the app and website"

    # Resolve every open report about the same item.
    for other in Report.query.filter_by(target_type=rep.target_type, target_id=rep.target_id, status="pending").all():
        other.status = "resolved"
        other.resolved_at = _now()
        other.admin_notes = other.admin_notes or action
    db.session.commit()
    return jsonify({"message": f"{action}. Report resolved."})


@admin_api_bp.route("/reports/<int:report_id>", methods=["DELETE"])
@admin_required("reports")
def delete_report(report_id):
    rep = db.get_or_404(Report, report_id)
    db.session.delete(rep)
    db.session.commit()
    return jsonify({"message": "Report deleted."})


# ==================== REELS ====================

def _reel_dict(r):
    return {
        "id": r.id, "title": r.title, "author_name": r.author_name, "status": r.status, "views": r.views or 0,
        "videoUrl": f"{request.host_url.rstrip('/')}/static/uploads/reels/{r.video_filename}",
        "created_at": iso(r.created_at),
    }


@admin_api_bp.route("/reels", methods=["GET"])
@admin_required("reels")
def get_reels():
    status = request.args.get("status", "pending")
    query = ReelSubmission.query
    if status != "all":
        query = query.filter_by(status=status)
    reels = query.order_by(ReelSubmission.created_at.desc()).all()
    return jsonify({"reels": [_reel_dict(r) for r in reels]})


@admin_api_bp.route("/reels/pending", methods=["GET"])
@admin_required("reels")
def get_pending_reels():
    reels = ReelSubmission.query.filter_by(status="pending").order_by(ReelSubmission.created_at.desc()).all()
    return jsonify({"reels": [_reel_dict(r) for r in reels]})


@admin_api_bp.route("/reels/<int:reel_id>/approve", methods=["POST"])
@admin_required("reels")
def approve_reel(reel_id):
    reel = db.get_or_404(ReelSubmission, reel_id)
    reel.status = "approved"
    db.session.commit()
    return jsonify({"success": True})


@admin_api_bp.route("/reels/<int:reel_id>/reject", methods=["POST"])
@admin_required("reels")
def reject_reel(reel_id):
    reel = db.get_or_404(ReelSubmission, reel_id)
    reel.status = "rejected"
    db.session.commit()
    return jsonify({"success": True})


@admin_api_bp.route("/reels/<int:reel_id>", methods=["DELETE"])
@admin_required("reels")
def delete_reel(reel_id):
    reel = db.get_or_404(ReelSubmission, reel_id)
    path = os.path.join(current_app.root_path, "static", "uploads", "reels", reel.video_filename)
    db.session.delete(reel)
    db.session.commit()
    try:
        if os.path.exists(path):
            os.remove(path)
    except OSError:
        current_app.logger.warning("Could not delete reel file %s", path)
    return jsonify({"success": True})


# ==================== MOBILE APP SETTINGS ====================

@admin_api_bp.route("/app-settings", methods=["GET"])
@admin_required("app")
def get_app_settings():
    return jsonify({"settings": get_settings()})


@admin_api_bp.route("/app-settings", methods=["PUT"])
@admin_required("app")
def update_app_settings():
    settings = save_settings(_json().get("settings") or _json())
    return jsonify({"message": "App configuration saved.", "settings": settings})


@admin_api_bp.route("/banners", methods=["GET"])
@admin_required("app")
def get_banners():
    banners = AppBanner.query.order_by(AppBanner.sort_order.asc(), AppBanner.id.desc()).all()
    return jsonify({"banners": [b.to_dict() for b in banners]})


def _apply_banner_fields(banner, data):
    if "title" in data:
        banner.title = _clean_str(data["title"], 150)
    if "subtitle" in data:
        banner.subtitle = _clean_str(data["subtitle"], 250)
    if "image_url" in data:
        banner.image_url = _clean_str(data["image_url"], 500)
    if "link_type" in data:
        if data["link_type"] not in ("none", "vendor", "city", "category", "url"):
            return "Invalid link type"
        banner.link_type = data["link_type"]
    if "link_value" in data:
        banner.link_value = _clean_str(data["link_value"], 500)
    if "is_active" in data:
        banner.is_active = _to_bool(data["is_active"])
    if "sort_order" in data:
        try:
            banner.sort_order = int(data["sort_order"] or 0)
        except (TypeError, ValueError):
            return "sort_order must be a number"
    if not banner.title or not banner.image_url:
        return "Title and image URL are required"
    return None


@admin_api_bp.route("/banners", methods=["POST"])
@admin_required("app")
def add_banner():
    banner = AppBanner(is_active=True, link_type="none", sort_order=AppBanner.query.count())
    error = _apply_banner_fields(banner, _json())
    if error:
        return jsonify({"error": error}), 400
    db.session.add(banner)
    db.session.commit()
    return jsonify({"message": "Banner created.", "banner": banner.to_dict()}), 201


@admin_api_bp.route("/banners/<int:banner_id>", methods=["PUT"])
@admin_required("app")
def update_banner(banner_id):
    banner = db.get_or_404(AppBanner, banner_id)
    error = _apply_banner_fields(banner, _json())
    if error:
        db.session.rollback()
        return jsonify({"error": error}), 400
    db.session.commit()
    return jsonify({"message": "Banner updated.", "banner": banner.to_dict()})


@admin_api_bp.route("/banners/<int:banner_id>", methods=["DELETE"])
@admin_required("app")
def delete_banner(banner_id):
    banner = db.get_or_404(AppBanner, banner_id)
    db.session.delete(banner)
    db.session.commit()
    return jsonify({"message": "Banner deleted."})


@admin_api_bp.route("/notifications", methods=["GET"])
@admin_required("app")
def get_notifications():
    items = AppNotification.query.order_by(AppNotification.created_at.desc()).limit(100).all()
    return jsonify({"notifications": [n.to_dict() for n in items]})


@admin_api_bp.route("/notifications", methods=["POST"])
@admin_required("app")
def send_notification():
    data = _json()
    title = _clean_str(data.get("title"), 150)
    body = _clean_str(data.get("body"))
    target = data.get("target") or "all"
    if not title or not body:
        return jsonify({"error": "Title and message are required"}), 400
    if target != "all":
        slug = target.split(":", 1)[-1]
        if not City.query.filter_by(slug=slug).first():
            return jsonify({"error": "Unknown target city"}), 400
        target = f"city:{slug}"

    note = AppNotification(
        title=title, body=body, target=target,
        link_type=data.get("link_type") or "none", link_value=_clean_str(data.get("link_value"), 500),
        sent_by=g.admin.name,
    )
    db.session.add(note)
    db.session.flush()

    # Device push for users with a registered push token (the app also shows these in its inbox).
    sent = 0
    # Push tokens aren't tied to a city, so city announcements stay in the in-app inbox only.
    if data.get("send_push", True) and target == "all":
        tokens = [u.push_token for u in User.query.filter(
            User.push_token.isnot(None), User.notifications_enabled == True,  # noqa: E712
            db.or_(User.status.is_(None), User.status != "suspended"),
        ).all()]
        sent = send_push_batch(tokens, body, title, {"notification_id": note.id})
    note.push_sent_count = sent
    db.session.commit()
    return jsonify({"message": "Notification published.", "notification": note.to_dict()}), 201


@admin_api_bp.route("/notifications/<int:note_id>", methods=["DELETE"])
@admin_required("app")
def delete_notification(note_id):
    note = db.get_or_404(AppNotification, note_id)
    db.session.delete(note)
    db.session.commit()
    return jsonify({"message": "Notification deleted."})
