"""Premium locking is enforced on the server for every public vendor/trail payload."""
import json

import pytest

from app import db
from app.models import Favorite, Rating, SavedVendor, Trail
from app.serializers import LOCKED_VENDOR_FIELDS

from conftest import auth, make_city, make_user, make_vendor, set_settings, user_token

SECRET_FIELDS = ("address_text", "address", "landmark", "lat", "lng", "phone", "website", "instagram",
                 "description", "specialty_dish", "opening_hours", "locality", "market")


@pytest.fixture
def world(app):
    city = make_city(app, slug="jaipur", name="Jaipur", lat=26.9, lng=75.8)
    gem = make_vendor(
        app, city, "Secret Kachori Stall", is_premium=True, is_hidden_gem=True, area="C-Scheme",
        food_category="kachori_samosa", cuisine_type="Kachori Samosa", lat=26.91, lng=75.80,
        address_text="Shop 4, Hidden Lane", landmark="Behind the temple", phone="+91 99999 00000",
        website="https://secret.example", instagram="@secret", description="Best kachori",
        specialty_dish="Pyaz kachori", opening_hours="7 AM - 11 AM", image_url="https://img.example/gem.jpg",
        price_level="₹", avg_rating=4.6, total_ratings=1,
    )
    free = make_vendor(app, city, "Open Chai Corner", area="C-Scheme", food_category="tea_chai",
                       cuisine_type="Tea Chai", lat=26.912, lng=75.801, description="Chai and more chai")
    with app.app_context():
        db.session.add(Rating(vendor_id=gem, rating_value=4.6, review_text="Amazing", author_name="R"))
        db.session.add(Rating(vendor_id=free, rating_value=4.0, review_text="Good chai", author_name="S"))
        db.session.commit()
    free_user = make_user(app, email="free@example.com")
    premium_user = make_user(app, email="paid@example.com", premium_days=30)
    for uid in (free_user, premium_user):
        with app.app_context():
            db.session.add(Favorite(user_id=uid, vendor_id=gem))
            db.session.add(SavedVendor(user_id=uid, vendor_id=gem))
            db.session.add(Rating(vendor_id=gem, user_id=uid, rating_value=5, review_text="mine"))
            db.session.commit()
    return {
        "city": city, "gem": gem, "free": free,
        "viewers": {
            "anonymous": None,
            "free": user_token(app, free_user),
            "premium": user_token(app, premium_user),
        },
    }


def _headers(token):
    return auth(token) if token else {}


def _find(items, vendor_id):
    return next((v for v in items if v.get("id") == vendor_id), None)


def _payloads(client, w, token):
    """Every public payload that can contain the premium vendor, as {name: vendor dict or None}."""
    h = _headers(token)
    gem = w["gem"]
    out = {
        "vendors": _find(client.get("/api/vendors?city=jaipur", headers=h).get_json()["vendors"], gem),
        "vendors_distance": _find(client.get("/api/vendors?city=jaipur&sort=distance&lat=26.91&lng=75.8",
                                             headers=h).get_json()["vendors"], gem),
        "detail": client.get(f"/api/vendors/{gem}", headers=h).get_json()["vendor"],
        "hidden_gems": _find(client.get("/api/vendors/hidden-gems?city=jaipur", headers=h).get_json()["hidden_gems"], gem),
        "search_area": _find(client.get("/api/search?q=C-Scheme", headers=h).get_json()["results"], gem),
        "city_page": _find(client.get("/api/city/jaipur", headers=h).get_json()["vendors"], gem),
        "home": _find(client.get("/api/home", headers=h).get_json()["recent_vendors"], gem),
    }
    if token:
        out["favorites"] = _find(client.get("/api/favorites", headers=h).get_json()["favorites"], gem)
        out["saved"] = _find(client.get("/api/saved", headers=h).get_json()["saved"], gem)
        mine = client.get("/api/user/reviews", headers=h).get_json()["reviews"]
        out["user_reviews"] = next(r["vendor"] for r in mine if r["vendor_id"] == gem)
    return out


def _assert_locked(name, vendor):
    assert vendor is not None, name
    extra = {"locked_reason", "saved_at"}
    assert set(vendor) - extra <= set(LOCKED_VENDOR_FIELDS), (name, set(vendor) - set(LOCKED_VENDOR_FIELDS))
    assert vendor["locked"] is True and vendor["is_premium"] is True and vendor["name"] is None, name
    for field in SECRET_FIELDS:
        assert field not in vendor, (name, field)
    assert "distance_km" not in vendor, name
    # The card still shows area, category, rating, price and photo.
    assert vendor["area"] == "C-Scheme" and vendor["city_slug"] == "jaipur" and vendor["avg_rating"] is not None


def _assert_unlocked(name, vendor):
    assert vendor is not None, name
    assert vendor["locked"] is False and vendor["name"] == "Secret Kachori Stall", name
    assert vendor["address_text"] == "Shop 4, Hidden Lane" and vendor["lat"] == 26.91, name
    assert vendor["is_premium"] is True and vendor["is_verified"] is False


@pytest.mark.parametrize("viewer", ["anonymous", "free"])
def test_locked_for_non_premium_viewers(client, app, world, viewer):
    set_settings(app, premium_enabled=True)
    for name, vendor in _payloads(client, world, world["viewers"][viewer]).items():
        _assert_locked(name, vendor)


def test_unlocked_for_premium_viewer(client, app, world):
    set_settings(app, premium_enabled=True)
    for name, vendor in _payloads(client, world, world["viewers"]["premium"]).items():
        _assert_unlocked(name, vendor)


@pytest.mark.parametrize("viewer", ["anonymous", "free", "premium"])
def test_nothing_locked_while_premium_disabled(client, app, world, viewer):
    set_settings(app, premium_enabled=False)
    for name, vendor in _payloads(client, world, world["viewers"][viewer]).items():
        _assert_unlocked(name, vendor)


def test_locked_detail_shape(client, app, world):
    set_settings(app, premium_enabled=True)
    resp = client.get(f"/api/vendors/{world['gem']}")
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["vendor"]["locked_reason"] == "premium"
    assert body["reviews"] == [] and body["nearby"] == []
    # The free vendor's detail never lists the locked vendor as "nearby" (it would reveal its location).
    free = client.get(f"/api/vendors/{world['free']}").get_json()
    assert all(n["id"] != world["gem"] for n in free["nearby"])
    assert free["vendor"]["name"] == "Open Chai Corner" and free["reviews"]


def test_nearby_excludes_locked(client, app, world):
    set_settings(app, premium_enabled=True)
    url = "/api/vendors/nearby?lat=26.91&lng=75.80&radius=5"
    anon_ids = [v["id"] for v in client.get(url).get_json()["vendors"]]
    assert world["gem"] not in anon_ids and world["free"] in anon_ids
    no_origin = [v["id"] for v in client.get("/api/vendors/nearby").get_json()["vendors"]]
    assert world["gem"] not in no_origin
    paid = client.get(url, headers=auth(world["viewers"]["premium"])).get_json()["vendors"]
    assert world["gem"] in [v["id"] for v in paid]


def test_search_never_matches_hidden_fields_of_locked_vendors(client, app, world):
    set_settings(app, premium_enabled=True)
    for q in ("Secret Kachori", "Pyaz", "temple"):
        anon = client.get(f"/api/search?q={q}").get_json()["results"]
        assert _find(anon, world["gem"]) is None, q
        assert _find(client.get(f"/api/vendors?city=jaipur&q={q}").get_json()["vendors"], world["gem"]) is None
        paid = client.get(f"/api/search?q={q}", headers=auth(world["viewers"]["premium"])).get_json()["results"]
        assert _find(paid, world["gem"]) is not None, q


def test_recommendations_and_reviews_feed_respect_locks(client, app, world):
    set_settings(app, premium_enabled=True)
    page = client.get("/api/city/jaipur").get_json()
    for rec in page["recommendations"]:
        if rec["id"] == world["gem"]:
            _assert_locked("recommendation", rec)
    feed = client.get("/api/vendor-reviews?city=jaipur").get_json()["reviews"]
    assert feed and all(r["vendor_id"] != world["gem"] for r in feed)
    paid_feed = client.get("/api/vendor-reviews?city=jaipur", headers=auth(world["viewers"]["premium"])).get_json()["reviews"]
    assert any(r["vendor_id"] == world["gem"] for r in paid_feed)


def test_free_user_cannot_rate_a_locked_vendor(client, app, world):
    set_settings(app, premium_enabled=True)
    resp = client.post(f"/api/vendors/{world['gem']}/rate", json={"rating": 4}, headers=auth(world["viewers"]["free"]))
    assert resp.status_code == 403 and resp.get_json()["code"] == "PREMIUM_REQUIRED"


def test_expired_premium_is_not_premium(client, app, world):
    set_settings(app, premium_enabled=True)
    expired = user_token(app, make_user(app, email="old@example.com", premium_days=-1))
    _assert_locked("expired", client.get(f"/api/vendors/{world['gem']}", headers=auth(expired)).get_json()["vendor"])


def test_no_invented_values(client, app):
    city = make_city(app, slug="delhi", name="Delhi")
    bare = make_vendor(app, city, "Bare Stall")
    v = client.get(f"/api/vendors/{bare}").get_json()["vendor"]
    for field in ("avg_rating", "rating", "price_level", "address_text", "area", "description", "opening_hours",
                  "image_url", "specialty_dish"):
        assert v[field] is None, field
    assert v["total_ratings"] == 0 and v["is_verified"] is False and v["city_name"] == "Delhi"
    for leaked in ("source_type", "source_name", "data_confidence", "hidden_gem_score_status", "verification_level"):
        assert leaked not in v


def test_city_page_returns_full_vendor_fields(client, app):
    city = make_city(app)
    make_vendor(app, city, "Full Fields", area="Raja Park", specialty_dish="Samosa", opening_hours="9-5",
                landmark="Near gate", price_min=20, price_max=50)
    vendor = client.get("/api/city/jaipur").get_json()["vendors"][0]
    assert (vendor["area"], vendor["specialty_dish"], vendor["opening_hours"], vendor["landmark"],
            vendor["price_min"], vendor["price_max"]) == ("Raja Park", "Samosa", "9-5", "Near gate", 20, 50)


# -------------------- trails --------------------

@pytest.fixture
def trails(app, world):
    other = make_city(app, slug="mumbai", name="Mumbai")
    with app.app_context():
        premium = Trail(city_id=world["city"], title="Old City Walk", description="Five stops", is_premium=True,
                        is_active=True, sort_order=1, duration_text="2 hours", price_text="₹200")
        premium.stops = [{"name": "Stop A", "vendor_id": world["free"], "note": "Start here"}, {"name": "Stop B", "vendor_id": None, "note": None}]
        free = Trail(city_id=world["city"], title="Free Chai Trail", is_premium=False, is_active=True, sort_order=0)
        free.stops = [{"name": "Chai", "vendor_id": None, "note": None}]
        hidden = Trail(city_id=world["city"], title="Draft", is_premium=False, is_active=False)
        hidden.stops = []
        elsewhere = Trail(city_id=other, title="Mumbai Vada Pav", is_premium=False, is_active=True)
        elsewhere.stops = []
        db.session.add_all([premium, free, hidden, elsewhere])
        db.session.commit()
        return {"premium": premium.id, "free": free.id, "hidden": hidden.id, "elsewhere": elsewhere.id}


def test_trails_are_city_scoped_sorted_and_active_only(client, app, trails):
    items = client.get("/api/trails?city=jaipur").get_json()["trails"]
    assert [t["title"] for t in items] == ["Free Chai Trail", "Old City Walk"]
    assert [t["title"] for t in client.get("/api/trails?city=mumbai").get_json()["trails"]] == ["Mumbai Vada Pav"]
    assert client.get("/api/trails?city=nowhere").get_json()["trails"] == []
    assert client.get(f"/api/trails/{trails['hidden']}").status_code == 404


def test_trail_locking(client, app, world, trails):
    set_settings(app, premium_enabled=True)
    locked = client.get(f"/api/trails/{trails['premium']}").get_json()["trail"]
    assert locked == {
        "id": trails["premium"], "city_id": world["city"], "title": "Old City Walk", "description": "Five stops",
        "image_url": None, "duration_text": "2 hours", "price_text": "₹200", "is_premium": True, "locked": True,
        "stop_count": 2, "stops": [],
    }
    paid = client.get(f"/api/trails/{trails['premium']}", headers=auth(world["viewers"]["premium"])).get_json()["trail"]
    assert paid["locked"] is False and paid["stops"][0] == {"name": "Stop A", "vendor_id": world["free"], "note": "Start here"}
    free_trail = client.get(f"/api/trails/{trails['free']}").get_json()["trail"]
    assert free_trail["locked"] is False and len(free_trail["stops"]) == 1
    set_settings(app, premium_enabled=False)
    assert client.get(f"/api/trails/{trails['premium']}").get_json()["trail"]["locked"] is False


def test_vendor_reviews_city_scope_and_hidden_vendors(client, app, world):
    other = make_city(app, slug="pune", name="Pune")
    pune_vendor = make_vendor(app, other, "Pune Misal")
    hidden = make_vendor(app, world["city"], "Rejected Stall", verified_status="rejected")
    pending = make_vendor(app, world["city"], "Pending Stall", verified_status="pending")
    with app.app_context():
        for vid in (pune_vendor, hidden, pending):
            db.session.add(Rating(vendor_id=vid, rating_value=3, review_text="text"))
        db.session.commit()
    jaipur_ids = {r["vendor_id"] for r in client.get("/api/vendor-reviews?city=jaipur").get_json()["reviews"]}
    assert pune_vendor not in jaipur_ids and hidden not in jaipur_ids and pending not in jaipur_ids
    assert {r["vendor_id"] for r in client.get("/api/vendor-reviews?city=pune").get_json()["reviews"]} == {pune_vendor}
    # Pending vendors are not public anywhere.
    assert client.get(f"/api/vendors/{pending}").status_code == 404


def test_responses_are_strict_json(client, app, world):
    raw = client.get("/api/vendors?city=jaipur&lat=nan&lng=inf&sort=distance&limit=-5").get_data(as_text=True)
    json.loads(raw, parse_constant=lambda c: (_ for _ in ()).throw(ValueError(c)))
