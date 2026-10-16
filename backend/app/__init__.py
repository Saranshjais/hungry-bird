import json
import math

from flask import Flask, current_app, jsonify, request
from flask.json.provider import DefaultJSONProvider
from werkzeug.exceptions import HTTPException
from werkzeug.middleware.proxy_fix import ProxyFix
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_caching import Cache
from flask_cors import CORS
from flask_limiter import Limiter
from flask_socketio import SocketIO
from .config import Config, check_production_config

db = SQLAlchemy()
migrate = Migrate()
cache = Cache()
socketio = SocketIO()


def client_ip():
    """The caller's IP: CLIENT_IP_HEADER (e.g. CF-Connecting-IP) when configured, else the ProxyFix address."""
    header = current_app.config.get("CLIENT_IP_HEADER")
    if header:
        value = request.headers.get(header, "").split(",")[0].strip()
        if value:
            return value[:100]
    return (request.remote_addr or "")[:100]


# Storage comes from RATELIMIT_STORAGE_URI (memory:// is fine: gunicorn runs one worker).
limiter = Limiter(key_func=client_ip)

DEFAULT_WEBSITE_ORIGIN = "https://hungry-bird-gamma.vercel.app"

ERROR_CODES = {
    400: "VALIDATION", 401: "UNAUTHORIZED", 403: "FORBIDDEN", 404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED", 409: "CONFLICT", 413: "PAYLOAD_TOO_LARGE", 429: "RATE_LIMITED",
}
ERROR_MESSAGES = {
    404: "Not found",
    405: "Method not allowed",
    413: "That upload is too large",
    429: "Too many requests. Please wait a little and try again.",
}


def _finite(value):
    """Replace NaN/Infinity (invalid JSON) with null anywhere in a response payload."""
    if isinstance(value, float):
        return value if math.isfinite(value) else None
    if isinstance(value, dict):
        return {k: _finite(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_finite(v) for v in value]
    return value


def _reject_constant(name):
    raise ValueError(f"{name} is not allowed")


def _parse_finite_float(text):
    value = float(text)
    if not math.isfinite(value):
        raise ValueError("Non-finite numbers are not allowed")
    return value


class SafeJSONProvider(DefaultJSONProvider):
    """Never emit or accept NaN/Infinity: browsers and Dart reject them as invalid JSON."""

    def dumps(self, obj, **kwargs):
        kwargs.setdefault("allow_nan", False)
        return super().dumps(_finite(obj), **kwargs)

    def loads(self, s, **kwargs):
        kwargs.setdefault("parse_constant", _reject_constant)
        kwargs.setdefault("parse_float", _parse_finite_float)
        return json.loads(s, **kwargs)


def _add_error_code(resp):
    """Every JSON error carries a machine code ({"error", "code"}); fill it in where a view didn't."""
    if resp.status_code < 400 or resp.mimetype != "application/json" or resp.direct_passthrough:
        return resp
    try:
        body = json.loads(resp.get_data(as_text=True))
    except ValueError:
        return resp
    if isinstance(body, dict) and "error" in body and "code" not in body:
        body["code"] = ERROR_CODES.get(resp.status_code, "SERVER_ERROR" if resp.status_code >= 500 else "ERROR")
        resp.set_data(json.dumps(body))
    return resp


def allowed_origins(config):
    origins = []
    for raw in (config.get("FRONTEND_URL") or "", config.get("CORS_ORIGINS") or ""):
        origins += [o.strip().rstrip("/") for o in raw.split(",") if o.strip()]
    if origins:
        return origins
    # Local development: any origin (no cookies are used, auth is a Bearer header).
    return [DEFAULT_WEBSITE_ORIGIN] if config.get("IS_PRODUCTION") else "*"


def create_app(config_overrides=None):
    app = Flask(__name__)
    app.json = SafeJSONProvider(app)
    app.config.from_object(Config)
    if config_overrides:
        app.config.update(config_overrides)
    check_production_config(app.config)

    # Behind Render's proxy: trust X-Forwarded-For/Proto (PROXY_FIX_X_FOR hops, default 1) for client
    # IPs and https URLs. Rate limits are keyed on this address, so it must be the real client.
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=app.config.get("PROXY_FIX_X_FOR", 1), x_proto=1)

    db.init_app(app)
    migrate.init_app(app, db)
    cache.init_app(app, config={
        "CACHE_TYPE": app.config.get("CACHE_TYPE", "FileSystemCache"),
        "CACHE_DIR": app.config.get("CACHE_DIR", "instance/cache"),
    })
    origins = allowed_origins(app.config)
    if app.config.get("IS_PRODUCTION") and not (app.config.get("FRONTEND_URL") or app.config.get("CORS_ORIGINS")):
        app.logger.warning("FRONTEND_URL is not set; CORS only allows %s", DEFAULT_WEBSITE_ORIGIN)
    CORS(app, resources={r"/*": {"origins": origins}}, supports_credentials=False)
    socketio.init_app(app, cors_allowed_origins=origins)
    limiter.init_app(app)

    # import blueprints
    from app.routes.main import main_bp
    from app.routes.admin_api import admin_api_bp
    from app.routes.auth_api import auth_api
    from app.routes.premium_api import premium_api

    app.register_blueprint(main_bp, url_prefix="/api")
    app.register_blueprint(admin_api_bp)
    app.register_blueprint(auth_api)
    app.register_blueprint(premium_api)

    # The schema is owned by Alembic (`flask db upgrade`); only the first admin is created here.
    with app.app_context():
        from app.routes.admin_api import _ensure_bootstrap_admin
        _ensure_bootstrap_admin()

    @app.after_request
    def security_headers(resp):
        resp.headers.setdefault("X-Content-Type-Options", "nosniff")
        resp.headers.setdefault("X-Frame-Options", "DENY")
        resp.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        if app.config.get("IS_PRODUCTION"):
            resp.headers.setdefault("Strict-Transport-Security", "max-age=31536000")
        if request.path.startswith(("/api/auth", "/api/admin", "/api/payments", "/api/premium/status")):
            resp.headers.setdefault("Cache-Control", "no-store")
        return _add_error_code(resp)

    @app.errorhandler(HTTPException)
    def api_http_error(err):
        # API clients (mobile app, admin panel, website) always get JSON errors.
        if request.path.startswith("/api/"):
            message = ERROR_MESSAGES.get(err.code) or err.description or "Request failed"
            resp = jsonify({"error": message, "code": ERROR_CODES.get(err.code, f"HTTP_{err.code}")})
            resp.status_code = err.code
            return resp
        return err

    @app.errorhandler(Exception)
    def api_unhandled_error(err):
        if isinstance(err, HTTPException):
            return api_http_error(err)
        app.logger.exception("Unhandled error on %s", request.path)
        if request.path.startswith("/api/"):
            return jsonify({"error": "Something went wrong on our side. Please try again.", "code": "SERVER_ERROR"}), 500
        return "Internal Server Error", 500

    @app.route("/")
    def index():
        return {
            "message": "HungryBird API is running!",
            "version": "1.1.0",
            "endpoints": {
                "cities": "/api/cities",
                "city_details": "/api/city/<slug>",
                "app_config": "/api/app/config",
            },
        }

    return app
