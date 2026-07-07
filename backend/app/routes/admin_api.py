from flask import Blueprint, request, jsonify, current_app
from functools import wraps
from app import db
from app.models import VendorSubmission, Vendor, City, ReelSubmission
import jwt
import datetime
import pandas as pd
import io

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
    username = data.get("username")
    password = data.get("password")
    
    # Check explicitly for user requested credentials, or fallback to config password if no username provided (for backwards compatibility)
    is_valid = False
    if username == "saransh" and password == "Sara@123":
        is_valid = True
    elif not username and password == current_app.config["ADMIN_PASSWORD"]:
        is_valid = True
        
    if is_valid:
        token = jwt.encode({
            "role": "admin",
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, current_app.config["SECRET_KEY"], algorithm="HS256")
        
        return jsonify({"token": token}), 200
        
    return jsonify({"error": "Invalid username or password"}), 401

# --- SUBMISSIONS ---

@admin_api_bp.route("/submissions", methods=["GET"])
@admin_required
def get_submissions():
    status_filter = request.args.get("status", None)
    query = VendorSubmission.query
    if status_filter:
        query = query.filter_by(status=status_filter)
    
    submissions = query.filter_by(status='pending').order_by(VendorSubmission.created_at.desc()).all()
    
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
        avg_rating=sub.rating if sub.rating else None,
        total_ratings=1 if sub.rating else 0,
        price_level=sub.estimated_price,
        address_text=sub.approx_address,
        lat=sub.lat,
        lng=sub.lng,
        source="user",
        verified_status="verified",
    )

    db.session.add(vendor)
    db.session.flush()

    if sub.rating:
        from app.models import Rating
        new_rating = Rating(
            vendor_id=vendor.id,
            rating_value=sub.rating,
            author_name=sub.submitted_by_name or "Anonymous",
            review_text="Initial rating from submitter"
        )
        db.session.add(new_rating)

    sub.status = "approved"
    db.session.commit()

    return jsonify({"message": f"'{sub.stall_name}' approved and converted to vendor."}), 200

@admin_api_bp.route("/submissions/<int:submission_id>/reject", methods=["POST"])
@admin_required
def reject_submission(submission_id):
    sub = VendorSubmission.query.get_or_404(submission_id)
    
    sub.status = "rejected"
    db.session.commit()
    
    return jsonify({"message": "Submission rejected."}), 200

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

# -------------------- REEL SUBMISSIONS --------------------

@admin_api_bp.route("/reels/pending", methods=["GET"])
@admin_required
def get_pending_reels():
    reels = ReelSubmission.query.filter_by(status="pending").order_by(ReelSubmission.created_at.desc()).all()
    results = []
    for r in reels:
        results.append({
            "id": r.id,
            "title": r.title,
            "author_name": r.author_name,
            "videoUrl": f"http://127.0.0.1:5000/static/uploads/reels/{r.video_filename}",
            "created_at": r.created_at.isoformat() if r.created_at else None
        })
    return jsonify({"reels": results})


@admin_api_bp.route("/reels/<int:reel_id>/approve", methods=["POST"])
@admin_required
def approve_reel(reel_id):
    reel = ReelSubmission.query.get_or_404(reel_id)
    reel.status = "approved"
    db.session.commit()
    return jsonify({"success": True})


@admin_api_bp.route("/reels/<int:reel_id>/reject", methods=["POST"])
@admin_required
def reject_reel(reel_id):
    reel = ReelSubmission.query.get_or_404(reel_id)
    reel.status = "rejected"
    db.session.commit()
    return jsonify({"success": True})

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

# --- BULK UPLOAD ---

@admin_api_bp.route("/vendors/bulk-upload", methods=["POST"])
@admin_required
def bulk_upload_vendors():
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
        
    try:
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file)
        elif file.filename.endswith('.xlsx'):
            df = pd.read_excel(file, engine='openpyxl')
        else:
            return jsonify({"error": "Unsupported file format. Please upload .csv or .xlsx"}), 400
            
        # Standardize column names (lowercase, replace spaces with underscores)
        df.columns = [str(c).strip().lower().replace(' ', '_') for c in df.columns]
        
        required_cols = ['stall_name', 'city_name', 'cuisine_type']
        missing_cols = [c for c in required_cols if c not in df.columns]
        if missing_cols:
            return jsonify({"error": f"Missing required columns: {', '.join(missing_cols)}"}), 400
            
        success_count = 0
        
        for _, row in df.iterrows():
            stall_name = str(row['stall_name']).strip()
            city_name = str(row['city_name']).strip()
            cuisine_type = str(row.get('cuisine_type', '')).strip()
            description = str(row.get('description', '')).strip() if pd.notna(row.get('description')) else ""
            price_level = str(row.get('price_level', '₹150 for two')).strip() if pd.notna(row.get('price_level')) else "₹150 for two"
            lat = float(row['lat']) if 'lat' in df.columns and pd.notna(row['lat']) else None
            lng = float(row['lng']) if 'lng' in df.columns and pd.notna(row['lng']) else None
            
            if not stall_name or not city_name:
                continue
                
            # Handle city
            city_slug = city_name.lower().replace(' ', '-')
            city = City.query.filter_by(slug=city_slug).first()
            if not city:
                city = City(name=city_name, slug=city_slug, country="India")
                db.session.add(city)
                db.session.flush() # get city.id
                
            # Check if vendor already exists
            existing = Vendor.query.filter_by(name=stall_name, city_id=city.id).first()
            if existing:
                continue
                
            vendor = Vendor(
                city_id=city.id,
                name=stall_name,
                cuisine_type=cuisine_type,
                is_hidden_gem=True,
                is_famous=False,
                price_level=price_level,
                address_text=description, 
                lat=lat,
                lng=lng,
                source="admin_bulk",
                verified_status="verified"
            )
            db.session.add(vendor)
            success_count += 1
            
        db.session.commit()
        return jsonify({"message": f"Successfully imported {success_count} vendors!"}), 200
        
    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

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

# --- RATINGS ---

@admin_api_bp.route("/ratings", methods=["GET"])
@admin_required
def get_ratings():
    vendors = Vendor.query.order_by(Vendor.avg_rating.desc().nullslast()).all()
    data = []
    for v in vendors:
        if v.total_ratings and v.total_ratings > 0:
            data.append({
                "id": v.id,
                "city_name": v.city.name if v.city else None,
                "name": v.name,
                "cuisine_type": v.cuisine_type,
                "avg_rating": v.avg_rating,
                "total_ratings": v.total_ratings
            })
    return jsonify({"ratings": data}), 200
