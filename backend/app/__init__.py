import os

from flask import Flask, jsonify, request
from werkzeug.exceptions import HTTPException
from werkzeug.middleware.proxy_fix import ProxyFix
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_caching import Cache
from flask_cors import CORS
from flask_socketio import SocketIO
from .config import Config

db = SQLAlchemy()
migrate = Migrate()
cache = Cache()
cors = CORS()
socketio = SocketIO(cors_allowed_origins="*")

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    # Behind Render's proxy: trust X-Forwarded-Proto/Host so generated URLs use https.
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

    db.init_app(app)
    migrate.init_app(app, db)
    cache.init_app(app, config={'CACHE_TYPE': 'FileSystemCache', 'CACHE_DIR': 'instance/cache'})
    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)
    socketio.init_app(app)

    # import blueprints
    from app.routes.main import main_bp
    from app.routes.admin_api import admin_api_bp
    from app.routes.auth_api import auth_api

    app.register_blueprint(main_bp, url_prefix="/api")
    app.register_blueprint(admin_api_bp)
    app.register_blueprint(auth_api)

    with app.app_context():
        # Create any tables that are missing without trying to recreate existing PostgreSQL objects.
        for table in db.metadata.sorted_tables:
            table.create(bind=db.engine, checkfirst=True)
        from app.routes.admin_api import _ensure_bootstrap_admin
        _ensure_bootstrap_admin()

    @app.errorhandler(HTTPException)
    def api_http_error(err):
        # API clients (mobile app, admin panel) always get JSON errors.
        if request.path.startswith("/api/"):
            messages = {404: "Not found", 405: "Method not allowed"}
            return jsonify({"error": messages.get(err.code, err.description)}), err.code
        return err

    @app.errorhandler(Exception)
    def api_unhandled_error(err):
        if isinstance(err, HTTPException):
            return api_http_error(err)
        app.logger.exception("Unhandled error on %s", request.path)
        if request.path.startswith("/api/"):
            return jsonify({"error": "Something went wrong on our side. Please try again."}), 500
        return "Internal Server Error", 500

    @app.route("/")
    def index():
        return {
            "message": "HungryBird API is running!",
            "version": "1.0.0",
            "endpoints": {
                "cities": "/api/cities",
                "city_details": "/api/city/<slug>",
                "submit_vendor": "/api/submit-vendor"
            },
            "frontend_url": os.getenv("FRONTEND_URL", "http://localhost:5174")
        }

    return app
