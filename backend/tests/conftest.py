"""Shared fixtures. Every test app uses its own temporary SQLite file.

The environment is scrubbed BEFORE the app package is imported, so a DATABASE_URL (or any other
deployment setting) in the shell can never point the tests at a real database.
"""
import os
import sys
from datetime import datetime, timedelta

import pytest

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

for _var in (
    "DATABASE_URL", "APP_ENV", "RENDER", "FLASK_ENV", "FLASK_DEBUG", "SECRET_KEY", "FRONTEND_URL", "CORS_ORIGINS",
    "ADMIN_USERNAME", "ADMIN_EMAIL", "ADMIN_PASSWORD", "ADMIN_NAME", "RATELIMIT_STORAGE_URI",
    "PROXY_FIX_X_FOR", "CLIENT_IP_HEADER",
    "SMTP_HOST", "SMTP_PORT", "SMTP_USERNAME", "SMTP_PASSWORD", "SMTP_FROM", "SMTP_SECURITY",
    "RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET",
):
    os.environ.pop(_var, None)

from app import create_app, db, limiter  # noqa: E402
import app.emailer as hb_emailer  # noqa: E402
from app.helpers import issue_user_token, save_settings  # noqa: E402
from app.models import AdminUser, City, User, Vendor  # noqa: E402
from werkzeug.security import generate_password_hash  # noqa: E402

PASSWORD = "Passw0rd123"


def fast_hash(password):
    # Test fixtures skip the (slow) production scrypt work factor; logins verify any method.
    return generate_password_hash(password, method="pbkdf2:sha256:2000")

BASE_CONFIG = {
    "TESTING": True,
    "IS_PRODUCTION": False,
    "SECRET_KEY": "test-secret-key-not-for-production",
    "RATELIMIT_ENABLED": False,
    "CACHE_TYPE": "NullCache",
    "SMTP_HOST": "smtp.example.test",
    "SMTP_FROM": "HungryBird <no-reply@example.test>",
    "RAZORPAY_KEY_ID": "",
    "RAZORPAY_KEY_SECRET": "",
    "RAZORPAY_WEBHOOK_SECRET": "",
    "ADMIN_USERNAME": None,
    "ADMIN_EMAIL": None,
    "ADMIN_PASSWORD": None,
}


def build_app(tmp_path, **overrides):
    """A test app on a SQLite file inside pytest's tmp_path (pass SQLALCHEMY_DATABASE_URI to reuse one)."""
    if "SQLALCHEMY_DATABASE_URI" not in overrides:
        db_file = tmp_path / f"hb-test-{len(list(tmp_path.iterdir()))}.db"
        overrides["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{db_file.as_posix()}"
        overrides.setdefault("DATABASE_URL", overrides["SQLALCHEMY_DATABASE_URI"])
    uri = overrides["SQLALCHEMY_DATABASE_URI"]
    # Safety net: tables are only ever created in a temporary SQLite file.
    assert uri.startswith("sqlite:///") and uri[len("sqlite:///"):].startswith(tmp_path.as_posix()), uri
    application = create_app({**BASE_CONFIG, "DATABASE_URL": uri, **overrides})
    with application.app_context():
        assert str(db.engine.url) == uri
        db.create_all()
    if application.config["RATELIMIT_ENABLED"]:
        limiter.reset()
    return application


@pytest.fixture
def app(tmp_path):
    application = build_app(tmp_path)
    yield application
    with application.app_context():
        db.session.remove()
        db.engine.dispose()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def mail(monkeypatch):
    """Captures outgoing code emails instead of talking to SMTP."""
    sent = []
    monkeypatch.setattr(hb_emailer, "send_code_email", lambda to, code: sent.append({"to": to, "code": code}))
    return sent


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def make_city(app, slug="jaipur", name="Jaipur", **kw):
    with app.app_context():
        city = City(name=name, slug=slug, country="India", is_active=kw.pop("is_active", True),
                    sort_order=kw.pop("sort_order", 0), **kw)
        db.session.add(city)
        db.session.commit()
        return city.id


def make_vendor(app, city_id, name, **kw):
    defaults = dict(verified_status="verified", is_hidden_gem=False, is_famous=False, is_premium=False,
                    team_verified=False, total_ratings=0)
    defaults.update(kw)
    with app.app_context():
        vendor = Vendor(city_id=city_id, name=name, **defaults)
        db.session.add(vendor)
        db.session.commit()
        return vendor.id


def make_user(app, email="user@example.com", name="Test User", verified=False, premium_days=None, password=PASSWORD):
    with app.app_context():
        user = User(name=name, email=email, email_verified=verified, token_version=0,
                    password_hash=fast_hash(password))
        if premium_days is not None:
            user.premium_until = datetime.utcnow() + timedelta(days=premium_days)
        db.session.add(user)
        db.session.commit()
        return user.id


def user_token(app, user_id):
    with app.app_context():
        return issue_user_token(db.session.get(User, user_id))


def set_settings(app, **values):
    with app.app_context():
        save_settings(values)


def make_admin(app, role="super_admin", username=None, password="AdminPassw0rd!"):
    username = username or role
    with app.app_context():
        admin = AdminUser(name=f"{role} person", email=f"{username}@staff.test", username=username,
                          role=role, is_active=True, password_hash=fast_hash(password))
        db.session.add(admin)
        db.session.commit()
        return admin.id


def admin_token(client, app, role="super_admin", username=None):
    username = username or role
    make_admin(app, role=role, username=username)
    resp = client.post("/api/admin/login", json={"username": username, "password": "AdminPassw0rd!"})
    assert resp.status_code == 200, resp.get_data(as_text=True)
    return resp.get_json()["token"]
