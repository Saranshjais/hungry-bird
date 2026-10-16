"""Registration, email verification codes, password policy, forgot/reset, token revocation."""
from datetime import datetime, timedelta

import pytest
from werkzeug.security import generate_password_hash

from app import db
from app.codes import MAX_SENDS_PER_HOUR
from app.models import AuthCode, User

from conftest import PASSWORD, auth, build_app, make_city, make_user, make_vendor, user_token


def register(client, email="new@example.com", password=PASSWORD, name="New Person"):
    return client.post("/api/auth/register", json={"name": name, "email": email, "password": password})


def age_codes(app, email, seconds=61):
    """Pretend the last codes were sent a while ago (skip the resend cooldown)."""
    with app.app_context():
        for row in AuthCode.query.filter_by(email=email).all():
            row.created_at = row.created_at - timedelta(seconds=seconds)
        db.session.commit()


def test_register_sends_code_and_verify(client, app, mail):
    resp = register(client)
    assert resp.status_code == 201
    body = resp.get_json()
    assert body["verification_sent"] is True
    assert body["user"]["email_verified"] is False
    assert body["user"]["is_premium"] is False and body["user"]["premium_until"] is None
    assert len(mail) == 1 and mail[0]["to"] == "new@example.com" and len(mail[0]["code"]) == 6
    token = body["token"]

    with app.app_context():
        row = AuthCode.query.one()
        assert mail[0]["code"] not in row.code_hash  # only a hash is stored

    wrong = "000000" if mail[0]["code"] != "000000" else "111111"
    bad = client.post("/api/auth/email/verify", json={"code": wrong}, headers=auth(token))
    assert bad.status_code == 400 and bad.get_json()["code"] == "INVALID_CODE"
    assert bad.get_json()["attempts_left"] == 4

    ok = client.post("/api/auth/email/verify", json={"code": mail[0]["code"]}, headers=auth(token))
    assert ok.status_code == 200
    assert ok.get_json()["user"]["email_verified"] is True
    me = client.get("/api/auth/me", headers=auth(token)).get_json()["user"]
    assert me["email_verified"] is True

    again = client.post("/api/auth/email/send-code", headers=auth(token))
    assert again.status_code == 409


def test_send_code_cooldown_and_hourly_cap(client, app, mail):
    token = register(client).get_json()["token"]
    resp = client.post("/api/auth/email/send-code", headers=auth(token))
    assert resp.status_code == 429
    assert resp.get_json()["code"] == "RATE_LIMITED" and resp.get_json()["resend_after"] > 0

    for _ in range(MAX_SENDS_PER_HOUR - 1):
        age_codes(app, "new@example.com")
        resp = client.post("/api/auth/email/send-code", headers=auth(token))
        assert resp.status_code == 200
        assert resp.get_json() == {"sent": True, "resend_after": 60}
    age_codes(app, "new@example.com")
    capped = client.post("/api/auth/email/send-code", headers=auth(token))
    assert capped.status_code == 429 and capped.get_json()["code"] == "RATE_LIMITED"
    assert len(mail) == MAX_SENDS_PER_HOUR


def test_only_the_newest_code_works(client, app, mail):
    token = register(client).get_json()["token"]
    age_codes(app, "new@example.com")
    client.post("/api/auth/email/send-code", headers=auth(token))
    old, new = mail[0]["code"], mail[1]["code"]
    if old != new:
        assert client.post("/api/auth/email/verify", json={"code": old}, headers=auth(token)).status_code == 400
    assert client.post("/api/auth/email/verify", json={"code": new}, headers=auth(token)).status_code == 200


@pytest.mark.parametrize("password", ["short1", "abcdefgh", "12345678", "", "a" * 7 + "1"[:0]])
def test_password_policy_on_register(client, password):
    resp = register(client, password=password)
    assert resp.status_code == 400
    assert resp.get_json()["code"] in ("WEAK_PASSWORD", "VALIDATION")
    if password:
        assert resp.get_json()["code"] == "WEAK_PASSWORD"


def test_duplicate_email(client, mail):
    register(client)
    resp = register(client)
    assert resp.status_code == 400 and resp.get_json()["code"] == "EMAIL_IN_USE"


def test_login_rehashes_legacy_hash_and_existing_weak_passwords_still_work(client, app):
    with app.app_context():
        user = User(name="Old", email="old@example.com",
                    password_hash=generate_password_hash("abc123", method="pbkdf2:sha256:1000"))
        db.session.add(user)
        db.session.commit()
    resp = client.post("/api/auth/login", json={"email": "OLD@example.com", "password": "abc123"})
    assert resp.status_code == 200
    assert set(resp.get_json()["user"]) >= {"id", "name", "email", "email_verified", "is_premium", "premium_until"}
    with app.app_context():
        assert not User.query.filter_by(email="old@example.com").one().password_hash.startswith("pbkdf2:sha256:1000$")
    assert client.post("/api/auth/login", json={"email": "old@example.com", "password": "abc123"}).status_code == 200
    assert client.post("/api/auth/login", json={"email": "old@example.com", "password": "wrong"}).status_code == 401


def test_forgot_password_is_generic(client, app, mail):
    make_user(app, email="known@example.com")
    unknown = client.post("/api/auth/password/forgot", json={"email": "nobody@example.com"})
    known = client.post("/api/auth/password/forgot", json={"email": "known@example.com"})
    assert unknown.status_code == known.status_code == 200
    assert unknown.get_json() == known.get_json() == {"ok": True}
    assert [m["to"] for m in mail] == ["known@example.com"]
    # A second request inside the cooldown is still answered the same way.
    assert client.post("/api/auth/password/forgot", json={"email": "known@example.com"}).get_json() == {"ok": True}
    assert len(mail) == 1


def _reset(client, code, email="known@example.com", new_password="BrandNew123"):
    return client.post("/api/auth/password/reset", json={"email": email, "code": code, "new_password": new_password})


def test_reset_password_flow_revokes_tokens(client, app, mail):
    user_id = make_user(app, email="known@example.com", verified=False)
    old_token = user_token(app, user_id)
    assert client.get("/api/auth/me", headers=auth(old_token)).status_code == 200

    client.post("/api/auth/password/forgot", json={"email": "known@example.com"})
    code = mail[-1]["code"]
    weak = _reset(client, code, new_password="weak")
    assert weak.status_code == 400 and weak.get_json()["code"] == "WEAK_PASSWORD"
    assert _reset(client, code).get_json() == {"ok": True}

    # Old tokens are revoked; the new password works; the email counts as verified now.
    assert client.get("/api/auth/me", headers=auth(old_token)).status_code == 401
    login = client.post("/api/auth/login", json={"email": "known@example.com", "password": "BrandNew123"})
    assert login.status_code == 200 and login.get_json()["user"]["email_verified"] is True
    assert client.post("/api/auth/login", json={"email": "known@example.com", "password": PASSWORD}).status_code == 401

    # Single use.
    reused = _reset(client, code, new_password="Another123")
    assert reused.status_code == 400 and reused.get_json()["code"] == "INVALID_CODE"


def test_reset_wrong_attempts_lock_the_code(client, app, mail):
    make_user(app, email="known@example.com")
    client.post("/api/auth/password/forgot", json={"email": "known@example.com"})
    code = mail[-1]["code"]
    wrong = "123456" if code != "123456" else "654321"
    for i in range(4):
        resp = _reset(client, wrong)
        assert resp.status_code == 400 and resp.get_json()["code"] == "INVALID_CODE"
    fifth = _reset(client, wrong)
    assert fifth.status_code == 429 and fifth.get_json()["code"] == "TOO_MANY_ATTEMPTS"
    locked = _reset(client, code)  # even the right code no longer works
    assert locked.status_code == 429 and locked.get_json()["code"] == "TOO_MANY_ATTEMPTS"


def test_reset_code_expires(client, app, mail):
    make_user(app, email="known@example.com")
    client.post("/api/auth/password/forgot", json={"email": "known@example.com"})
    with app.app_context():
        row = AuthCode.query.one()
        row.expires_at = datetime.utcnow() - timedelta(seconds=1)
        db.session.commit()
    resp = _reset(client, mail[-1]["code"])
    assert resp.status_code == 400 and resp.get_json()["code"] == "CODE_EXPIRED"


def test_reset_unknown_email_is_invalid_code(client):
    resp = _reset(client, "123456", email="nobody@example.com")
    assert resp.status_code == 400 and resp.get_json()["code"] == "INVALID_CODE"


def test_change_password_returns_fresh_token_and_revokes_others(client, app):
    user_id = make_user(app, email="me@example.com")
    token = user_token(app, user_id)
    other_device = user_token(app, user_id)
    bad = client.put("/api/auth/password", json={"current_password": "nope", "new_password": "NewPass123"}, headers=auth(token))
    assert bad.status_code == 400
    weak = client.put("/api/auth/password", json={"current_password": PASSWORD, "new_password": "weakweak"}, headers=auth(token))
    assert weak.status_code == 400 and weak.get_json()["code"] == "WEAK_PASSWORD"
    ok = client.put("/api/auth/password", json={"current_password": PASSWORD, "new_password": "NewPass123"}, headers=auth(token))
    assert ok.status_code == 200
    fresh = ok.get_json()["token"]
    assert client.get("/api/auth/me", headers=auth(fresh)).status_code == 200
    assert client.get("/api/auth/me", headers=auth(other_device)).status_code == 401
    assert client.get("/api/auth/me", headers=auth(token)).status_code == 401


def test_profile_email_change_needs_password_and_reverifies(client, app, mail):
    user_id = make_user(app, email="me@example.com", verified=True)
    make_user(app, email="taken@example.com")
    token = user_token(app, user_id)
    no_pw = client.put("/api/auth/profile", json={"email": "new@example.com"}, headers=auth(token))
    assert no_pw.status_code == 400 and no_pw.get_json()["code"] == "INVALID_PASSWORD"
    taken = client.put("/api/auth/profile", json={"email": "taken@example.com", "current_password": PASSWORD}, headers=auth(token))
    assert taken.status_code == 400 and taken.get_json()["code"] == "EMAIL_IN_USE"
    ok = client.put("/api/auth/profile", json={"email": "New@Example.com", "current_password": PASSWORD}, headers=auth(token))
    assert ok.status_code == 200
    body = ok.get_json()
    assert body["user"]["email"] == "new@example.com" and body["user"]["email_verified"] is False
    assert body["verification_sent"] is True and mail[-1]["to"] == "new@example.com"


@pytest.mark.parametrize("payload", [{"name": ""}, {"name": "x" * 101}, {"phone": "call me maybe"}])
def test_profile_validation(client, app, payload):
    token = user_token(app, make_user(app))
    assert client.put("/api/auth/profile", json=payload, headers=auth(token)).status_code == 400


def test_production_without_smtp(tmp_path, mail):
    app = build_app(tmp_path, IS_PRODUCTION=True, SECRET_KEY="a-real-random-secret-value", SMTP_HOST="", SMTP_FROM="")
    client = app.test_client()
    body = register(client).get_json()
    assert body["verification_sent"] is False
    resp = client.post("/api/auth/email/send-code", headers=auth(body["token"]))
    assert resp.status_code == 503 and resp.get_json()["code"] == "EMAIL_NOT_CONFIGURED"
    forgot = client.post("/api/auth/password/forgot", json={"email": "new@example.com"})
    assert forgot.status_code == 503 and forgot.get_json()["code"] == "EMAIL_NOT_CONFIGURED"
    # Same answer for an address without an account (no enumeration).
    assert client.post("/api/auth/password/forgot", json={"email": "x@example.com"}).status_code == 503
    assert mail == []


def test_debug_without_smtp_logs_the_code(tmp_path, caplog):
    app = build_app(tmp_path, SMTP_HOST="", SMTP_FROM="")
    with caplog.at_level("WARNING"):
        body = register(app.test_client()).get_json()
    assert body["verification_sent"] is True
    assert any("HungryBird code for new@example.com" in r.getMessage() for r in caplog.records)


def test_suspended_user_cannot_post_as_guest(client, app):
    city = make_city(app)
    vendor = make_vendor(app, city, "Chai Point")
    user_id = make_user(app)
    token = user_token(app, user_id)
    with app.app_context():
        db.session.get(User, user_id).status = "suspended"
        db.session.commit()
    rate = client.post(f"/api/vendors/{vendor}/rate", json={"rating": 5}, headers=auth(token))
    assert rate.status_code == 403 and rate.get_json()["code"] == "ACCOUNT_SUSPENDED"
    contact = client.post("/api/contact", json={"name": "a", "email": "a@b.co", "message": "hi"}, headers=auth(token))
    assert contact.status_code == 403
    # Reading still works (as a guest).
    assert client.get("/api/vendors?city=jaipur", headers=auth(token)).status_code == 200
    assert client.get("/api/auth/me", headers=auth(token)).status_code == 403


def test_tokens_need_the_app_audience(client, app):
    import jwt
    user_id = make_user(app)
    forged = jwt.encode({"user_id": user_id, "tv": 0, "exp": datetime.utcnow() + timedelta(days=1)},
                        app.config["SECRET_KEY"], algorithm="HS256")
    assert client.get("/api/auth/me", headers=auth(forged)).status_code == 401
    other_key = jwt.encode({"user_id": user_id, "tv": 0, "aud": "hungrybird-app",
                            "exp": datetime.utcnow() + timedelta(days=1)}, "dev-secret-key", algorithm="HS256")
    assert client.get("/api/auth/me", headers=auth(other_key)).status_code == 401


def test_delete_account_keeps_payments_anonymised(client, app):
    from app.models import Payment
    user_id = make_user(app)
    with app.app_context():
        db.session.add(Payment(user_id=user_id, email="user@example.com", days=30, amount_paise=4900,
                               provider_order_id="order_DEL"))
        db.session.commit()
    token = user_token(app, user_id)
    for body in (None, {"current_password": "wrong-password1"}):
        resp = client.delete("/api/auth/account", headers=auth(token), json=body)
        assert resp.status_code == 400 and resp.get_json()["code"] == "INVALID_PASSWORD"
    assert client.delete("/api/auth/account", headers=auth(token), json={"current_password": PASSWORD}).status_code == 200
    with app.app_context():
        assert db.session.get(User, user_id) is None
        assert Payment.query.one().user_id is None


def test_rate_limits(tmp_path, mail):
    app = build_app(tmp_path, RATELIMIT_ENABLED=True)
    client = app.test_client()
    make_user(app, email="victim@example.com")
    codes = [client.post("/api/auth/login", json={"email": "victim@example.com", "password": "x"}).status_code
             for _ in range(6)]
    assert codes[:5] == [401] * 5 and codes[5] == 429
    limited = client.post("/api/auth/login", json={"email": "victim@example.com", "password": "x"})
    assert limited.get_json()["code"] == "RATE_LIMITED"
    regs = [register(client, email=f"r{i}@example.com").status_code for i in range(4)]
    assert regs == [201, 201, 201, 429]
