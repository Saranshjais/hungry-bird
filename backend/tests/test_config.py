"""Production start-up checks, JSON safety and response headers."""
import json

import pytest

from conftest import build_app


@pytest.mark.parametrize("secret", ["dev-secret-key", "hungrybird-secret", ""])
def test_production_refuses_default_secret_key(tmp_path, secret):
    with pytest.raises(RuntimeError, match="SECRET_KEY"):
        build_app(tmp_path, IS_PRODUCTION=True, SECRET_KEY=secret)


def test_production_refuses_missing_database_url(tmp_path):
    with pytest.raises(RuntimeError, match="DATABASE_URL"):
        build_app(tmp_path, IS_PRODUCTION=True, SECRET_KEY="a-real-random-secret-value", DATABASE_URL="")


def test_production_starts_with_safe_config(tmp_path):
    app = build_app(tmp_path, IS_PRODUCTION=True, SECRET_KEY="a-real-random-secret-value")
    assert app.config["IS_PRODUCTION"] is True
    assert not app.debug
    resp = app.test_client().get("/api/cities")
    assert resp.status_code == 200
    assert resp.headers["Strict-Transport-Security"].startswith("max-age=")


def test_json_never_contains_nan(app):
    with app.app_context():
        body = app.json.dumps({"a": float("nan"), "b": [float("inf"), 1.5]})
    assert json.loads(body) == {"a": None, "b": [None, 1.5]}


def test_security_headers_and_error_codes(client):
    resp = client.get("/api/does-not-exist")
    assert resp.status_code == 404
    assert resp.get_json() == {"error": "Not found", "code": "NOT_FOUND"}
    assert resp.headers["X-Content-Type-Options"] == "nosniff"
    assert resp.headers["X-Frame-Options"] == "DENY"
    assert resp.headers["Referrer-Policy"]


@pytest.mark.parametrize("path,method", [
    ("/api/seed", "get"), ("/api/guides", "get"), ("/api/auth/test-push", "post"), ("/admin/submissions", "get"),
])
def test_removed_endpoints(client, path, method):
    assert getattr(client, method)(path).status_code == 404


def test_cors_is_not_credentialed(client):
    resp = client.get("/api/cities", headers={"Origin": "https://example.org"})
    assert resp.headers.get("Access-Control-Allow-Credentials") is None
