from flask import Blueprint, request, jsonify, current_app
from functools import wraps
from app import db
from app.models import VendorSubmission, Vendor, City
import jwt
import datetime

admin_api_bp = Blueprint("admin_api", __name__, url_prefix="/api/admin")

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if "Authorization" in request.headers:
            auth_header = request.headers["Authorization"]
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
        
        if not token:
            return jsonify({"error": "Token is missing"}), 401
            
        try:
            data = jwt.decode(token, current_app.config["SECRET_KEY"], algorithms=["HS256"])
            if data.get("role") != "admin":
                return jsonify({"error": "Invalid role"}), 403
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired"}), 401
        except Exception as e:
            return jsonify({"error": "Invalid token"}), 401
            
        return f(*args, **kwargs)
    return decorated

@admin_api_bp.route("/login", methods=["POST"])
def login():
    data = request.json
    password = data.get("password")
    
    if password == current_app.config["ADMIN_PASSWORD"]:
        token = jwt.encode({
            "role": "admin",
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, current_app.config["SECRET_KEY"], algorithm="HS256")
        
        return jsonify({"token": token}), 200
        
    return jsonify({"error": "Invalid password"}), 401

# --- SUBMISSIONS ---

@admin_api_bp.route("/submissions", methods=["GET"])
@admin_required
def get_submissions():
    status_filter = request.args.get("status", None)
    query = VendorSubmission.query
    if status_filter:
        query = query.filter_by(status=status_filter)
    
    submissions = query.order_by(VendorSubmission.created_at.desc()).all()
    
    data = []
    for sub in submissions:
        data.append({
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
            "submitted_by_name": sub.submitted_by_name,
            "status": sub.status,
            "created_at": sub.created_at.isoformat() if sub.created_at else None
        })
    return jsonify({"submissions": data}), 200

@admin_api_bp.route("/submissions/<int:submission_id>/approve", methods=["POST"])
@admin_required
def approve_submission(submission_id):
    sub = VendorSubmission.query.get_or_404(submission_id)

    if sub.lat is None or sub.lng is None:
        return jsonify({"error": "Cannot approve: Missing location (lat/lng)."}), 400

    existing = Vendor.query.filter_by(name=sub.stall_name, city_id=sub.city_id).first()
    if existing:
        return jsonify({"error": "Vendor already exists in this city."}), 400

    vendor = Vendor(
        city_id=sub.city_id,
        name=sub.stall_name,
        cuisine_type=sub.cuisine_type,
        is_hidden_gem=True,
        is_famous=False,
        avg_rating=None,
        price_level=sub.estimated_price,
        address_text=sub.approx_address,
        lat=sub.lat,
        lng=sub.lng,
        source="user",
        verified_status="verified",
    )

    db.session.add(vendor)
    db.session.delete(sub)
    db.session.commit()

    return jsonify({"message": f"'{sub.stall_name}' approved and converted to vendor."}), 200

@admin_api_bp.route("/submissions/<int:submission_id>/reject", methods=["POST"])
@admin_required
def reject_submission(submission_id):
    sub = VendorSubmission.query.get_or_404(submission_id)
    db.session.delete(sub)
    db.session.commit()
    return jsonify({"message": "Submission rejected and deleted."}), 200

# --- VENDORS ---

@admin_api_bp.route("/vendors", methods=["GET"])
@admin_required
def get_vendors():
    vendors = Vendor.query.order_by(Vendor.created_at.desc()).all()
    data = []
    for v in vendors:
        data.append({
            "id": v.id,
            "city_id": v.city_id,
            "city_name": v.city.name if v.city else None,
            "name": v.name,
            "cuisine_type": v.cuisine_type,
            "is_hidden_gem": v.is_hidden_gem,
            "is_famous": v.is_famous,
            "avg_rating": v.avg_rating,
            "price_level": v.price_level,
            "address_text": v.address_text,
            "verified_status": v.verified_status,
            "created_at": v.created_at.isoformat() if v.created_at else None
        })
    return jsonify({"vendors": data}), 200

@admin_api_bp.route("/vendors/<int:vendor_id>", methods=["DELETE"])
@admin_required
def delete_vendor(vendor_id):
    vendor = Vendor.query.get_or_404(vendor_id)
    db.session.delete(vendor)
    db.session.commit()
    return jsonify({"message": "Vendor deleted."}), 200

@admin_api_bp.route("/vendors/<int:vendor_id>", methods=["PUT"])
@admin_required
def update_vendor(vendor_id):
    vendor = Vendor.query.get_or_404(vendor_id)
    data = request.json
    
    # Update fields if provided
    if "name" in data: vendor.name = data["name"]
    if "cuisine_type" in data: vendor.cuisine_type = data["cuisine_type"]
    if "is_hidden_gem" in data: vendor.is_hidden_gem = data["is_hidden_gem"]
    if "is_famous" in data: vendor.is_famous = data["is_famous"]
    if "verified_status" in data: vendor.verified_status = data["verified_status"]

    db.session.commit()
    return jsonify({"message": "Vendor updated successfully."}), 200

# --- CITIES ---

@admin_api_bp.route("/cities", methods=["GET"])
@admin_required
def get_cities():
    cities = City.query.all()
    data = []
    for c in cities:
        data.append({
            "id": c.id,
            "name": c.name,
            "slug": c.slug,
            "state": c.state,
            "country": c.country
        })
    return jsonify({"cities": data}), 200

@admin_api_bp.route("/cities", methods=["POST"])
@admin_required
def add_city():
    data = request.json
    if not data or "name" not in data or "slug" not in data:
        return jsonify({"error": "Name and slug are required"}), 400
        
    existing = City.query.filter_by(slug=data["slug"]).first()
    if existing:
        return jsonify({"error": "City with this slug already exists"}), 400
        
    city = City(
        name=data["name"],
        slug=data["slug"],
        state=data.get("state"),
        country=data.get("country", "India"),
        lat=data.get("lat"),
        lng=data.get("lng")
    )
    db.session.add(city)
    db.session.commit()
    return jsonify({"message": "City added successfully.", "id": city.id}), 201

