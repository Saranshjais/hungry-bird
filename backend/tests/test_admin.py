"""Admin API: premium management, content, read/write permissions per role."""
import io
from datetime import datetime, timedelta

import pytest

from app import db
from app.models import (
    AppNotification, Payment, Rating, Report, SubscriptionEvent, SubscriptionPlan, User, Vendor, VendorSubmission,
)

from conftest import admin_token, auth, make_city, make_user, make_vendor

ROLES = ("super_admin", "moderator", "support", "city_manager", "app_manager")


@pytest.fixture
def tokens(client, app):
    return {role: admin_token(client, app, role=role) for role in ROLES}


# -------------------- plans / subscriptions / payments --------------------

def test_plans_crud(client, app, tokens):
    h = auth(tokens["super_admin"])
    bad = client.post("/api/admin/plans", json={"name": "Cheap", "price_paise": 5, "duration_days": 30}, headers=h)
    assert bad.status_code == 400 and bad.get_json()["code"] == "VALIDATION"
    created = client.post("/api/admin/plans", json={"name": "Weekly", "description": "7 days", "price_paise": 1900,
                                                    "duration_days": 7}, headers=h)
    assert created.status_code == 201
    plan = created.get_json()["plan"]
    assert plan["price_display"] == "₹19" and plan["is_active"] is True
    upd = client.put(f"/api/admin/plans/{plan['id']}", json={"price_paise": 2450, "sort_order": 3}, headers=h)
    assert upd.get_json()["plan"]["price_display"] == "₹24.50"
    listing = client.get("/api/admin/plans", headers=h).get_json()["plans"]
    assert listing[0]["payments_count"] == 0

    with app.app_context():
        db.session.add(Payment(plan_id=plan["id"], days=7, amount_paise=2450, provider_order_id="order_P"))
        db.session.commit()
    gone = client.delete(f"/api/admin/plans/{plan['id']}", headers=h).get_json()
    assert gone["deactivated"] is True
    assert client.get("/api/premium/plans").get_json() == []

    other = client.post("/api/admin/plans", json={"name": "Day", "price_paise": 900, "duration_days": 1}, headers=h).get_json()["plan"]
    assert client.delete(f"/api/admin/plans/{other['id']}", headers=h).get_json()["deactivated"] is False
    with app.app_context():
        assert db.session.get(SubscriptionPlan, other["id"]) is None


def test_grant_extend_revoke_and_audit(client, app, tokens):
    h = auth(tokens["super_admin"])
    uid = make_user(app, email="sub@example.com")
    bad = client.post(f"/api/admin/users/{uid}/premium", json={"action": "grant", "days": 0}, headers=h)
    assert bad.status_code == 400
    grant = client.post(f"/api/admin/users/{uid}/premium", json={"action": "grant", "days": 30, "note": "Promo"}, headers=h)
    assert grant.status_code == 200 and grant.get_json()["user"]["is_premium"] is True
    extend = client.post(f"/api/admin/users/{uid}/premium", json={"action": "extend", "days": 10}, headers=h).get_json()
    with app.app_context():
        until = db.session.get(User, uid).premium_until
    assert abs((until - datetime.utcnow()) - timedelta(days=40)) < timedelta(minutes=1)
    assert extend["event"]["staff_name"] == "super_admin person" and extend["event"]["staff_id"]

    revoke = client.post(f"/api/admin/users/{uid}/premium", json={"action": "revoke", "note": "refund"}, headers=h)
    assert revoke.get_json()["user"]["is_premium"] is False
    with app.app_context():
        events = SubscriptionEvent.query.filter_by(user_id=uid).order_by(SubscriptionEvent.id).all()
        assert [e.kind for e in events] == ["grant", "extend", "revoke"]
        assert all(e.staff_id for e in events) and events[0].note == "Promo"
    detail = client.get(f"/api/admin/users/{uid}", headers=h).get_json()
    assert len(detail["subscription_events"]) == 3
    assert detail["user"]["is_premium"] is False and "email_verified" in detail["user"]

    # Moderators can read users but not premium history, and cannot change premium.
    mod = auth(tokens["moderator"])
    assert "subscription_events" not in client.get(f"/api/admin/users/{uid}", headers=mod).get_json()
    assert client.post(f"/api/admin/users/{uid}/premium", json={"action": "grant", "days": 5}, headers=mod).status_code == 403


def test_subscriptions_and_payments_lists(client, app, tokens):
    h = auth(tokens["super_admin"])
    active = make_user(app, email="active@example.com", name="Asha", premium_days=10)
    make_user(app, email="expired@example.com", name="Ravi", premium_days=-3)
    make_user(app, email="never@example.com")
    with app.app_context():
        db.session.add(Payment(user_id=active, email="active@example.com", plan_name="Monthly pass", days=30,
                               amount_paise=4900, status="paid", method="upi", provider_order_id="order_A",
                               provider_payment_id="pay_A", paid_at=datetime.utcnow()))
        db.session.add(Payment(user_id=active, email="active@example.com", plan_name="Monthly pass", days=30,
                               amount_paise=4900, status="created", provider_order_id="order_B"))
        db.session.commit()

    subs = client.get("/api/admin/subscriptions?status=active", headers=h).get_json()
    assert [s["email"] for s in subs["subscriptions"]] == ["active@example.com"]
    assert subs["subscriptions"][0]["last_payment"]["amount_paise"] == 4900 and subs["total"] == 1
    expired = client.get("/api/admin/subscriptions?status=expired", headers=h).get_json()["subscriptions"]
    assert [s["email"] for s in expired] == ["expired@example.com"]
    assert len(client.get("/api/admin/subscriptions?status=all", headers=h).get_json()["subscriptions"]) == 2
    assert client.get("/api/admin/subscriptions?status=all&q=ravi", headers=h).get_json()["total"] == 1

    payments = client.get("/api/admin/payments", headers=h).get_json()
    assert payments["total"] == 2
    row = client.get("/api/admin/payments?status=paid", headers=h).get_json()["payments"][0]
    assert set(row) >= {"id", "user", "plan", "amount_paise", "status", "method", "provider_order_id",
                        "provider_payment_id", "created_at", "paid_at"}
    assert row["user"]["email"] == "active@example.com" and row["plan"]["name"] == "Monthly pass"
    assert client.get("/api/admin/payments?q=order_B", headers=h).get_json()["total"] == 1

    stats = client.get("/api/admin/stats", headers=h).get_json()["premium"]
    assert stats == {"active_subscribers": 1, "revenue_30d_paise": 4900, "payments_30d": 1}
    assert client.get("/api/admin/stats", headers=auth(tokens["moderator"])).get_json()["premium"] is None


# -------------------- permission matrix --------------------

READ_MATRIX = {
    # path: roles that may read it
    "/api/admin/stats": set(ROLES),
    "/api/admin/users": {"super_admin", "moderator", "support"},
    "/api/admin/reviews": {"super_admin", "moderator"},
    "/api/admin/inbox": {"super_admin", "moderator", "support"},
    "/api/admin/submissions": {"super_admin", "moderator", "city_manager"},
    "/api/admin/staff": {"super_admin"},
    "/api/admin/plans": {"super_admin"},
    "/api/admin/subscriptions": {"super_admin"},
    "/api/admin/payments": {"super_admin"},
    "/api/admin/app-settings": {"super_admin", "app_manager"},
    "/api/admin/reports": {"super_admin", "moderator", "support"},
    "/api/admin/reels": {"super_admin", "moderator"},
    "/api/admin/trails": set(ROLES),
    "/api/admin/cities": set(ROLES),
    "/api/admin/vendors": {"super_admin", "moderator", "support", "city_manager", "app_manager"},
}


@pytest.mark.parametrize("path", sorted(READ_MATRIX))
def test_read_permissions(client, app, tokens, path):
    for role in ROLES:
        status = client.get(path, headers=auth(tokens[role])).status_code
        expected = 200 if role in READ_MATRIX[path] else 403
        assert status == expected, (role, path, status)


def test_write_permissions(client, app, tokens):
    city = make_city(app)
    trail_body = {"title": "Walk", "city_id": city, "stops": [{"name": "A"}]}
    for role in ROLES:
        status = client.post("/api/admin/trails", json=trail_body, headers=auth(tokens[role])).status_code
        assert status == (201 if role in {"super_admin", "city_manager", "app_manager"} else 403), role
        plan = client.post("/api/admin/plans", json={"name": "P", "price_paise": 4900, "duration_days": 30},
                           headers=auth(tokens[role])).status_code
        assert plan == (201 if role == "super_admin" else 403), role
        settings = client.put("/api/admin/app-settings", json={"announcement": role}, headers=auth(tokens[role])).status_code
        assert settings == (200 if role in {"super_admin", "app_manager"} else 403), role


def test_me_lists_read_and_write_permissions(client, tokens):
    me = client.get("/api/admin/me", headers=auth(tokens["support"])).get_json()
    assert me["permissions"] == ["inbox", "reports"]
    assert set(me["write_permissions"]) == {"inbox", "reports"}
    assert "users" in me["read_permissions"] and "premium" not in me["read_permissions"]
    assert me["areas"]["staff"] == {"read": False, "write": False}
    sup = client.get("/api/admin/me", headers=auth(tokens["super_admin"])).get_json()
    assert sup["permissions"] == ["*"] and "premium" in sup["write_permissions"]


def test_personal_data_only_for_roles_that_need_it(client, app, tokens):
    city = make_city(app)
    vendor = make_vendor(app, city, "Stall")
    uid = make_user(app, email="reviewer@example.com")
    with app.app_context():
        db.session.add(Rating(vendor_id=vendor, user_id=uid, rating_value=4, user_ip="10.0.0.1"))
        db.session.add(VendorSubmission(city_id=city, stall_name="New", submitted_by_email="sub@example.com"))
        db.session.commit()
    mod_review = client.get("/api/admin/reviews", headers=auth(tokens["moderator"])).get_json()["reviews"][0]
    assert mod_review["user_email"] == "reviewer@example.com" and mod_review["user_ip"] == "10.0.0.1"
    cm_sub = client.get("/api/admin/submissions", headers=auth(tokens["city_manager"])).get_json()["submissions"][0]
    assert cm_sub["submitted_by_email"] is None
    mod_sub = client.get("/api/admin/submissions", headers=auth(tokens["moderator"])).get_json()["submissions"][0]
    assert mod_sub["submitted_by_email"] == "sub@example.com"


def test_only_super_admin_deletes_users(client, app, tokens):
    uid = make_user(app)
    assert client.delete(f"/api/admin/users/{uid}", headers=auth(tokens["moderator"])).status_code == 403
    assert client.delete(f"/api/admin/users/{uid}", headers=auth(tokens["super_admin"])).status_code == 200


def test_take_down_needs_the_target_area(client, app, tokens):
    city = make_city(app)
    vendor = make_vendor(app, city, "Stall")
    with app.app_context():
        review = Rating(vendor_id=vendor, rating_value=1, review_text="spam")
        db.session.add(review)
        db.session.flush()
        report = Report(target_type="review", target_id=review.id, reason="spam")
        db.session.add(report)
        db.session.commit()
        report_id = report.id
    assert client.post(f"/api/admin/reports/{report_id}/take-down", headers=auth(tokens["support"])).status_code == 403
    # Support can still resolve/dismiss the report itself.
    assert client.put(f"/api/admin/reports/{report_id}", json={"status": "dismissed"}, headers=auth(tokens["support"])).status_code == 200
    assert client.post(f"/api/admin/reports/{report_id}/take-down", headers=auth(tokens["moderator"])).status_code == 200


def test_bulk_upload_new_city_needs_city_permission(client, app, tokens):
    csv_body = b"stall_name,city_name\nNew Stall,Udaipur\n"
    mod = client.post("/api/admin/vendors/bulk-upload", headers=auth(tokens["moderator"]),
                      data={"file": (io.BytesIO(csv_body), "v.csv")}, content_type="multipart/form-data").get_json()
    assert mod["imported"] == 0 and "cannot add cities" in mod["errors"][0]
    cm = client.post("/api/admin/vendors/bulk-upload", headers=auth(tokens["city_manager"]),
                     data={"file": (io.BytesIO(csv_body), "v.csv")}, content_type="multipart/form-data").get_json()
    assert cm["imported"] == 1


# -------------------- content --------------------

def test_trail_crud_and_validation(client, app, tokens):
    h = auth(tokens["app_manager"])
    city = make_city(app)
    vendor = make_vendor(app, city, "Lassiwala")
    bad = client.post("/api/admin/trails", json={"title": "x", "city_id": city, "stops": [{"vendor_id": 999}]}, headers=h)
    assert bad.status_code == 400
    trail = client.post("/api/admin/trails", headers=h, json={
        "title": "Morning walk", "city_id": city, "duration_text": "1 hour", "price_text": "₹100",
        "stops": [{"vendor_id": vendor, "note": "Start"}, "Free text stop"],
    }).get_json()["trail"]
    assert trail["is_premium"] is True and trail["stops"][0]["name"] == "Lassiwala" and trail["stop_count"] == 2
    upd = client.put(f"/api/admin/trails/{trail['id']}", json={"is_premium": False, "is_active": False}, headers=h).get_json()
    assert upd["trail"]["is_premium"] is False and upd["trail"]["is_active"] is False
    assert client.get("/api/trails?city=jaipur").get_json()["trails"] == []
    assert client.delete(f"/api/admin/trails/{trail['id']}", headers=h).status_code == 200


def test_city_fields_and_public_city_list(client, app, tokens):
    h = auth(tokens["city_manager"])
    created = client.post("/api/admin/cities", json={"name": "Udaipur", "description": "Lakes and dal baati",
                                                     "image_url": "https://img.example/u.jpg", "sort_order": 1}, headers=h)
    assert created.status_code == 201
    hidden = client.post("/api/admin/cities", json={"name": "Draft City", "is_active": False}, headers=h).get_json()
    client.post("/api/admin/cities", json={"name": "Agra", "sort_order": 0}, headers=h)
    cities = client.get("/api/cities").get_json()["cities"]
    assert [c["name"] for c in cities] == ["Agra", "Udaipur"]
    assert cities[1]["description"] == "Lakes and dal baati" and cities[1]["image_url"] == "https://img.example/u.jpg"
    assert cities[0]["description"] is None
    assert client.get("/api/city/draft-city").status_code == 404
    assert client.put(f"/api/admin/cities/{hidden['id']}", json={"lat": "NaN"}, headers=h).status_code == 400


def test_vendor_premium_and_team_verified_flags(client, app, tokens):
    city = make_city(app)
    vendor = make_vendor(app, city, "Stall", avg_rating=4.5, total_ratings=35)
    h = auth(tokens["moderator"])
    resp = client.put(f"/api/admin/vendors/{vendor}", json={"is_premium": True, "team_verified": True}, headers=h)
    assert resp.get_json()["vendor"]["is_premium"] is True and resp.get_json()["vendor"]["team_verified"] is True
    public = client.get(f"/api/vendors/{vendor}").get_json()["vendor"]
    assert public["is_verified"] is True and public["is_premium"] is True
    # Fabricated ratings can be wiped by recomputing from real reviews.
    recalc = client.post(f"/api/admin/vendors/{vendor}/recalculate-rating", headers=h).get_json()
    assert recalc["avg_rating"] is None and recalc["total_ratings"] == 0
    assert client.put(f"/api/admin/vendors/{vendor}", json={"lat": "nan"}, headers=h).status_code == 400
    assert client.put(f"/api/admin/vendors/{vendor}", json={"lng": "Infinity"}, headers=h).status_code == 400
    created = client.post("/api/admin/vendors", json={"name": "Gem", "city_id": city, "is_hidden_gem": True}, headers=h).get_json()
    assert created["vendor"]["is_premium"] is True  # hidden gems default to Premium


def test_submission_approval_keeps_rating_without_boilerplate(client, app, tokens):
    city = make_city(app)
    with app.app_context():
        sub = VendorSubmission(city_id=city, stall_name="Fresh Find", lat=26.9, lng=75.8, rating=5,
                               submitted_by_name="Meera")
        db.session.add(sub)
        db.session.commit()
        sub_id = sub.id
    resp = client.post(f"/api/admin/submissions/{sub_id}/approve", json={}, headers=auth(tokens["city_manager"]))
    assert resp.status_code == 200
    with app.app_context():
        vendor = db.session.get(Vendor, resp.get_json()["vendor_id"])
        ratings = Rating.query.filter_by(vendor_id=vendor.id).all()
        assert [(r.rating_value, r.review_text, r.author_name) for r in ratings] == [(5, None, "Meera")]
        assert vendor.avg_rating == 5 and vendor.total_ratings == 1 and vendor.is_premium is True


def test_app_settings_validation_and_service_flags(client, app, tokens):
    h = auth(tokens["app_manager"])
    current = client.get("/api/admin/app-settings", headers=h).get_json()
    assert current["payments_available"] is False and current["email_available"] is True
    assert current["push_available"] is False and current["settings"]["premium_enabled"] is False
    bad = client.put("/api/admin/app-settings", json={"payment_methods": ["bitcoin"]}, headers=h)
    assert bad.status_code == 400
    assert client.put("/api/admin/app-settings", json={"instagram_url": "not a link"}, headers=h).status_code == 400
    ok = client.put("/api/admin/app-settings", headers=h, json={"settings": {
        "premium_enabled": True, "payment_methods": ["upi"], "premium_benefits": ["All hidden gems", " ", "Trails"],
        "support_phone": "+91 98765 43210", "instagram_url": "https://instagram.com/hungrybird",
        "payments_available": True,  # read-only: ignored
    }}).get_json()
    assert ok["settings"]["premium_benefits"] == ["All hidden gems", "Trails"]
    assert ok["payments_available"] is False
    config = client.get("/api/app/config").get_json()
    assert config["premium"]["enabled"] is True and config["support_phone"] == "+91 98765 43210"
    assert config["instagram_url"] == "https://instagram.com/hungrybird"


def test_notification_is_stored_even_without_push(client, app, tokens):
    resp = client.post("/api/admin/notifications", json={"title": "Hi", "body": "Welcome"}, headers=auth(tokens["app_manager"]))
    assert resp.status_code == 201 and resp.get_json()["push_available"] is False
    assert resp.get_json()["notification"]["push_sent_count"] == 0
    public = client.get("/api/notifications").get_json()["notifications"][0]
    assert public["title"] == "Hi" and "sent_by" not in public
    with app.app_context():
        assert AppNotification.query.count() == 1


def test_send_reset_code(client, app, tokens, mail):
    uid = make_user(app, email="locked@example.com")
    assert client.post(f"/api/admin/users/{uid}/send-reset", headers=auth(tokens["city_manager"])).status_code == 403
    resp = client.post(f"/api/admin/users/{uid}/send-reset", headers=auth(tokens["moderator"]))
    assert resp.status_code == 200 and mail[-1]["to"] == "locked@example.com"


def test_category_filter_matches_real_vendor_data(client, app, tokens):
    city = make_city(app)
    make_vendor(app, city, "Data Key Chai", food_category="tea_chai")
    make_vendor(app, city, "Google Chai", food_category="Tea store", cuisine_type="Tea store")
    make_vendor(app, city, "Bakery", food_category="bakery")
    client.post("/api/admin/categories", json={"name": "Chai & Tea", "slug": "tea-chai", "keywords": "tea, chai"},
                headers=auth(tokens["moderator"]))
    names = {v["name"] for v in client.get("/api/vendors?city=jaipur&category=tea-chai").get_json()["vendors"]}
    assert names == {"Data Key Chai", "Google Chai"}
    cats = client.get("/api/admin/categories", headers=auth(tokens["moderator"])).get_json()["categories"]
    assert cats[0]["vendor_count"] == 2 and cats[0]["keywords"] == ["tea", "chai"]
