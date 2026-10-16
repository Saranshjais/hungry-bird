"""The ONLY public serializers for vendors and food trails.

Every public endpoint that returns a vendor (lists, detail, search, city page, favourites,
recommendations, user lists ...) must go through serialize_vendor() so the Premium lock is
enforced on the server: a locked vendor never leaves the API with its name, address,
coordinates, contact details, description, hours or reviews.
"""
from app import db
from app.helpers import get_settings
from app.models import Vendor

# Contract §4: the only fields a locked vendor is returned with.
LOCKED_VENDOR_FIELDS = (
    "id", "locked", "is_premium", "is_hidden_gem", "name", "city_id", "city_name", "city_slug",
    "area", "food_category", "cuisine_type", "avg_rating", "total_ratings", "price_level", "image_url",
)


def premium_enabled():
    return bool(get_settings().get("premium_enabled"))


def locks_apply(viewer):
    """Premium content is locked for this viewer (premium switched on and viewer has no active pass)."""
    return premium_enabled() and not (viewer is not None and viewer.is_premium)


def vendor_is_locked(vendor, viewer):
    return bool(vendor.is_premium) and locks_apply(viewer)


def unlocked_vendor_clause():
    """SQL condition matching vendors that are never locked."""
    return db.or_(Vendor.is_premium == False, Vendor.is_premium.is_(None))  # noqa: E712


def serialize_vendor(vendor, viewer=None, distance_km=None, detail=False):
    full = vendor._public_fields()
    if vendor_is_locked(vendor, viewer):
        data = {key: full.get(key) for key in LOCKED_VENDOR_FIELDS}
        data.update({"locked": True, "is_premium": True, "name": None})
        if detail:
            data["locked_reason"] = "premium"
        return data
    if distance_km is not None:
        full["distance_km"] = round(distance_km, 2)
    return full


def _clean_stop(stop):
    if isinstance(stop, str):
        return {"name": stop, "vendor_id": None, "note": None}
    if not isinstance(stop, dict):
        return None
    vendor_id = stop.get("vendor_id")
    return {
        "name": stop.get("name"),
        "vendor_id": vendor_id if isinstance(vendor_id, int) else None,
        "note": stop.get("note"),
    }


def serialize_trail(trail, viewer=None):
    stops = [s for s in (_clean_stop(s) for s in trail.stops) if s]
    locked = bool(trail.is_premium) and locks_apply(viewer)
    return {
        "id": trail.id,
        "city_id": trail.city_id,
        "title": trail.title,
        "description": trail.description,
        "image_url": trail.image_url,
        "duration_text": trail.duration_text,
        "price_text": trail.price_text,
        "is_premium": bool(trail.is_premium),
        "locked": locked,
        "stop_count": len(stops),
        "stops": [] if locked else stops,
    }
