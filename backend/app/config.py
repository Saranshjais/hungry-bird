import os

class Config:
    # Security
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

    # Database
    db_url = os.getenv("DATABASE_URL", "sqlite:///hungrybird.db")
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    SQLALCHEMY_DATABASE_URI = db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # API Keys
    GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

    # Pagination / limits (future-proofing)
    ITEMS_PER_PAGE = 12

    # Deployment mode
    ENV = os.getenv("FLASK_ENV", "development")
    DEBUG = ENV == "development"
