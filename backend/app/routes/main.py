from flask import Blueprint, jsonify, request, current_app
from urllib.parse import urlparse, parse_qs
import re
import requests

from app import db, cache
from app.models import (
    City, Vendor, VendorSubmission, Rating, ReelSubmission, Category, AppBanner,
    AppNotification, ContactMessage, Report, Favorite, REPORT_TARGETS,
)
from app.helpers import (
    get_settings, public_vendor_query, recompute_vendor_rating, haversine_km,
    get_optional_user,
)
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

    counts = dict(
        db.session.query(Vendor.city_id, db.func.count(Vendor.id))
        .filter(db.or_(Vendor.verified_status.is_(None), Vendor.verified_status != "rejected"))
        .group_by(Vendor.city_id)
        .all()
    )

    results = []
    for city in cities:
        results.append({
            "id": city.id,
            "name": city.name,
            "slug": city.slug,
            "state": city.state,
            "lat": city.lat,
            "lng": city.lng,
            "vendor_count": counts.get(city.id, 0),
            "desc": city_descriptions.get(city.slug, "Explore local food and hidden gems.")
        })

    return jsonify({"cities": results})

@main_bp.route("/seed", methods=["GET"])
def seed_database():
    try:
        jaipur = City.query.filter_by(slug='jaipur').first()
        if not jaipur:
            jaipur = City(name='Jaipur', slug='jaipur', state='Rajasthan', country='India', lat=26.9124, lng=75.7873)
            db.session.add(jaipur)

        delhi = City.query.filter_by(slug='delhi').first()
        if not delhi:
            delhi = City(name='Delhi', slug='delhi', state='Delhi', country='India', lat=28.7041, lng=77.1025)
            db.session.add(delhi)
        
        mumbai = City.query.filter_by(slug='mumbai').first()
        if not mumbai:
            mumbai = City(name='Mumbai', slug='mumbai', state='Maharashtra', country='India', lat=19.0760, lng=72.8777)
            db.session.add(mumbai)

        db.session.commit()
        return jsonify({"message": "Database seeded successfully with Jaipur, Delhi, and Mumbai!"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
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
        
    recent_vendors = public_vendor_query().order_by(Vendor.id.desc()).limit(10).all()
    
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
def _search_filter(term):
    like = f"%{term}%"
    return db.or_(
        Vendor.name.ilike(like),
        Vendor.area.ilike(like),
        Vendor.locality.ilike(like),
        Vendor.landmark.ilike(like),
        Vendor.specialty_dish.ilike(like),
        Vendor.cuisine_type.ilike(like),
        Vendor.food_category.ilike(like),
        Vendor.food_subcategories.ilike(like),
    )


def _category_filter(category):
    """Match a category name or slug against both free-text and data-key columns."""
    terms = {category}
    cat = Category.query.filter(
        db.or_(Category.slug == category.lower(), Category.name.ilike(category))
    ).first()
    if cat:
        terms.update({cat.name, cat.slug, cat.slug.replace("-", "_")})
    terms.add(category.lower().replace(" ", "_").replace("-", "_"))
    clauses = []
    for t in terms:
        clauses.append(Vendor.food_category.ilike(f"%{t}%"))
        clauses.append(Vendor.cuisine_type.ilike(f"%{t}%"))
    return db.or_(*clauses)


@main_bp.route("/search", methods=["GET"])
def search_vendors():
    q = request.args.get("q", "").strip()
    city_slug = request.args.get("city", "").strip()
    limit = min(request.args.get("limit", 50, type=int), 100)
    if not q:
        return jsonify({"results": [], "count": 0})

    query = public_vendor_query().filter(_search_filter(q))
    if city_slug and city_slug != "all":
        city = City.query.filter_by(slug=city_slug).first()
        if city:
            query = query.filter(Vendor.city_id == city.id)

    vendors = query.order_by(Vendor.avg_rating.desc().nullslast(), Vendor.id.asc()).limit(limit).all()
    results = [v.to_dict() for v in vendors]
    return jsonify({"results": results, "count": len(results)})


# -------------------- VENDORS API --------------------
@main_bp.route("/vendors", methods=["GET"])
def get_vendors():
    city_slug = request.args.get("city", "jaipur").strip()
    category = request.args.get("category", "").strip()
    area = request.args.get("area", "").strip()
    is_hidden_gem = request.args.get("is_hidden_gem", "").strip().lower()
    is_famous = request.args.get("is_famous", "").strip().lower()
    search_q = request.args.get("q", "").strip()
    sort = request.args.get("sort", "rating").strip().lower()
    lat = request.args.get("lat", type=float)
    lng = request.args.get("lng", type=float)
    limit = min(request.args.get("limit", 100, type=int), 500)
    offset = max(request.args.get("offset", 0, type=int), 0)

    query = public_vendor_query()

    if city_slug and city_slug != "all":
        city = City.query.filter_by(slug=city_slug).first()
        if city:
            query = query.filter_by(city_id=city.id)

    if category and category != 'All':
        query = query.filter(_category_filter(category))

    if area and area != 'All':
        query = query.filter(Vendor.area.ilike(f"%{area}%"))

    if is_hidden_gem in ('true', '1', 'yes'):
        query = query.filter(db.or_(Vendor.is_hidden_gem == True, Vendor.hidden_gem_candidate == True))

    if is_famous in ('true', '1', 'yes'):
        query = query.filter(Vendor.is_famous == True)

    if search_q:
        query = query.filter(_search_filter(search_q))

    total = query.count()

    if sort == "distance" and lat is not None and lng is not None:
        # Distance sort happens in Python; city-scoped vendor lists are small.
        vendors = query.all()
        with_coords = [v for v in vendors if v.lat is not None and v.lng is not None]
        without = [v for v in vendors if v.lat is None or v.lng is None]
        with_coords.sort(key=lambda v: haversine_km(lat, lng, v.lat, v.lng))
        vendors = (with_coords + without)[offset:offset + limit]
    else:
        if sort == "newest":
            order = [Vendor.created_at.desc().nullslast(), Vendor.id.desc()]
        elif sort == "name":
            order = [Vendor.name.asc()]
        elif sort == "popular":
            order = [Vendor.total_ratings.desc().nullslast(), Vendor.avg_rating.desc().nullslast()]
        else:
            order = [Vendor.avg_rating.desc().nullslast(), Vendor.id.asc()]
        vendors = query.order_by(*order).offset(offset).limit(limit).all()

    results = []
    for v in vendors:
        d = v.to_dict()
        if lat is not None and lng is not None and v.lat is not None and v.lng is not None:
            d["distance_km"] = round(haversine_km(lat, lng, v.lat, v.lng), 2)
        results.append(d)

    return jsonify({"vendors": results, "count": len(results), "total": total, "offset": offset})


@main_bp.route("/vendors/hidden-gems", methods=["GET"])
def get_hidden_gems():
    city_slug = request.args.get("city", "").strip()
    limit = min(request.args.get("limit", 200, type=int), 500)
    query = public_vendor_query().filter(
        db.or_(Vendor.is_hidden_gem == True, Vendor.hidden_gem_candidate == True)
    )
    if city_slug and city_slug != "all":
        city = City.query.filter_by(slug=city_slug).first()
        if city:
            query = query.filter(Vendor.city_id == city.id)
    gems = query.order_by(Vendor.avg_rating.desc().nullslast()).limit(limit).all()
    return jsonify({"hidden_gems": [v.to_dict() for v in gems], "count": len(gems)})


@main_bp.route("/vendors/nearby", methods=["GET"])
def get_nearby_vendors():
    lat = request.args.get("lat", type=float)
    lng = request.args.get("lng", type=float)
    radius = request.args.get("radius", default=10.0, type=float) # km
    limit = min(request.args.get("limit", 50, type=int), 150)

    query = public_vendor_query().filter(Vendor.lat.isnot(None), Vendor.lng.isnot(None))

    if lat is None or lng is None:
        vendors = query.limit(limit).all()
        return jsonify({"vendors": [v.to_dict() for v in vendors]})

    # Cheap bounding box first (1 deg lat ~ 111 km), then exact distance.
    delta = radius / 111.0 + 0.01
    candidates = query.filter(
        Vendor.lat.between(lat - delta, lat + delta),
        Vendor.lng.between(lng - delta * 1.5, lng + delta * 1.5),
    ).all()

    nearby = []
    for v in candidates:
        dist = haversine_km(lat, lng, v.lat, v.lng)
        if dist <= radius:
            d = v.to_dict()
            d["distance_km"] = round(dist, 2)
            nearby.append(d)
    nearby.sort(key=lambda d: d["distance_km"])

    return jsonify({"vendors": nearby[:limit], "count": min(len(nearby), limit), "radius_km": radius})


@main_bp.route("/trails", methods=["GET"])
def get_food_trails():
    trails = [
        {
            "id": 1,
            "title": "Walled City Old Heritage Food Trail",
            "slug": "walled-city-heritage-trail",
            "description": "Explore 100+ year old street food legends inside Jaipur's Pink City.",
            "duration": "2.5 hours",
            "budget": "₹150 - ₹250",
            "stops_count": 5,
            "stops": ["Lassiwala Shop 312", "Sahu Ki Chai", "Laxmi Misthan Bhandar", "PP Samosa", "Pandit Kulfi"],
            "image_url": "https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=800"
        },
        {
            "id": 2,
            "title": "Masala Chowk Food Court Safari",
            "slug": "masala-chowk-safari",
            "description": "All famous Jaipur street-food stalls in one beautiful garden food court.",
            "duration": "1.5 hours",
            "budget": "₹100 - ₹200",
            "stops_count": 4,
            "stops": ["Gopal Singh Patasi", "Sethani Ka Dhaba", "Mahaveer Rabri Bhandar", "Samrat Street Food"],
            "image_url": "https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=800"
        }
    ]
    return jsonify({"trails": trails})


@main_bp.route("/guides", methods=["GET"])
def get_city_guides():
    guides = [
        {
            "id": 1,
            "title": "Ultimate Jaipur Kachori & Chai Guide",
            "slug": "jaipur-kachori-chai-guide",
            "summary": "Where locals go for authentic Pyaz Kachori, Mawa Kachori, and Kulhad Chai.",
            "category": "Breakfast & Tea",
            "vendor_count": 8,
            "image_url": "https://images.unsplash.com/photo-1576092768241-dec231879fc3?q=80&w=800"
        },
        {
            "id": 2,
            "title": "Top 6 Underrated Hidden Gems of Jaipur",
            "slug": "jaipur-hidden-gems-guide",
            "summary": "Community-discovered street-food secret spots you won't find on tourist apps.",
            "category": "Hidden Gems",
            "vendor_count": 6,
            "image_url": "https://images.unsplash.com/photo-1589301760014-d929f39ce9b1?q=80&w=800"
        }
    ]
    return jsonify({"guides": guides})



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
        public_vendor_query()
        .filter(Vendor.city_id == city.id)
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
    vendor = public_vendor_query().filter(Vendor.id == vendor_id).first_or_404()
    user = get_optional_user()

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
            "user_id": r.user_id,
            "is_mine": bool(user and r.user_id == user.id),
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in reviews
    ]

    same_city = public_vendor_query().filter(Vendor.city_id == vendor.city_id, Vendor.id != vendor.id)
    if vendor.lat is not None and vendor.lng is not None:
        candidates = same_city.filter(Vendor.lat.isnot(None), Vendor.lng.isnot(None)).all()
        candidates.sort(key=lambda n: haversine_km(vendor.lat, vendor.lng, n.lat, n.lng))
        nearby = candidates[:4]
    else:
        nearby = same_city.order_by(Vendor.avg_rating.desc().nullslast()).limit(4).all()
    nearby_data = []
    for n in nearby:
        item = {
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
        if vendor.lat is not None and n.lat is not None:
            item["distance_km"] = round(haversine_km(vendor.lat, vendor.lng, n.lat, n.lng), 2)
        nearby_data.append(item)

    is_favorite = bool(
        user and Favorite.query.filter_by(user_id=user.id, vendor_id=vendor.id).first()
    )

    return jsonify({
        "is_favorite": is_favorite,
        "vendor": {
            # Full field set first; the explicit keys below keep the web page's contract.
            **vendor.to_dict(),
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
    data = request.get_json(silent=True) or request.form
    user = get_optional_user()

    try:
        city_id = int(data.get("city_id") or 0)
    except (TypeError, ValueError):
        city_id = 0
    if city_id == 0 or not db.session.get(City, city_id):
        return jsonify({"success": False, "error": "City ID is required"}), 400

    stall_name = (data.get("stall_name") or "").strip()
    if not stall_name:
        return jsonify({"success": False, "error": "Stall name is required"}), 400
    cuisine_type = data.get("cuisine_type")
    description = data.get("description")
    google_maps_url = data.get("google_maps_url")
    approx_address = data.get("approx_address")
    estimated_price = data.get("estimated_price")
    submitted_by_name = data.get("submitted_by_name") or (user.name if user else None)
    submitted_by_email = data.get("submitted_by_email") or (user.email if user else None)

    rating = None
    try:
        if data.get("rating") not in (None, ""):
            rating = max(1.0, min(5.0, float(data.get("rating"))))
    except (TypeError, ValueError):
        rating = None

    # First try to get lat/lng directly from the request body (sent by mobile app)
    lat = None
    lng = None
    try:
        if data.get("lat") and data.get("lng"):
            lat = float(data.get("lat"))
            lng = float(data.get("lng"))
    except (TypeError, ValueError):
        pass

    # If not provided directly, try to parse from google_maps_url
    if (lat is None or lng is None) and google_maps_url:
        try:
            if "goo.gl" in google_maps_url or "maps.app.goo.gl" in google_maps_url:
                try:
                    resp = requests.head(google_maps_url, allow_redirects=True, timeout=5)
                    google_maps_url = resp.url
                except Exception as e:
                    print(f"Short URL resolution failed: {e}")

            match = re.search(r'@(-?\d+\.\d+),(-?\d+\.\d+)', google_maps_url)
            if match:
                lat = float(match.group(1))
                lng = float(match.group(2))

            if lat is None:
                match = re.search(r'!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)', google_maps_url)
                if match:
                    lat = float(match.group(1))
                    lng = float(match.group(2))

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
        rating=rating,
        user_id=user.id if user else data.get("user_id"),
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

    return jsonify({
        "success": True,
        "id": submission.id,
        "message": "Thank you! Your hidden stall suggestion is submitted.",
    })

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

    vendor = public_vendor_query().filter(Vendor.id == vendor_id).first_or_404()
    user = get_optional_user()

    if not user and not get_settings().get("allow_guest_reviews", True):
        return jsonify({"success": False, "error": "Please log in to post a review"}), 401

    user_ip = request.remote_addr
    if user and not author_name:
        author_name = user.name

    # A logged-in user keeps a single review per vendor; rating again updates it.
    existing = Rating.query.filter_by(vendor_id=vendor.id, user_id=user.id).first() if user else None
    if existing:
        existing.rating_value = rating_val
        existing.review_text = review_text or None
        existing.author_name = author_name or existing.author_name
        review = existing
    else:
        review = Rating(
            vendor_id=vendor.id,
            rating_value=rating_val,
            user_ip=user_ip,
            user_id=user.id if user else None,
            review_text=review_text if review_text else None,
            author_name=author_name if author_name else None
        )
        db.session.add(review)
    db.session.flush()

    recompute_vendor_rating(vendor)
    db.session.commit()

    return jsonify({
        "success": True,
        "updated": existing is not None,
        "avg_rating": vendor.avg_rating,
        "total_ratings": vendor.total_ratings,
        "review": {
            "id": review.id,
            "rating_value": review.rating_value,
            "review_text": review.review_text,
            "author_name": review.author_name or "Anonymous",
            "user_id": review.user_id,
            "is_mine": bool(user),
            "created_at": review.created_at.isoformat() if review.created_at else None,
        },
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
            "vendor_id": r.vendor_id,
            "vendor_image_url": r.vendor.image_url if r.vendor else None,
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
            "videoUrl": f"{request.host_url.rstrip('/')}/static/uploads/reels/{r.video_filename}",
            "views": r.views
        })
    return jsonify({"reels": results})


# -------------------- MOBILE APP CONFIG --------------------
@main_bp.route("/app/config", methods=["GET"])
def app_config():
    """Single bootstrap call for the mobile app: settings, banners, categories."""
    banners = (
        AppBanner.query.filter_by(is_active=True)
        .order_by(AppBanner.sort_order.asc(), AppBanner.id.desc())
        .all()
    )
    categories = (
        Category.query.filter_by(is_active=True)
        .order_by(Category.sort_order.asc(), Category.name.asc())
        .all()
    )
    return jsonify({
        "settings": get_settings(),
        "banners": [b.to_dict() for b in banners],
        "categories": [c.to_dict() for c in categories],
    })


@main_bp.route("/categories", methods=["GET"])
def list_categories():
    categories = (
        Category.query.filter_by(is_active=True)
        .order_by(Category.sort_order.asc(), Category.name.asc())
        .all()
    )
    return jsonify({"categories": [c.to_dict() for c in categories]})


@main_bp.route("/notifications", methods=["GET"])
def list_notifications():
    city_slug = request.args.get("city", "").strip()
    targets = ["all"]
    if city_slug:
        targets.append(f"city:{city_slug}")
    items = (
        AppNotification.query.filter(AppNotification.target.in_(targets))
        .order_by(AppNotification.created_at.desc())
        .limit(50)
        .all()
    )
    return jsonify({"notifications": [n.to_dict() for n in items]})


# -------------------- CONTACT / SUPPORT --------------------
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@main_bp.route("/contact", methods=["POST"])
def submit_contact():
    data = request.get_json(silent=True) or request.form
    user = get_optional_user()
    name = (data.get("name") or (user.name if user else "")).strip()
    email = (data.get("email") or (user.email if user else "")).strip()
    subject = (data.get("subject") or "").strip()
    message = (data.get("message") or "").strip()

    if not name or not email or not message:
        return jsonify({"success": False, "error": "Name, email and message are required"}), 400
    if not EMAIL_RE.match(email):
        return jsonify({"success": False, "error": "Please enter a valid email address"}), 400
    if len(message) > 5000:
        return jsonify({"success": False, "error": "Message is too long"}), 400

    msg = ContactMessage(
        name=name[:100],
        email=email[:150],
        subject=subject[:200] or None,
        message=message,
        source="app" if data.get("source") == "app" else "web",
        user_id=user.id if user else None,
    )
    db.session.add(msg)
    db.session.commit()
    return jsonify({"success": True, "message": "Thanks! Our team will get back to you soon."}), 201


# -------------------- REPORT CONTENT --------------------
@main_bp.route("/reports", methods=["POST"])
def submit_report():
    data = request.get_json(silent=True) or {}
    user = get_optional_user()
    target_type = (data.get("target_type") or "").strip().lower()
    reason = (data.get("reason") or "").strip()
    details = (data.get("details") or "").strip()

    try:
        target_id = int(data.get("target_id"))
    except (TypeError, ValueError):
        target_id = None

    if target_type not in REPORT_TARGETS or not target_id or not reason:
        return jsonify({"success": False, "error": "target_type, target_id and reason are required"}), 400

    exists = {
        "vendor": lambda: db.session.get(Vendor, target_id),
        "review": lambda: db.session.get(Rating, target_id),
        "reel": lambda: db.session.get(ReelSubmission, target_id),
    }[target_type]()
    if not exists:
        return jsonify({"success": False, "error": "The reported item no longer exists"}), 404

    report = Report(
        target_type=target_type,
        target_id=target_id,
        reason=reason[:100],
        details=details[:2000] or None,
        reporter_user_id=user.id if user else None,
        reporter_name=(user.name if user else (data.get("reporter_name") or "").strip()[:100]) or None,
    )
    db.session.add(report)
    db.session.commit()
    return jsonify({"success": True, "message": "Thanks for letting us know. Our moderators will review it."}), 201