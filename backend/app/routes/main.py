from flask import Blueprint, jsonify, request, current_app
from urllib.parse import urlparse, parse_qs
import re
import requests

from app import db, cache
from app.models import City, Vendor, VendorSubmission, Rating, ReelSubmission
import os
import uuid
from werkzeug.utils import secure_filename

# ✅ ML import
from app.ml_model import build_recommendation_model, get_recommendations

main_bp = Blueprint("main", __name__)


@cache.memoize(timeout=3600)
def get_cached_recommendations(city_id, vendor_list_tuple):
    # We use a tuple for vendor_list because cache keys must be hashable
    vendor_list = [dict(t) for t in vendor_list_tuple]
    if not vendor_list:
        return []
    try:
        df, similarity = build_recommendation_model(vendor_list)
        return get_recommendations(vendor_list[0]["name"], df, similarity)
    except Exception as e:
        print("ML error:", e)
        return []


# -------------------- HOME --------------------
@main_bp.route("/cities", methods=["GET"])
def index():
    cities = City.query.order_by(City.name).all()

    # ✅ Add food descriptions dynamically
    city_descriptions = {
        "jaipur": "Famous for Dal Baati Churma, rich spices, and traditional Rajasthani flavors.",
        "delhi": "Known for Chole Bhature, Golgappa, and diverse Mughlai cuisine.",
        "mumbai": "Popular for Vada Pav, Pav Bhaji, and vibrant street food culture.",
    }

    results = []
    for city in cities:
        results.append({
            "id": city.id,
            "name": city.name,
            "slug": city.slug,
            "desc": city_descriptions.get(city.slug, "Explore local food and hidden gems.")
        })

    return jsonify({"cities": results})

@main_bp.route("/home", methods=["GET"])
def home_feed():
    cities = City.query.order_by(City.name).all()
    
    city_descriptions = {
        "jaipur": "Famous for Dal Baati Churma, rich spices, and traditional Rajasthani flavors.",
        "delhi": "Known for Chole Bhature, Golgappa, and diverse Mughlai cuisine.",
        "mumbai": "Popular for Vada Pav, Pav Bhaji, and vibrant street food culture.",
    }
    
    city_results = []
    for city in cities:
        city_results.append({
            "id": city.id,
            "name": city.name,
            "slug": city.slug,
            "desc": city_descriptions.get(city.slug, "Explore local food and hidden gems.")
        })
        
    recent_vendors = Vendor.query.order_by(Vendor.id.desc()).limit(10).all()
    
    vendor_results = []
    for v in recent_vendors:
        vendor_results.append({
            "id": v.id,
            "name": v.name,
            "cuisine_type": v.cuisine_type,
            "area": v.city.name if v.city else "Local",
            "rating": v.avg_rating,
            "image_url": v.image_url,
            "is_hidden_gem": v.is_hidden_gem,
            "lat": v.lat,
            "lng": v.lng
        })
        
    return jsonify({
        "cities": city_results,
        "recent_vendors": vendor_results
    })


# -------------------- SEARCH --------------------
@main_bp.route("/search", methods=["GET"])
def search():
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"results": []})
        
    vendors = Vendor.query.filter(
        db.or_(
            Vendor.name.ilike(f"%{query}%"),
            Vendor.cuisine_type.ilike(f"%{query}%")
        )
    ).limit(20).all()
    
    results = []
    for v in vendors:
        results.append({
            "id": v.id,
            "name": v.name,
            "cuisine_type": v.cuisine_type,
            "city_name": v.city.name if v.city else "Unknown",
            "city_slug": v.city.slug if v.city else "",
            "rating": v.avg_rating,
            "image_url": v.image_url,
            "is_hidden_gem": v.is_hidden_gem
        })
        
    return jsonify({"results": results})


# ✅ ADD HERE
def convert_price(p):
    if not p:
        return 100
    if "50" in str(p):
        return 50
    if "100" in str(p):
        return 100
    if "200" in str(p):
        return 200
    return 150
# -------------------- CITY PAGE --------------------
@main_bp.route("/city/<slug>", methods=["GET"])
def city_page(slug):
    city = City.query.filter_by(slug=slug).first_or_404()

    vendors = (
        Vendor.query
        .filter_by(city_id=city.id)
        .order_by(Vendor.avg_rating.desc().nullslast())
        .all()
    )

    vendor_data = [
        {
            "id": v.id,
            "name": v.name,
            "cuisine_type": v.cuisine_type,
            "rating": v.avg_rating,
            "total_ratings": v.total_ratings,
            "lat": v.lat,
            "lng": v.lng,
            "address": v.address_text,
            "is_hidden_gem": v.is_hidden_gem,
            "is_famous": v.is_famous,
            "price_level": v.price_level,
            "description": getattr(v, "description", "") or "",
            "image_url": v.image_url,
        }
        for v in vendors
    ]

    # ✅ ML PART (correct indentation)
    vendor_list = [
        {
            "name": v.name,
            "cuisine_type": v.cuisine_type,
            "description": getattr(v, "description", "") or "",
            "rating": v.avg_rating or 0,
            "price_level": convert_price(v.price_level)
        }
        for v in vendors
    ]

    # Convert list of dicts to tuple of tuples for caching
    vendor_list_tuple = tuple(tuple(d.items()) for d in vendor_list)
    recommendations = get_cached_recommendations(city.id, vendor_list_tuple)

    return jsonify({
        "city": {
            "id": city.id,
            "name": city.name,
            "slug": city.slug,
            "lat": city.lat,
            "lng": city.lng
        },
        "vendors": vendor_data,
        "recommendations": recommendations,
        "google_maps_api_key": current_app.config.get("GOOGLE_MAPS_API_KEY"),
    })

# -------------------- VENDOR DETAIL --------------------
@main_bp.route("/vendors/<int:vendor_id>", methods=["GET"])
def get_vendor_detail(vendor_id):
    vendor = Vendor.query.get_or_404(vendor_id)

    reviews = (
        Rating.query.filter_by(vendor_id=vendor.id)
        .order_by(Rating.created_at.desc())
        .all()
    )
    reviews_data = [
        {
            "id": r.id,
            "rating_value": r.rating_value,
            "review_text": r.review_text,
            "author_name": r.author_name or "Anonymous",
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in reviews
    ]

    nearby = (
        Vendor.query.filter(Vendor.city_id == vendor.city_id, Vendor.id != vendor.id)
        .order_by(Vendor.avg_rating.desc().nullslast())
        .limit(4)
        .all()
    )
    nearby_data = [
        {
            "id": n.id,
            "name": n.name,
            "cuisine_type": n.cuisine_type,
            "rating": n.avg_rating,
            "total_ratings": n.total_ratings,
            "area": n.area,
            "image_url": n.image_url,
            "is_hidden_gem": n.is_hidden_gem,
            "price_level": n.price_level,
        }
        for n in nearby
    ]

    return jsonify({
        "vendor": {
            "id": vendor.id,
            "name": vendor.name,
            "cuisine_type": vendor.cuisine_type,
            "description": vendor.description or "",
            "specialty_dish": vendor.specialty_dish,
            "opening_hours": vendor.opening_hours,
            "rating": vendor.avg_rating,
            "total_ratings": vendor.total_ratings,
            "lat": vendor.lat,
            "lng": vendor.lng,
            "address": vendor.address_text,
            "area": vendor.area,
            "is_hidden_gem": vendor.is_hidden_gem,
            "is_famous": vendor.is_famous,
            "price_level": vendor.price_level,
            "image_url": vendor.image_url,
            "verified_status": vendor.verified_status,
            "city": {
                "id": vendor.city.id,
                "name": vendor.city.name,
                "slug": vendor.city.slug,
            } if vendor.city else None,
        },
        "reviews": reviews_data,
        "nearby": nearby_data,
    })


# -------------------- SUBMIT VENDOR --------------------
@main_bp.route("/submit-vendor", methods=["POST"])
def submit_vendor():
    data = request.json or request.form
    
    city_id = int(data.get("city_id", 0))
    if city_id == 0:
        return jsonify({"success": False, "error": "City ID is required"}), 400
        
    stall_name = data.get("stall_name")
    cuisine_type = data.get("cuisine_type")
    description = data.get("description")
    google_maps_url = data.get("google_maps_url")
    approx_address = data.get("approx_address")
    estimated_price = data.get("estimated_price")
    submitted_by_name = data.get("submitted_by_name")
    submitted_by_email = data.get("submitted_by_email")

    lat = None
    lng = None

    try:
        if google_maps_url:
            # 1. Resolve short URLs
            if "goo.gl" in google_maps_url or "maps.app.goo.gl" in google_maps_url:
                try:
                    resp = requests.head(google_maps_url, allow_redirects=True, timeout=5)
                    google_maps_url = resp.url
                except Exception as e:
                    print(f"Short URL resolution failed: {e}")

            # 2. Case 1: @lat,lng
            match = re.search(r'@(-?\d+\.\d+),(-?\d+\.\d+)', google_maps_url)
            if match:
                lat = float(match.group(1))
                lng = float(match.group(2))

            # 3. Case 2: !3dLAT!4dLNG
            if lat is None:
                match = re.search(r'!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)', google_maps_url)
                if match:
                    lat = float(match.group(1))
                    lng = float(match.group(2))

            # 4. Case 3: q= or query= lat,lng
            if lat is None:
                param = None
                if "query=" in google_maps_url:
                    param = "query="
                elif "q=" in google_maps_url:
                    param = "q="
                
                if param:
                    coords = google_maps_url.split(param)[-1].split("&")[0]
                    parts = coords.split(",")
                    if len(parts) == 2:
                        try:
                            lat = float(parts[0])
                            lng = float(parts[1])
                        except:
                            pass

            # 5. Validation
            if lat is not None and (lat < -90 or lat > 90): lat = None
            if lng is not None and (lng < -180 or lng > 180): lng = None

    except Exception as e:
        print("Map parsing failed:", e)

    submission = VendorSubmission(
        city_id=city_id,
        stall_name=stall_name,
        cuisine_type=cuisine_type,
        description=description,
        google_maps_url=google_maps_url,
        approx_address=approx_address,
        estimated_price=estimated_price,
        submitted_by_name=submitted_by_name,
        submitted_by_email=submitted_by_email,
        lat=lat,
        lng=lng,
        rating=data.get("rating"),
        user_id=data.get("user_id"),
    )

    db.session.add(submission)
    db.session.commit()

    try:
        from app import socketio
        socketio.emit('new_submission', {
            'id': submission.id,
            'stall_name': submission.stall_name,
            'cuisine_type': submission.cuisine_type,
            'city_id': submission.city_id
        })
    except Exception as e:
        print("WebSocket emit failed:", e)

    return jsonify({"success": True, "message": "Thank you! Your hidden stall suggestion is submitted."})

# -------------------- RATE VENDOR --------------------
@main_bp.route("/vendors/<int:vendor_id>/rate", methods=["POST"])
def rate_vendor(vendor_id):
    data = request.json or {}
    rating_val = data.get("rating")
    review_text = data.get("review_text", "").strip()
    author_name = data.get("author_name", "").strip()
    
    if not rating_val:
        return jsonify({"success": False, "error": "Rating value is required"}), 400
        
    try:
        rating_val = float(rating_val)
        if rating_val < 1 or rating_val > 5:
            raise ValueError
    except:
        return jsonify({"success": False, "error": "Invalid rating value"}), 400

    vendor = Vendor.query.get_or_404(vendor_id)
    
    user_ip = request.remote_addr
    
    new_rating = Rating(
        vendor_id=vendor.id,
        rating_value=rating_val,
        user_ip=user_ip,
        user_id=data.get("user_id"),
        review_text=review_text if review_text else None,
        author_name=author_name if author_name else None
    )
    
    db.session.add(new_rating)
    db.session.flush()
    
    # Calculate new average
    all_ratings = Rating.query.filter_by(vendor_id=vendor.id).all()
    total = len(all_ratings)
    avg = sum(r.rating_value for r in all_ratings) / total if total > 0 else 0
    
    vendor.avg_rating = round(avg, 1)
    vendor.total_ratings = total
    
    db.session.commit()
    
    return jsonify({
        "success": True, 
        "avg_rating": vendor.avg_rating,
        "total_ratings": vendor.total_ratings
    })

# -------------------- VENDOR REVIEWS --------------------
@main_bp.route("/vendor-reviews", methods=["GET"])
def get_vendor_reviews():
    # Get recent ratings that actually have a review text
    ratings = (
        Rating.query.filter(Rating.review_text.isnot(None), Rating.review_text != "")
        .order_by(Rating.created_at.desc())
        .limit(20)
        .all()
    )
    
    data = []
    for r in ratings:
        data.append({
            "id": r.id,
            "vendor_name": r.vendor.name if r.vendor else "Unknown Vendor",
            "city_name": r.vendor.city.name if r.vendor and r.vendor.city else "Unknown",
            "city_slug": r.vendor.city.slug if r.vendor and r.vendor.city else "",
            "rating_value": r.rating_value,
            "review_text": r.review_text,
            "author_name": r.author_name or "Anonymous",
            "created_at": r.created_at.isoformat() if r.created_at else None
        })
    return jsonify({"reviews": data}), 200

# -------------------- SITE REVIEWS --------------------
from app.models import SiteReview

@main_bp.route("/site-reviews", methods=["GET"])
def get_site_reviews():
    reviews = (
        SiteReview.query.filter_by(status="approved")
        .order_by(SiteReview.created_at.desc())
        .limit(20)
        .all()
    )
    
    data = []
    for r in reviews:
        data.append({
            "id": r.id,
            "author_name": r.author_name,
            "review_text": r.review_text,
            "rating_value": r.rating_value,
            "created_at": r.created_at.isoformat() if r.created_at else None
        })
    return jsonify({"site_reviews": data}), 200

@main_bp.route("/site-reviews", methods=["POST"])
def submit_site_review():
    data = request.json or {}
    author_name = data.get("author_name", "").strip()
    review_text = data.get("review_text", "").strip()
    rating_value = data.get("rating_value")

    if not author_name or not review_text or not rating_value:
        return jsonify({"success": False, "error": "All fields are required"}), 400

    try:
        rating_value = float(rating_value)
        if rating_value < 1 or rating_value > 5:
            raise ValueError
    except:
        return jsonify({"success": False, "error": "Invalid rating value"}), 400

    new_review = SiteReview(
        author_name=author_name,
        review_text=review_text,
        rating_value=rating_value,
        status="approved" # Auto-approve for now
    )
    
    db.session.add(new_review)
    db.session.commit()

    return jsonify({"success": True, "message": "Thank you for your review!"}), 201

@main_bp.route("/submit-reel", methods=["POST"])
def submit_reel():
    author_name = request.form.get("author_name")
    title = request.form.get("title")
    video_file = request.files.get("video")

    if not author_name or not title or not video_file:
        return jsonify({"success": False, "error": "Missing required fields"}), 400

    if video_file.filename == '':
        return jsonify({"success": False, "error": "No selected file"}), 400

    filename = secure_filename(video_file.filename)
    unique_filename = f"{uuid.uuid4().hex}_{filename}"
    upload_folder = os.path.join(current_app.root_path, "static", "uploads", "reels")
    os.makedirs(upload_folder, exist_ok=True)
    file_path = os.path.join(upload_folder, unique_filename)
    video_file.save(file_path)

    new_reel = ReelSubmission(
        title=title,
        author_name=author_name,
        video_filename=unique_filename,
        status="pending"
    )
    db.session.add(new_reel)
    db.session.commit()

    return jsonify({"success": True, "message": "Video submitted for review!"})


@main_bp.route("/reels", methods=["GET"])
def get_reels():
    reels = ReelSubmission.query.filter_by(status="approved").order_by(ReelSubmission.created_at.desc()).all()
    results = []
    for r in reels:
        results.append({
            "id": r.id,
            "title": r.title,
            "author": r.author_name,
            # We assume flask is running on 5000 and can serve static files
            "videoUrl": f"http://127.0.0.1:5000/static/uploads/reels/{r.video_filename}",
            "views": r.views
        })
    return jsonify({"reels": results})