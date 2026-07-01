from flask import Blueprint, jsonify, request, current_app
from urllib.parse import urlparse, parse_qs
import re
import requests

from app import db, cache
from app.models import City, Vendor, VendorSubmission, Rating

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
    
    if not rating_val:
        return jsonify({"success": False, "error": "Rating value is required"}), 400
        
    try:
        rating_val = float(rating_val)
        if rating_val < 1 or rating_val > 5:
            raise ValueError
    except:
        return jsonify({"success": False, "error": "Invalid rating value"}), 400

    vendor = Vendor.query.get_or_404(vendor_id)
    
    # Optional: Get user IP for tracking
    user_ip = request.remote_addr
    
    new_rating = Rating(
        vendor_id=vendor.id,
        rating_value=rating_val,
        user_ip=user_ip
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