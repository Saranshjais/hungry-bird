"""Public write endpoints: NaN/Infinity rejection, guest review abuse limits, submissions, uploads."""
import io

import pytest

import app.routes.main as main_routes
from app import db
from app.models import Rating, ReelSubmission, SiteReview, Vendor, VendorSubmission

from conftest import auth, make_city, make_user, make_vendor, set_settings, user_token


@pytest.fixture
def vendor(app):
    return make_vendor(app, make_city(app), "Chai Point", lat=26.9, lng=75.8)


def _raw(client, url, body, headers=None):
    return client.post(url, data=body, content_type="application/json", headers=headers or {})


@pytest.mark.parametrize("body", [
    '{"rating": NaN}', '{"rating": Infinity}', '{"rating": -Infinity}', '{"rating": 1e999}',
    '{"rating": "nan"}', '{"rating": "inf"}', '{"rating": 6}', '{"rating": 0}', '{"rating": true}',
])
def test_rating_rejects_non_finite_and_out_of_range(client, app, vendor, body):
    resp = _raw(client, f"/api/vendors/{vendor}/rate", body)
    assert resp.status_code == 400
    with app.app_context():
        assert Rating.query.count() == 0
        assert db.session.get(Vendor, vendor).avg_rating is None


@pytest.mark.parametrize("value", ["NaN", "Infinity", '"nan"', '"-inf"'])
def test_site_review_rejects_non_finite(client, app, value):
    resp = _raw(client, "/api/site-reviews", f'{{"author_name": "A", "review_text": "Nice", "rating_value": {value}}}')
    assert resp.status_code == 400
    with app.app_context():
        assert SiteReview.query.count() == 0


def test_site_reviews_wait_for_moderation(client, app):
    resp = client.post("/api/site-reviews", json={"author_name": "A", "review_text": "Nice app", "rating_value": 5})
    assert resp.status_code == 201
    assert client.get("/api/site-reviews").get_json()["site_reviews"] == []
    with app.app_context():
        assert SiteReview.query.one().status == "pending"
    too_long = client.post("/api/site-reviews", json={"author_name": "A", "review_text": "x" * 1001, "rating_value": 5})
    assert too_long.status_code == 400


def test_submission_coordinates_are_finite_and_in_range(client, app):
    city = make_city(app)
    for lat, lng in (("nan", "75.8"), ("inf", "75.8"), ("95", "75.8"), ("26.9", "-inf")):
        resp = client.post("/api/submit-vendor", json={"city_id": city, "stall_name": f"S {lat} {lng}", "lat": lat,
                                                       "lng": lng, "rating": "nan"})
        assert resp.status_code == 200
    with app.app_context():
        assert all(s.lat is None and s.lng is None and s.rating is None for s in VendorSubmission.query.all())
    resp = client.post("/api/submit-vendor", json={
        "city_id": city, "stall_name": "From link", "google_maps_url": "https://www.google.com/maps/@26.9124,75.7873,17z"})
    assert resp.status_code == 200
    with app.app_context():
        sub = VendorSubmission.query.filter_by(stall_name="From link").one()
        assert (sub.lat, sub.lng) == (26.9124, 75.7873)


def test_submission_never_trusts_user_id_from_body(client, app):
    city = make_city(app)
    victim = make_user(app, email="victim@example.com")
    client.post("/api/submit-vendor", json={"city_id": city, "stall_name": "Spoof", "user_id": victim})
    me = make_user(app, email="me@example.com")
    client.post("/api/submit-vendor", json={"city_id": city, "stall_name": "Mine", "user_id": victim},
                headers=auth(user_token(app, me)))
    with app.app_context():
        owners = {s.stall_name: s.user_id for s in VendorSubmission.query.all()}
    assert owners == {"Spoof": None, "Mine": me}


def test_submission_field_caps(client, app):
    city = make_city(app)
    assert client.post("/api/submit-vendor", json={"city_id": city, "stall_name": "x", "description": "d" * 2001}).status_code == 400
    assert client.post("/api/submit-vendor", json={"city_id": city, "stall_name": "x", "google_maps_url": "javascript:alert(1)"}).status_code == 400
    assert client.post("/api/submit-vendor", json={"city_id": city, "stall_name": "x", "submitted_by_email": "nope"}).status_code == 400
    ok = client.post("/api/submit-vendor", json={"city_id": city, "stall_name": "n" * 300, "approx_address": "a" * 400})
    assert ok.status_code == 200
    with app.app_context():
        sub = VendorSubmission.query.one()
        assert len(sub.stall_name) == 200 and len(sub.approx_address) == 300


def test_short_maps_links_only_follow_google_hosts(client, app, monkeypatch):
    city = make_city(app)
    visited = []

    class Resp:
        def __init__(self, location):
            self.status_code, self.headers = 302, {"Location": location}

    def fake_head(url, allow_redirects=None, timeout=None):
        assert allow_redirects is False and timeout
        visited.append(url)
        return Resp("http://169.254.169.254/latest/meta-data/" if "evil" in url else
                    "https://www.google.com/maps/place/X/@26.95,75.81,17z")

    monkeypatch.setattr(main_routes.requests, "head", fake_head)
    # Not a short-link host: never fetched.
    client.post("/api/submit-vendor", json={"city_id": city, "stall_name": "a", "google_maps_url": "https://internal.example/goo.gl"})
    assert visited == []
    client.post("/api/submit-vendor", json={"city_id": city, "stall_name": "b", "google_maps_url": "https://maps.app.goo.gl/ok"})
    client.post("/api/submit-vendor", json={"city_id": city, "stall_name": "c", "google_maps_url": "https://maps.app.goo.gl/evil"})
    assert visited == ["https://maps.app.goo.gl/ok", "https://maps.app.goo.gl/evil"]  # redirect to 169.254.* not followed
    with app.app_context():
        subs = {s.stall_name: (s.lat, s.lng) for s in VendorSubmission.query.all()}
    assert subs["b"] == (26.95, 75.81) and subs["c"] == (None, None)


def test_guest_rating_dedupe_and_caps(client, app, vendor):
    first = client.post(f"/api/vendors/{vendor}/rate", json={"rating": 5, "review_text": "Great", "author_name": "Guest"})
    assert first.status_code == 200 and "user_id" not in first.get_json()["review"]
    again = client.post(f"/api/vendors/{vendor}/rate", json={"rating": 1})
    assert again.status_code == 429 and again.get_json()["code"] == "RATE_LIMITED"
    other_ip = client.post(f"/api/vendors/{vendor}/rate", json={"rating": 1}, environ_base={"REMOTE_ADDR": "10.1.1.1"})
    assert other_ip.status_code == 200
    too_long = client.post(f"/api/vendors/{vendor}/rate", json={"rating": 3, "review_text": "x" * 1001},
                           environ_base={"REMOTE_ADDR": "10.2.2.2"})
    assert too_long.status_code == 400
    long_name = client.post(f"/api/vendors/{vendor}/rate", json={"rating": 3, "author_name": "n" * 500},
                            environ_base={"REMOTE_ADDR": "10.3.3.3"})
    assert len(long_name.get_json()["review"]["author_name"]) == 100
    with app.app_context():
        v = db.session.get(Vendor, vendor)
        assert v.total_ratings == 3 and v.avg_rating == round((5 + 1 + 3) / 3, 1)


def test_logged_in_reviews_use_account_name_and_update(client, app, vendor):
    token = user_token(app, make_user(app, name="Priya"))
    r1 = client.post(f"/api/vendors/{vendor}/rate", json={"rating": 4, "author_name": "Official HungryBird"}, headers=auth(token))
    assert r1.get_json()["review"]["author_name"] == "Priya" and r1.get_json()["review"]["is_mine"] is True
    r2 = client.post(f"/api/vendors/{vendor}/rate", json={"rating": 2}, headers=auth(token))
    assert r2.get_json()["updated"] is True and r2.get_json()["total_ratings"] == 1
    detail = client.get(f"/api/vendors/{vendor}", headers=auth(token)).get_json()
    assert detail["reviews"][0]["is_mine"] is True and "user_id" not in detail["reviews"][0]


def test_guest_reviews_can_be_switched_off(client, app, vendor):
    set_settings(app, allow_guest_reviews=False)
    resp = client.post(f"/api/vendors/{vendor}/rate", json={"rating": 4})
    assert resp.status_code == 401 and resp.get_json()["code"] == "UNAUTHORIZED"


@pytest.mark.parametrize("url", [
    "/api/vendors?limit=-5&offset=-3", "/api/search?q=chai&limit=-1", "/api/vendors/hidden-gems?limit=-9",
    "/api/vendors/nearby?lat=26.9&lng=75.8&radius=-4&limit=-2", "/api/vendors/nearby?lat=nan&lng=nan&radius=inf",
    "/api/vendor-reviews?limit=-3",
])
def test_bad_query_params_do_not_500(client, vendor, url):
    assert client.get(url).status_code == 200


def test_reel_upload_requires_login_and_a_real_video(client, app, tmp_path):
    app.root_path = str(tmp_path)  # keep uploads out of the source tree
    assert client.post("/api/submit-reel", data={"title": "t"}, content_type="multipart/form-data").status_code == 401
    token = user_token(app, make_user(app, name="Filmer"))
    html = client.post("/api/submit-reel", headers=auth(token), content_type="multipart/form-data",
                       data={"title": "t", "video": (io.BytesIO(b"<html><script>alert(1)</script>"), "x.mp4")})
    assert html.status_code == 400
    svg = client.post("/api/submit-reel", headers=auth(token), content_type="multipart/form-data",
                      data={"title": "t", "video": (io.BytesIO(b"\x00\x00\x00\x18ftypmp42rest"), "x.svg")})
    assert svg.status_code == 400
    mp4 = client.post("/api/submit-reel", headers=auth(token), content_type="multipart/form-data",
                      data={"title": "My reel", "video": (io.BytesIO(b"\x00\x00\x00\x18ftypmp42" + b"0" * 64), "clip.mp4")})
    assert mp4.status_code == 200
    with app.app_context():
        reel = ReelSubmission.query.one()
        assert reel.author_name == "Filmer" and reel.video_filename.endswith(".mp4")
        assert "clip" not in reel.video_filename
    assert (tmp_path / "static" / "uploads" / "reels" / reel.video_filename).exists()


def test_contact_and_report_validation(client, app, vendor):
    assert client.post("/api/contact", json={"name": "A", "email": "bad", "message": "m"}).status_code == 400
    assert client.post("/api/contact", json={"name": "A", "email": "a@b.co", "message": "m" * 5001}).status_code == 400
    assert client.post("/api/contact", json={"name": "A", "email": "a@b.co", "message": "hello"}).status_code == 201
    assert client.post("/api/reports", json={"target_type": "vendor", "target_id": vendor, "reason": "closed"}).status_code == 201
    assert client.post("/api/reports", json={"target_type": "vendor", "target_id": 999, "reason": "x"}).status_code == 404


def test_content_rate_limits(tmp_path):
    from conftest import build_app
    app = build_app(tmp_path, RATELIMIT_ENABLED=True)
    client = app.test_client()
    statuses = [client.post("/api/contact", json={"name": "A", "email": "a@b.co", "message": "hi"}).status_code
                for _ in range(11)]
    assert statuses[:10] == [201] * 10 and statuses[10] == 429


def test_client_ip_header_is_used_when_configured(tmp_path):
    from conftest import build_app
    app = build_app(tmp_path, CLIENT_IP_HEADER="CF-Connecting-IP")
    client = app.test_client()
    vendor = make_vendor(app, make_city(app), "Stall")
    first = client.post(f"/api/vendors/{vendor}/rate", json={"rating": 5}, headers={"CF-Connecting-IP": "203.0.113.7"})
    second = client.post(f"/api/vendors/{vendor}/rate", json={"rating": 5}, headers={"CF-Connecting-IP": "203.0.113.8"})
    dup = client.post(f"/api/vendors/{vendor}/rate", json={"rating": 5}, headers={"CF-Connecting-IP": "203.0.113.7"})
    assert (first.status_code, second.status_code, dup.status_code) == (200, 200, 429)
    with app.app_context():
        assert sorted(r.user_ip for r in Rating.query.all()) == ["203.0.113.7", "203.0.113.8"]
