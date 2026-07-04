from flask import Flask
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

    db.init_app(app)
    migrate.init_app(app, db)
    cache.init_app(app, config={'CACHE_TYPE': 'FileSystemCache', 'CACHE_DIR': 'instance/cache'})
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})
    socketio.init_app(app)

    # import blueprints
    from app.routes.main import main_bp
    from app.routes.admin_api import admin_api_bp
    from app.routes.auth_api import auth_api

    app.register_blueprint(main_bp, url_prefix="/api")
    app.register_blueprint(admin_api_bp)
    app.register_blueprint(auth_api)

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
            "frontend_url": "http://localhost:5174"
        }

    return app
