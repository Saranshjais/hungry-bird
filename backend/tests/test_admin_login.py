"""Staff login and first-admin bootstrap (no built-in credentials any more)."""
import pytest

from app import db
from app.models import AdminUser

from conftest import build_app, make_admin


def _admin_count(app):
    with app.app_context():
        return AdminUser.query.count()


def test_login_with_staff_account(client, app):
    make_admin(app, role="super_admin", username="owner")
    resp = client.post("/api/admin/login", json={"username": "owner", "password": "AdminPassw0rd!"})
    assert resp.status_code == 200, resp.get_data(as_text=True)
    payload = resp.get_json()
    assert "token" in payload
    assert payload["admin"]["username"] == "owner"


def test_wrong_password_and_unknown_user_look_the_same(client, app):
    make_admin(app, role="super_admin", username="owner")
    wrong = client.post("/api/admin/login", json={"username": "owner", "password": "nope"})
    unknown = client.post("/api/admin/login", json={"username": "ghost", "password": "nope"})
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.get_json() == unknown.get_json()


def test_old_default_credentials_do_not_exist(client, app):
    resp = client.post("/api/admin/login", json={"username": "saransh", "password": "Sara@123"})
    assert resp.status_code == 401
    # Logging in never creates an account either.
    assert _admin_count(app) == 0


def test_no_default_admin_without_env(app):
    assert _admin_count(app) == 0


def _bootstrap_app(tmp_path, **cfg):
    first = build_app(tmp_path)  # creates the schema in a fresh file
    uri = first.config["SQLALCHEMY_DATABASE_URI"]
    return build_app(tmp_path, SQLALCHEMY_DATABASE_URI=uri, DATABASE_URL=uri, **cfg)


def test_bootstrap_admin_from_env(tmp_path):
    app = _bootstrap_app(tmp_path, ADMIN_USERNAME="owner", ADMIN_EMAIL="Owner@Example.com",
                         ADMIN_PASSWORD="a-long-enough-password")
    with app.app_context():
        admins = AdminUser.query.all()
        assert [(a.username, a.email, a.role) for a in admins] == [("owner", "owner@example.com", "super_admin")]
    resp = app.test_client().post("/api/admin/login", json={"username": "owner", "password": "a-long-enough-password"})
    assert resp.status_code == 200


@pytest.mark.parametrize("cfg", [
    {"ADMIN_USERNAME": "owner", "ADMIN_EMAIL": "o@example.com", "ADMIN_PASSWORD": "short-pass"},  # < 12 chars
    {"ADMIN_USERNAME": "owner", "ADMIN_EMAIL": None, "ADMIN_PASSWORD": "a-long-enough-password"},
    {"ADMIN_USERNAME": None, "ADMIN_EMAIL": "o@example.com", "ADMIN_PASSWORD": "a-long-enough-password"},
])
def test_bootstrap_requires_all_env_and_strong_password(tmp_path, cfg):
    app = _bootstrap_app(tmp_path, **cfg)
    assert _admin_count(app) == 0


def test_admin_token_has_audience_and_consumer_token_is_rejected(client, app):
    from conftest import make_user, user_token, auth
    make_admin(app, role="super_admin", username="owner")
    token = client.post("/api/admin/login", json={"username": "owner", "password": "AdminPassw0rd!"}).get_json()["token"]
    assert client.get("/api/admin/me", headers=auth(token)).status_code == 200
    consumer = user_token(app, make_user(app))
    assert client.get("/api/admin/me", headers=auth(consumer)).status_code == 401
    # ...and a staff token is not a consumer token.
    assert client.get("/api/auth/me", headers=auth(token)).status_code == 401
    with app.app_context():
        db.session.remove()
