"""Premium passes bought through Razorpay (the HTTP API is mocked)."""
import hashlib
import hmac
import json
from datetime import datetime, timedelta

import pytest

import app.payments as hb_payments
from app import db
from app.models import Payment, SubscriptionEvent, SubscriptionPlan, User

from conftest import auth, build_app, make_user, set_settings, user_token

KEY_ID, KEY_SECRET, WEBHOOK_SECRET = "rzp_test_key", "rzp_test_secret", "whsec_test"


class FakeResponse:
    def __init__(self, status_code, payload):
        self.status_code, self._payload = status_code, payload

    def json(self):
        return self._payload


@pytest.fixture
def pay_app(tmp_path):
    return build_app(tmp_path, RAZORPAY_KEY_ID=KEY_ID, RAZORPAY_KEY_SECRET=KEY_SECRET,
                     RAZORPAY_WEBHOOK_SECRET=WEBHOOK_SECRET)


@pytest.fixture
def razorpay(monkeypatch):
    calls = {"orders": [], "fetches": [], "counter": 0}

    def fake_post(url, auth=None, json=None, timeout=None):
        assert url == "https://api.razorpay.com/v1/orders" and auth == (KEY_ID, KEY_SECRET) and timeout
        calls["counter"] += 1
        calls["orders"].append(json)
        return FakeResponse(200, {"id": f"order_T{calls['counter']}", "amount": json["amount"],
                                  "currency": "INR", "status": "created"})

    def fake_get(url, auth=None, timeout=None):
        calls["fetches"].append(url)
        return FakeResponse(200, {"id": url.rsplit("/", 1)[-1], "status": "captured", "method": "upi"})

    monkeypatch.setattr(hb_payments.requests, "post", fake_post)
    monkeypatch.setattr(hb_payments.requests, "get", fake_get)
    return calls


def _plan(app, days=30, price=4900, active=True):
    with app.app_context():
        plan = SubscriptionPlan(name=f"{days}-day pass", description="d", price_paise=price, duration_days=days,
                                is_active=active, sort_order=0)
        db.session.add(plan)
        db.session.commit()
        return plan.id


def _buyer(app, **kw):
    uid = make_user(app, email=kw.pop("email", "buyer@example.com"), verified=kw.pop("verified", True), **kw)
    return uid, user_token(app, uid)


def _signature(order_id, payment_id):
    return hmac.new(KEY_SECRET.encode(), f"{order_id}|{payment_id}".encode(), hashlib.sha256).hexdigest()


def _premium_until(app, uid):
    with app.app_context():
        return db.session.get(User, uid).premium_until


def test_order_preconditions(client, app, razorpay):
    plan = _plan(app)
    uid, token = _buyer(app)
    off = client.post("/api/payments/order", json={"plan_id": plan}, headers=auth(token))
    assert off.status_code == 409 and off.get_json()["code"] == "PREMIUM_DISABLED"
    set_settings(app, premium_enabled=True)
    no_keys = client.post("/api/payments/order", json={"plan_id": plan}, headers=auth(token))
    assert no_keys.status_code == 503 and no_keys.get_json()["code"] == "PAYMENTS_NOT_CONFIGURED"
    assert client.post("/api/payments/order", json={"plan_id": plan}).status_code == 401
    assert razorpay["orders"] == []


def test_order_requires_verified_email_and_active_plan(pay_app, razorpay):
    client = pay_app.test_client()
    set_settings(pay_app, premium_enabled=True)
    plan = _plan(pay_app)
    inactive = _plan(pay_app, active=False)
    _, unverified = _buyer(pay_app, email="u@example.com", verified=False)
    resp = client.post("/api/payments/order", json={"plan_id": plan}, headers=auth(unverified))
    assert resp.status_code == 403 and resp.get_json()["code"] == "EMAIL_NOT_VERIFIED"
    _, token = _buyer(pay_app)
    assert client.post("/api/payments/order", json={"plan_id": inactive}, headers=auth(token)).status_code == 404
    assert client.post("/api/payments/order", json={"plan_id": 999}, headers=auth(token)).status_code == 404


def test_order_shape_and_amount_from_plan(pay_app, razorpay):
    client = pay_app.test_client()
    set_settings(pay_app, premium_enabled=True)
    plan = _plan(pay_app)
    uid, token = _buyer(pay_app)
    resp = client.post("/api/payments/order", json={"plan_id": plan, "amount": 1, "amount_paise": 1}, headers=auth(token))
    assert resp.status_code == 200, resp.get_data(as_text=True)
    body = resp.get_json()
    assert body["order_id"] == "order_T1" and body["amount_paise"] == 4900 and body["currency"] == "INR"
    assert body["key_id"] == KEY_ID and body["name"] == "HungryBird"
    assert body["description"] == "30-day pass — 30 days of Premium"
    assert body["prefill"]["email"] == "buyer@example.com"
    assert body["method"] == {"upi": True, "card": False, "netbanking": False, "wallet": False, "emi": False, "paylater": False}
    assert body["plan"]["price_display"] == "₹49" and body["plan"]["duration_days"] == 30
    assert razorpay["orders"][0]["amount"] == 4900
    assert razorpay["orders"][0]["notes"] == {"user_id": str(uid), "plan_id": str(plan)}
    with pay_app.app_context():
        p = Payment.query.one()
        assert (p.status, p.amount_paise, p.days, p.user_id) == ("created", 4900, 30, uid)

    set_settings(pay_app, payment_methods=["upi", "card"])
    body = client.post("/api/payments/order", json={"plan_id": plan}, headers=auth(token)).get_json()
    assert body["method"]["card"] is True and body["method"]["netbanking"] is False


def _order(client, app, token, plan):
    set_settings(app, premium_enabled=True)
    return client.post("/api/payments/order", json={"plan_id": plan}, headers=auth(token)).get_json()["order_id"]


def test_verify_valid_forged_and_idempotent(pay_app, razorpay):
    client = pay_app.test_client()
    plan = _plan(pay_app)
    uid, token = _buyer(pay_app)
    order_id = _order(client, pay_app, token, plan)

    forged = client.post("/api/payments/verify", headers=auth(token), json={
        "razorpay_order_id": order_id, "razorpay_payment_id": "pay_1", "razorpay_signature": "0" * 64})
    assert forged.status_code == 400 and forged.get_json()["code"] == "PAYMENT_VERIFICATION_FAILED"
    assert _premium_until(pay_app, uid) is None

    body = {"razorpay_order_id": order_id, "razorpay_payment_id": "pay_1", "razorpay_signature": _signature(order_id, "pay_1")}
    ok = client.post("/api/payments/verify", headers=auth(token), json=body)
    assert ok.status_code == 200 and ok.get_json()["ok"] is True
    user = ok.get_json()["user"]
    assert user["is_premium"] is True and user["premium_until"].endswith("Z")
    until = _premium_until(pay_app, uid)
    assert abs((until - datetime.utcnow()) - timedelta(days=30)) < timedelta(minutes=1)

    again = client.post("/api/payments/verify", headers=auth(token), json=body)
    assert again.status_code == 200 and _premium_until(pay_app, uid) == until
    with pay_app.app_context():
        p = Payment.query.one()
        assert (p.status, p.method, p.provider_payment_id) == ("paid", "upi", "pay_1")
        assert SubscriptionEvent.query.filter_by(kind="purchase").count() == 1

    # Another user can't claim someone else's order.
    _, other = _buyer(pay_app, email="other@example.com")
    assert client.post("/api/payments/verify", headers=auth(other), json=body).status_code == 400


def _webhook(client, payload, secret=WEBHOOK_SECRET, signature=None):
    raw = json.dumps(payload).encode()
    sig = signature or hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()
    return client.post("/api/payments/webhook", data=raw, content_type="application/json",
                       headers={"X-Razorpay-Signature": sig})


def _captured(order_id, amount=4900, payment_id="pay_W1"):
    return {"event": "payment.captured", "payload": {"payment": {"entity": {
        "id": payment_id, "order_id": order_id, "amount": amount, "method": "upi", "status": "captured"}}}}


def test_webhook_valid_forged_duplicate(pay_app, razorpay):
    client = pay_app.test_client()
    plan = _plan(pay_app)
    uid, token = _buyer(pay_app)
    order_id = _order(client, pay_app, token, plan)

    forged = _webhook(client, _captured(order_id), secret="wrong-secret")
    assert forged.status_code == 400
    assert _premium_until(pay_app, uid) is None

    first = _webhook(client, _captured(order_id))
    assert first.status_code == 200 and first.get_json() == {"ok": True, "duplicate": False}
    until = _premium_until(pay_app, uid)
    assert until is not None

    dup = _webhook(client, _captured(order_id))
    assert dup.status_code == 200 and dup.get_json()["duplicate"] is True
    order_paid = {"event": "order.paid", "payload": {"order": {"entity": {"id": order_id, "amount_paid": 4900}}}}
    assert _webhook(client, order_paid).get_json()["duplicate"] is True
    # The app's verify call arriving late changes nothing.
    client.post("/api/payments/verify", headers=auth(token), json={
        "razorpay_order_id": order_id, "razorpay_payment_id": "pay_W1", "razorpay_signature": _signature(order_id, "pay_W1")})
    assert _premium_until(pay_app, uid) == until
    with pay_app.app_context():
        assert SubscriptionEvent.query.filter_by(kind="purchase").count() == 1

    assert _webhook(client, _captured("order_unknown")).get_json()["ignored"] is True


def test_webhook_amount_mismatch_does_not_activate(pay_app, razorpay):
    client = pay_app.test_client()
    plan = _plan(pay_app)
    uid, token = _buyer(pay_app)
    order_id = _order(client, pay_app, token, plan)
    assert _webhook(client, _captured(order_id, amount=100)).status_code == 200
    assert _premium_until(pay_app, uid) is None
    with pay_app.app_context():
        assert Payment.query.one().status == "amount_mismatch"


def test_webhook_without_secret(client):
    assert _webhook(client, _captured("order_x")).status_code == 503


@pytest.mark.parametrize("start_offset_days,expected_days", [(10, 40), (-5, 30), (None, 30)])
def test_extension_rule(pay_app, razorpay, start_offset_days, expected_days):
    client = pay_app.test_client()
    plan = _plan(pay_app)
    uid, token = _buyer(pay_app, premium_days=start_offset_days)
    order_id = _order(client, pay_app, token, plan)
    _webhook(client, _captured(order_id))
    until = _premium_until(pay_app, uid)
    assert abs((until - datetime.utcnow()) - timedelta(days=expected_days)) < timedelta(minutes=1)


def test_config_plans_and_status(pay_app, razorpay):
    client = pay_app.test_client()
    _plan(pay_app, days=365, price=39900)
    _plan(pay_app, days=7, price=1950, active=False)
    config = client.get("/api/app/config").get_json()
    premium = config["premium"]
    assert premium["enabled"] is False and premium["payments_available"] is True
    assert premium["payment_methods"] == ["upi"] and premium["benefits"]
    assert [p["price_display"] for p in premium["plans"]] == ["₹399"]
    assert config["push_available"] is False and config["support_phone"] == "" and config["instagram_url"] == ""
    assert config["settings"]["premium_enabled"] is False and config["maintenance_mode"] is False
    plans = client.get("/api/premium/plans").get_json()
    assert isinstance(plans, list) and plans[0]["price_paise"] == 39900

    uid, token = _buyer(pay_app)
    order_id = _order(client, pay_app, token, plans[0]["id"])
    _webhook(client, _captured(order_id, amount=39900))
    status = client.get("/api/premium/status", headers=auth(token)).get_json()
    assert status["is_premium"] is True
    assert status["history"][0]["kind"] == "purchase" and status["history"][0]["days"] == 365
    assert status["history"][0]["amount_paise"] == 39900


def test_app_config_without_keys(client):
    assert client.get("/api/app/config").get_json()["premium"]["payments_available"] is False
