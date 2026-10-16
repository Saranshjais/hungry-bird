import os


def _env_flag(name):
    return os.getenv(name, "").strip().lower() in ("1", "true", "yes", "on")


# Render sets RENDER=true on every service; APP_ENV / FLASK_ENV are explicit overrides.
IS_PRODUCTION = (
    os.getenv("RENDER") == "true"
    or os.getenv("APP_ENV") == "production"
    or os.getenv("FLASK_ENV") == "production"
)

# Values that must never sign tokens in production (old defaults / leaked examples).
INSECURE_SECRET_KEYS = {"", "dev-secret-key", "hungrybird-secret"}


class Config:
    IS_PRODUCTION = IS_PRODUCTION

    # Security
    SECRET_KEY = os.getenv("SECRET_KEY") or "dev-secret-key"
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")  # Must be set via environment variable

    # Database (production requires DATABASE_URL; the SQLite file is for local development only)
    DATABASE_URL = os.getenv("DATABASE_URL", "")
    db_url = DATABASE_URL or "sqlite:///hungrybird.db"
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    SQLALCHEMY_DATABASE_URI = db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}

    # Request size: JSON bodies stay small; upload endpoints raise this per request.
    MAX_CONTENT_LENGTH = 2 * 1024 * 1024
    MAX_REEL_UPLOAD_BYTES = 50 * 1024 * 1024
    MAX_BULK_UPLOAD_BYTES = 10 * 1024 * 1024

    # API Keys
    GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

    # Website origins allowed by CORS / Socket.IO (comma separated).
    FRONTEND_URL = os.getenv("FRONTEND_URL", "")
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "")

    # Client IP behind proxies (rate-limit key): trusted X-Forwarded-For hops, or a header set by the edge.
    PROXY_FIX_X_FOR = int(os.getenv("PROXY_FIX_X_FOR") or 1)
    CLIENT_IP_HEADER = os.getenv("CLIENT_IP_HEADER", "").strip()

    # Rate limiting (Flask-Limiter). One gunicorn worker, so in-memory storage is shared.
    RATELIMIT_ENABLED = True
    RATELIMIT_STORAGE_URI = os.getenv("RATELIMIT_STORAGE_URI", "memory://")
    RATELIMIT_HEADERS_ENABLED = True

    # Email (verification + password reset codes)
    SMTP_HOST = os.getenv("SMTP_HOST", "")
    SMTP_PORT = int(os.getenv("SMTP_PORT") or 0)
    SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM = os.getenv("SMTP_FROM", "")
    SMTP_SECURITY = (os.getenv("SMTP_SECURITY") or "starttls").strip().lower()  # starttls | ssl | none

    # Payments (Razorpay)
    RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
    RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
    RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")

    # Pagination / limits (future-proofing)
    ITEMS_PER_PAGE = 12

    # Deployment mode: debug only when asked for explicitly, never in production.
    ENV = "production" if IS_PRODUCTION else os.getenv("FLASK_ENV", "development")
    DEBUG = _env_flag("FLASK_DEBUG") and not IS_PRODUCTION


def check_production_config(config):
    """Refuse to boot a production server with unsafe settings (Render keeps the old deploy running)."""
    if not config.get("IS_PRODUCTION"):
        return
    problems = []
    if (config.get("SECRET_KEY") or "").strip() in INSECURE_SECRET_KEYS:
        problems.append("SECRET_KEY is missing or uses a known default")
    if not config.get("DATABASE_URL"):
        problems.append("DATABASE_URL is not set")
    if problems:
        raise RuntimeError("Refusing to start in production: " + "; ".join(problems))
