from flask import Blueprint, jsonify, request, current_app
from urllib.parse import urljoin, urlparse
from datetime import datetime, timedelta
import re
import requests

from app import db, cache, limiter
from app.models import (
    City, Vendor, VendorSubmission, Rating, ReelSubmission, Category, AppBanner, SiteReview,
    AppNotification, ContactMessage, Report, Favorite, SubscriptionPlan, Trail, REPORT_TARGETS,
)
from app.helpers import (
    get_settings, public_vendor_query, recompute_vendor_rating, haversine_km, active_city_ids_query,
    get_optional_user, token_required, category_filter, arg_float, arg_int, optional_float,
    valid_lat_lng, clean_text, client_ip, user_or_ip_key, EMAIL_RE,
)
from app.serializers import (
    serialize_vendor, serialize_trail, locks_apply, vendor_is_locked, unlocked_vendor_clause,
)
from app.payments import payments_available
from app.utils import push_available
import os
import uuid

# ✅ ML import
from app.ml_model import build_recommendation_model, get_recommendations

main_bp = Blueprint("main", __name__)

REVIEW_TEXT_MAX = 1000
AUTHOR_NAME_MAX = 100


@cache.memoize(timeout=3600)
def get_cached_recommendations(city_id, vendor_list_tuple):
    # We use a tuple for vendor_list because cache keys must be hashable
    vendor_list = [dict(t) for t in vendor_list_tuple]
    if not vendor_list:
        return []
    try:
        df, similarity = build_recommendation_model(vendor_list)
        return get_recommendations(vendor_list[0]["id"], df, similarity)
    except Exception as e:
        print("ML error:", e)
        return []


def _active_cities():
    return (
        City.query.filter(db.or_(City.is_active == True, City.is_active.is_(None)))  # noqa: E712
        .order_by(City.sort_order.asc(), City.name.asc())
        .all()
    )


def _city_by_slug(slug):
    return City.query.filter(City.slug == (slug or "").strip().lower()).first()


# -------------------- HOME --------------------
@main_bp.route("/cities", methods=["GET"])
def index():
    cities = _active_cities()

    counts = dict(
        db.session.query(Vendor.city_id, db.func.count(Vendor.id))
        .filter(Vendor.id.in_(public_vendor_query().with_entities(Vendor.id)))
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
            "description": city.description,
            "image_url": city.image_url,
            "sort_order": city.sort_order or 0,
            # Older clients read "desc"; null means "show nothing".
            "desc": city.description,
        })

    return jsonify({"cities": results})


@main_bp.route("/home", methods=["GET"])
def home_feed():
    viewer = get_optional_user()
    city_results = [
        {"id": c.id, "name": c.name, "slug": c.slug, "desc": c.description,
         "description": c.description, "image_url": c.image_url}
        for c in _active_cities()
    ]
    recent_vendors = public_vendor_query().order_by(Vendor.id.desc()).limit(10).all()
    return jsonify({
        "cities": city_results,
        "recent_vendors": [serialize_vendor(v, viewer) for v in recent_vendors],
    })


# -------------------- SEARCH --------------------
def _search_filter(term, protect_premium):
    """Free-text match. Fields hidden on locked cards (name, landmark, dish...) never match a locked vendor."""
    like = f"%{term}%"
    card_fields = db.or_(
        Vendor.area.ilike(like),
        Vendor.cuisine_type.ilike(like),
        Vendor.food_category.ilike(like),
        Vendor.food_subcategories.ilike(like),
    )
    private_fields = db.or_(
        Vendor.name.ilike(like),
        Vendor.locality.ilike(like),
        Vendor.landmark.ilike(like),
        Vendor.specialty_dish.ilike(like),
    )
    if protect_premium:
        private_fields = db.and_(unlocked_vendor_clause(), private_fields)
    return db.or_(card_fields, private_fields)


@main_bp.route("/search", methods=["GET"])
def search_vendors():
    viewer = get_optional_user()
    q = request.args.get("q", "").strip()[:100]
    city_slug = request.args.get("city", "").strip()
    limit = arg_int("limit", 50, 1, 100)
    if not q:
        return jsonify({"results": [], "count": 0})

    query = public_vendor_query().filter(_search_filter(q, locks_apply(viewer)))
    if city_slug and city_slug != "all":
        city = _city_by_slug(city_slug)
        if city:
            query = query.filter(Vendor.city_id == city.id)

    vendors = query.order_by(Vendor.avg_rating.desc().nullslast(), Vendor.id.asc()).limit(limit).all()
    results = [serialize_vendor(v, viewer) for v in vendors]
    return jsonify({"results": results, "count": len(results)})


# -------------------- VENDORS API --------------------
@main_bp.route("/vendors", methods=["GET"])
def get_vendors():
    viewer = get_optional_user()
    city_slug = request.args.get("city", "jaipur").strip()
    category = request.args.get("category", "").strip()[:100]
    area = request.args.get("area", "").strip()[:150]
    is_hidden_gem = request.args.get("is_hidden_gem", "").strip().lower()
    is_famous = request.args.get("is_famous", "").strip().lower()
    search_q = request.args.get("q", "").strip()[:100]
    sort = request.args.get("sort", "rating").strip().lower()
    lat = arg_float("lat", -90, 90)
    lng = arg_float("lng", -180, 180)
    limit = arg_int("limit", 100, 1, 500)
    offset = arg_int("offset", 0, 0, 1_000_000)

    query = public_vendor_query()

    if city_slug and city_slug != "all":
        city = _city_by_slug(city_slug)
        if city:
            query = query.filter_by(city_id=city.id)

    if category and category != 'All':
        query = query.filter(category_filter(category))

    if area and area != 'All':
        query = query.filter(Vendor.area.ilike(f"%{area}%"))

    if is_hidden_gem in ('true', '1', 'yes'):
        query = query.filter(db.or_(Vendor.is_hidden_gem == True, Vendor.hidden_gem_candidate == True))

    if is_famous in ('true', '1', 'yes'):
        query = query.filter(Vendor.is_famous == True)

    if search_q:
        query = query.filter(_search_filter(search_q, locks_apply(viewer)))

    total = query.count()
    has_origin = lat is not None and lng is not None

    if sort == "distance" and has_origin:
        # Distance sort happens in Python; city-scoped vendor lists are small. Locked vendors have no
        # public location, so they go after every vendor with known coordinates.
        vendors = query.all()
        with_coords = [v for v in vendors if v.lat is not None and v.lng is not None and not vendor_is_locked(v, viewer)]
        placed = {v.id for v in with_coords}
        without = [v for v in vendors if v.id not in placed]
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
        distance = None
        if has_origin and v.lat is not None and v.lng is not None:
            distance = haversine_km(lat, lng, v.lat, v.lng)
        results.append(serialize_vendor(v, viewer, distance_km=distance))

    return jsonify({"vendors": results, "count": len(results), "total": total, "offset": offset})


@main_bp.route("/vendors/hidden-gems", methods=["GET"])
def get_hidden_gems():
    viewer = get_optional_user()
    city_slug = request.args.get("city", "").strip()
    limit = arg_int("limit", 200, 1, 500)
    query = public_vendor_query().filter(
        db.or_(Vendor.is_hidden_gem == True, Vendor.hidden_gem_candidate == True)
    )
    if city_slug and city_slug != "all":
        city = _city_by_slug(city_slug)
        if city:
            query = query.filter(Vendor.city_id == city.id)
    gems = query.order_by(Vendor.avg_rating.desc().nullslast()).limit(limit).all()
    return jsonify({"hidden_gems": [serialize_vendor(v, viewer) for v in gems], "count": len(gems)})


@main_bp.route("/vendors/nearby", methods=["GET"])
def get_nearby_vendors():
    viewer = get_optional_user()
    lat = arg_float("lat", -90, 90)
    lng = arg_float("lng", -180, 180)
    radius = arg_float("radius", 0.1, 50, default=10.0)  # km
    limit = arg_int("limit", 50, 1, 150)

    # Map payload: locked vendors are never included (their coordinates are premium content).
    query = public_vendor_query().filter(Vendor.lat.isnot(None), Vendor.lng.isnot(None))
    if locks_apply(viewer):
        query = query.filter(unlocked_vendor_clause())

    if lat is None or lng is None:
        vendors = query.limit(limit).all()
        results = [serialize_vendor(v, viewer) for v in vendors]
        return jsonify({"vendors": results, "count": len(results)})

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
            nearby.append((dist, v))
    nearby.sort(key=lambda pair: pair[0])
    results = [serialize_vendor(v, viewer, distance_km=d) for d, v in nearby[:limit]]

    return jsonify({"vendors": results, "count": len(results), "radius_km": radius})


# -------------------- FOOD TRAILS --------------------
def _public_trail_query():
    return Trail.query.filter(Trail.is_active == True, Trail.city_id.in_(active_city_ids_query()))  # noqa: E712


@main_bp.route("/trails", methods=["GET"])
def get_food_trails():
    viewer = get_optional_user()
    query = _public_trail_query()
    city_slug = request.args.get("city", "").strip()
    if city_slug and city_slug != "all":
        city = _city_by_slug(city_slug)
        if not city:
            return jsonify({"trails": [], "count": 0})
        query = query.filter(Trail.city_id == city.id)
    trails = query.order_by(Trail.sort_order.asc(), Trail.id.asc()).all()
    return jsonify({"trails": [serialize_trail(t, viewer) for t in trails], "count": len(trails)})


@main_bp.route("/trails/<int:trail_id>", methods=["GET"])
def get_food_trail(trail_id):
    trail = _public_trail_query().filter(Trail.id == trail_id).first_or_404()
    data = serialize_trail(trail, get_optional_user())
    # The trail object itself, also under "trail" (same convention as the vendor detail's "vendor").
    return jsonify({**data, "trail": data})


# -------------------- CITY PAGE --------------------
@main_bp.route("/city/<slug>", methods=["GET"])
def city_page(slug):
    viewer = get_optional_user()
    city = City.query.filter(
        City.slug == slug.lower(), db.or_(City.is_active == True, City.is_active.is_(None))  # noqa: E712
    ).first_or_404()

    vendors = (
        public_vendor_query()
        .filter(Vendor.city_id == city.id)
        .order_by(Vendor.avg_rating.desc().nullslast(), Vendor.id.asc())
        .all()
    )
    vendor_data = [serialize_vendor(v, viewer) for v in vendors]

    # ✅ ML PART: similar vendors by cuisine + description (ids only; serialized per viewer below)
    vendor_list = [
        {
            "id": v.id,
            "cuisine_type": v.cuisine_type or "",
            "description": v.description or "",
        }
        for v in vendors
    ]

    # Convert list of dicts to tuple of tuples for caching
    vendor_list_tuple = tuple(tuple(d.items()) for d in vendor_list)
    by_id = {v.id: v for v in vendors}
    recommendations = [
        serialize_vendor(by_id[i], viewer)
        for i in get_cached_recommendations(city.id, vendor_list_tuple) if i in by_id
    ]

    return jsonify({
        "city": {
            "id": city.id,
            "name": city.name,
            "slug": city.slug,
            "lat": city.lat,
            "lng": city.lng,
            "description": city.description,
            "image_url": city.image_url,
        },
        "vendors": vendor_data,
        "recommendations": recommendations,
        "google_maps_api_key": current_app.config.get("GOOGLE_MAPS_API_KEY"),
    })


# -------------------- VENDOR DETAIL --------------------
def _review_dict(r, viewer):
    return {
        "id": r.id,
        "rating_value": r.rating_value,
        "review_text": r.review_text,
        "author_name": r.author_name or "Anonymous",
        "is_mine": bool(viewer and r.user_id == viewer.id),
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


@main_bp.route("/vendors/<int:vendor_id>", methods=["GET"])
def get_vendor_detail(vendor_id):
    vendor = public_vendor_query().filter(Vendor.id == vendor_id).first_or_404()
    user = get_optional_user()

    is_favorite = bool(
        user and Favorite.query.filter_by(user_id=user.id, vendor_id=vendor.id).first()
    )

    if vendor_is_locked(vendor, user):
        # 200 with the locked preview only: no reviews, no "nearby" (it would reveal the location).
        return jsonify({
            "is_favorite": is_favorite,
            "vendor": serialize_vendor(vendor, user, detail=True),
            "reviews": [],
            "nearby": [],
        })

    reviews = (
        Rating.query.filter_by(vendor_id=vendor.id)
        .order_by(Rating.created_at.desc())
        .all()
    )

    same_city = public_vendor_query().filter(Vendor.city_id == vendor.city_id, Vendor.id != vendor.id)
    if locks_apply(user):
        same_city = same_city.filter(unlocked_vendor_clause())
    nearby_data = []
    if vendor.lat is not None and vendor.lng is not None:
        candidates = same_city.filter(Vendor.lat.isnot(None), Vendor.lng.isnot(None)).all()
        candidates.sort(key=lambda n: haversine_km(vendor.lat, vendor.lng, n.lat, n.lng))
        for n in candidates[:4]:
            nearby_data.append(serialize_vendor(n, user, distance_km=haversine_km(vendor.lat, vendor.lng, n.lat, n.lng)))
    else:
        for n in same_city.order_by(Vendor.avg_rating.desc().nullslast()).limit(4).all():
            nearby_data.append(serialize_vendor(n, user))

    return jsonify({
        "is_favorite": is_favorite,
        "vendor": {
            **serialize_vendor(vendor, user, detail=True),
            "city": {
                "id": vendor.city.id,
                "name": vendor.city.name,
                "slug": vendor.city.slug,
            } if vendor.city else None,
        },
        "reviews": [_review_dict(r, user) for r in reviews],
        "nearby": nearby_data,
    })


# -------------------- SUBMIT VENDOR --------------------
SHORT_MAP_HOSTS = {"goo.gl", "maps.app.goo.gl"}


def _is_google_host(host):
    host = (host or "").lower()
    return host in ("google.com", "google.co.in") or host.endswith((".google.com", ".google.co.in"))


def _resolve_short_maps_url(url):
    """Follow a goo.gl / maps.app.goo.gl link (https only, at most 3 hops, Google hosts only)."""
    current = url
    for _ in range(3):
        try:
            resp = requests.head(current, allow_redirects=False, timeout=5)
        except requests.RequestException:
            return url
        location = resp.headers.get("Location")
        if resp.status_code not in (301, 302, 303, 307, 308) or not location:
            break
        nxt = urljoin(current, location)
        parsed = urlparse(nxt)
        if parsed.scheme != "https" or not (parsed.hostname in SHORT_MAP_HOSTS or _is_google_host(parsed.hostname)):
            return url
        current = nxt
        if _is_google_host(parsed.hostname):
            break
    return current if _is_google_host(urlparse(current).hostname) else url


def _coords_from_maps_url(url):
    patterns = (r'@(-?\d+\.\d+),(-?\d+\.\d+)', r'!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)', r'[?&](?:query|q)=(-?\d+\.\d+),\s*(-?\d+\.\d+)')
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            try:
                lat, lng = optional_float(match.group(1)), optional_float(match.group(2))
            except ValueError:
                continue
            if valid_lat_lng(lat, lng):
                return lat, lng
    return None, None


@main_bp.route("/submit-vendor", methods=["POST"])
@limiter.limit("10 per hour", key_func=user_or_ip_key)
def submit_vendor():
    data = request.get_json(silent=True) or request.form
    user = get_optional_user(for_write=True)

    try:
        city_id = int(data.get("city_id") or 0)
    except (TypeError, ValueError):
        city_id = 0
    if city_id == 0 or not db.session.get(City, city_id):
        return jsonify({"success": False, "error": "City ID is required", "code": "VALIDATION"}), 400

    stall_name = clean_text(data.get("stall_name"), 200)
    if not stall_name:
        return jsonify({"success": False, "error": "Stall name is required", "code": "VALIDATION"}), 400
    description = clean_text(data.get("description"), 0)
    if len(description) > 2000:
        return jsonify({"success": False, "error": "Description is too long (max 2000 characters)", "code": "VALIDATION"}), 400
    google_maps_url = clean_text(data.get("google_maps_url"), 0)
    if google_maps_url and (len(google_maps_url) > 500 or not re.match(r"^https?://\S+$", google_maps_url)):
        return jsonify({"success": False, "error": "Please paste a valid Google Maps link", "code": "VALIDATION"}), 400
    submitted_by_email = clean_text(data.get("submitted_by_email"), 150) or (user.email if user else "")
    if submitted_by_email and not EMAIL_RE.match(submitted_by_email):
        return jsonify({"success": False, "error": "Please enter a valid email address", "code": "VALIDATION"}), 400

    rating = None
    try:
        rating = optional_float(data.get("rating"))
        if rating is not None:
            rating = max(1.0, min(5.0, rating))
    except (TypeError, ValueError):
        rating = None

    # First try to get lat/lng directly from the request body (sent by mobile app)
    lat = lng = None
    try:
        lat = optional_float(data.get("lat"), -90, 90)
        lng = optional_float(data.get("lng"), -180, 180)
    except (TypeError, ValueError):
        lat = lng = None
    if lat is None or lng is None:
        lat = lng = None

    # If not provided directly, try to parse them from the Google Maps link
    if lat is None and google_maps_url:
        parsed = urlparse(google_maps_url)
        if parsed.scheme == "https" and parsed.hostname in SHORT_MAP_HOSTS:
            google_maps_url = _resolve_short_maps_url(google_maps_url)[:500]
        lat, lng = _coords_from_maps_url(google_maps_url)

    submission = VendorSubmission(
        city_id=city_id,
        stall_name=stall_name,
        cuisine_type=clean_text(data.get("cuisine_type"), 200) or None,
        description=description or None,
        google_maps_url=google_maps_url or None,
        approx_address=clean_text(data.get("approx_address"), 300) or None,
        estimated_price=clean_text(data.get("estimated_price"), 100) or None,
        submitted_by_name=clean_text(data.get("submitted_by_name"), 100) or (user.name if user else None),
        submitted_by_email=submitted_by_email or None,
        lat=lat,
        lng=lng,
        rating=rating,
        # Only a verified token can attach a submission to an account (never a body field).
        user_id=user.id if user else None,
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
@limiter.limit("20 per hour", key_func=user_or_ip_key)
def rate_vendor(vendor_id):
    data = request.get_json(silent=True) or {}
    review_text = clean_text(data.get("review_text"), 0)
    author_name = clean_text(data.get("author_name"), AUTHOR_NAME_MAX)

    try:
        rating_val = optional_float(data.get("rating"), 1, 5)
    except (TypeError, ValueError):
        return jsonify({"success": False, "error": "Invalid rating value", "code": "VALIDATION"}), 400
    if rating_val is None:
        return jsonify({"success": False, "error": "Rating value is required", "code": "VALIDATION"}), 400
    if len(review_text) > REVIEW_TEXT_MAX:
        return jsonify({"success": False, "error": f"Reviews can be at most {REVIEW_TEXT_MAX} characters", "code": "VALIDATION"}), 400

    vendor = public_vendor_query().filter(Vendor.id == vendor_id).first_or_404()
    user = get_optional_user(for_write=True)

    if not user and not get_settings().get("allow_guest_reviews", True):
        return jsonify({"success": False, "error": "Please log in to post a review", "code": "UNAUTHORIZED"}), 401
    if vendor_is_locked(vendor, user):
        return jsonify({"success": False, "error": "This hidden gem is part of Premium.", "code": "PREMIUM_REQUIRED"}), 403

    user_ip = client_ip()
    if user:
        # Logged-in reviews always carry the account name (no impersonation).
        author_name = user.name

    # A logged-in user keeps a single review per vendor; rating again updates it.
    existing = Rating.query.filter_by(vendor_id=vendor.id, user_id=user.id).first() if user else None
    if not user:
        # Guests: one review per vendor per network address per day.
        recent_guest = Rating.query.filter(
            Rating.vendor_id == vendor.id, Rating.user_id.is_(None), Rating.user_ip == user_ip,
            Rating.created_at >= datetime.utcnow() - timedelta(days=1),
        ).first()
        if recent_guest:
            return jsonify({"success": False, "error": "You have already rated this place today.", "code": "RATE_LIMITED"}), 429
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
        "review": _review_dict(review, user),
    })

# -------------------- VENDOR REVIEWS --------------------
@main_bp.route("/vendor-reviews", methods=["GET"])
def get_vendor_reviews():
    viewer = get_optional_user()
    # Recent written reviews of public vendors (never of locked premium vendors), optionally per city.
    query = (
        Rating.query.join(Vendor, Rating.vendor_id == Vendor.id)
        .filter(Rating.review_text.isnot(None), Rating.review_text != "")
        .filter(Vendor.id.in_(public_vendor_query().with_entities(Vendor.id)))
    )
    if locks_apply(viewer):
        query = query.filter(unlocked_vendor_clause())
    city_slug = request.args.get("city", "").strip()
    if city_slug and city_slug != "all":
        city = _city_by_slug(city_slug)
        if not city:
            return jsonify({"reviews": []}), 200
        query = query.filter(Vendor.city_id == city.id)
    ratings = query.order_by(Rating.created_at.desc()).limit(arg_int("limit", 20, 1, 50)).all()

    data = []
    for r in ratings:
        data.append({
            "id": r.id,
            "vendor_id": r.vendor_id,
            "vendor_image_url": r.vendor.image_url if r.vendor else None,
            "vendor_name": r.vendor.name if r.vendor else None,
            "city_name": r.vendor.city.name if r.vendor and r.vendor.city else None,
            "city_slug": r.vendor.city.slug if r.vendor and r.vendor.city else None,
            "rating_value": r.rating_value,
            "review_text": r.review_text,
            "author_name": r.author_name or "Anonymous",
            "created_at": r.created_at.isoformat() if r.created_at else None
        })
    return jsonify({"reviews": data}), 200

# -------------------- SITE REVIEWS --------------------
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
@limiter.limit("5 per hour", key_func=user_or_ip_key)
def submit_site_review():
    data = request.get_json(silent=True) or {}
    get_optional_user(for_write=True)
    author_name = clean_text(data.get("author_name"), 0)
    review_text = clean_text(data.get("review_text"), 0)

    if not author_name or not review_text or data.get("rating_value") in (None, ""):
        return jsonify({"success": False, "error": "All fields are required", "code": "VALIDATION"}), 400
    if len(author_name) > AUTHOR_NAME_MAX or len(review_text) > REVIEW_TEXT_MAX:
        return jsonify({"success": False, "error": "Name or review is too long", "code": "VALIDATION"}), 400

    try:
        rating_value = optional_float(data.get("rating_value"), 1, 5)
    except (TypeError, ValueError):
        return jsonify({"success": False, "error": "Invalid rating value", "code": "VALIDATION"}), 400

    new_review = SiteReview(
        author_name=author_name,
        review_text=review_text,
        rating_value=rating_value,
        status="pending",  # published once staff approve it in the admin panel
    )

    db.session.add(new_review)
    db.session.commit()

    return jsonify({"success": True, "message": "Thank you for your review! It will appear once our team has checked it."}), 201


REEL_EXTENSIONS = {".mp4": "mp4", ".webm": "webm"}


def _video_kind(head):
    if len(head) >= 8 and head[4:8] == b"ftyp":
        return "mp4"
    if head[:4] == b"\x1a\x45\xdf\xa3":
        return "webm"
    return None


@main_bp.route("/submit-reel", methods=["POST"])
@limiter.limit("5 per hour", key_func=user_or_ip_key)
@token_required
def submit_reel(current_user):
    # Videos are large: raise the body limit for this request only.
    request.max_content_length = current_app.config["MAX_REEL_UPLOAD_BYTES"]
    title = clean_text(request.form.get("title"), 0)
    video_file = request.files.get("video")

    if not title or not video_file or not video_file.filename:
        return jsonify({"success": False, "error": "Missing required fields", "code": "VALIDATION"}), 400
    if len(title) > 200:
        return jsonify({"success": False, "error": "Title is too long", "code": "VALIDATION"}), 400

    ext = os.path.splitext(video_file.filename)[1].lower()
    head = video_file.stream.read(16)
    video_file.stream.seek(0)
    if ext not in REEL_EXTENSIONS or _video_kind(head) != REEL_EXTENSIONS[ext]:
        return jsonify({"success": False, "error": "Please upload an MP4 or WebM video", "code": "VALIDATION"}), 400

    unique_filename = f"{uuid.uuid4().hex}{ext}"
    upload_folder = os.path.join(current_app.root_path, "static", "uploads", "reels")
    os.makedirs(upload_folder, exist_ok=True)
    video_file.save(os.path.join(upload_folder, unique_filename))

    new_reel = ReelSubmission(
        title=title,
        author_name=current_user.name[:100],
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
def premium_config():
    settings = get_settings()
    plans = (
        SubscriptionPlan.query.filter_by(is_active=True)
        .order_by(SubscriptionPlan.sort_order.asc(), SubscriptionPlan.price_paise.asc())
        .all()
    )
    return {
        "enabled": bool(settings.get("premium_enabled")),
        "payments_available": payments_available(),
        "payment_methods": settings.get("payment_methods") or ["upi"],
        "plans": [p.to_public_dict() for p in plans],
        "benefits": settings.get("premium_benefits") or [],
    }


@main_bp.route("/app/config", methods=["GET"])
def app_config():
    """Single bootstrap call for the apps and website: settings, banners, categories, premium."""
    settings = get_settings()
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
        # Every setting is available both flat and under "settings" (older clients read the latter).
        **settings,
        "settings": settings,
        "banners": [b.to_dict() for b in banners],
        "categories": [c.to_dict() for c in categories],
        "premium": premium_config(),
        "push_available": push_available(),
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
    return jsonify({"notifications": [n.to_public_dict() for n in items]})


# -------------------- CONTACT / SUPPORT --------------------
@main_bp.route("/contact", methods=["POST"])
@limiter.limit("10 per hour", key_func=user_or_ip_key)
def submit_contact():
    data = request.get_json(silent=True) or request.form
    user = get_optional_user(for_write=True)
    name = clean_text(data.get("name") or (user.name if user else ""), 0)
    email = clean_text(data.get("email") or (user.email if user else ""), 0)
    subject = clean_text(data.get("subject"), 0)
    message = clean_text(data.get("message"), 0)

    if not name or not email or not message:
        return jsonify({"success": False, "error": "Name, email and message are required", "code": "VALIDATION"}), 400
    if len(email) > 150 or not EMAIL_RE.match(email):
        return jsonify({"success": False, "error": "Please enter a valid email address", "code": "VALIDATION"}), 400
    if len(message) > 5000:
        return jsonify({"success": False, "error": "Message is too long", "code": "VALIDATION"}), 400

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
@limiter.limit("10 per hour", key_func=user_or_ip_key)
def submit_report():
    data = request.get_json(silent=True) or {}
    user = get_optional_user(for_write=True)
    target_type = clean_text(data.get("target_type"), 20).lower()
    reason = clean_text(data.get("reason"), 0)
    details = clean_text(data.get("details"), 0)

    try:
        target_id = int(data.get("target_id"))
    except (TypeError, ValueError):
        target_id = None

    if target_type not in REPORT_TARGETS or not target_id or not reason:
        return jsonify({"success": False, "error": "target_type, target_id and reason are required", "code": "VALIDATION"}), 400

    exists = {
        "vendor": lambda: db.session.get(Vendor, target_id),
        "review": lambda: db.session.get(Rating, target_id),
        "reel": lambda: db.session.get(ReelSubmission, target_id),
    }[target_type]()
    if not exists:
        return jsonify({"success": False, "error": "The reported item no longer exists", "code": "NOT_FOUND"}), 404

    report = Report(
        target_type=target_type,
        target_id=target_id,
        reason=reason[:100],
        details=details[:2000] or None,
        reporter_user_id=user.id if user else None,
        reporter_name=(user.name if user else clean_text(data.get("reporter_name"), 100)) or None,
    )
    db.session.add(report)
    db.session.commit()
    return jsonify({"success": True, "message": "Thanks for letting us know. Our moderators will review it."}), 201
