import os

from dotenv import load_dotenv
load_dotenv()  # Load environment variables first!

from app import create_app, db

app = create_app()

if __name__ == "__main__":
    # Debug only with FLASK_DEBUG=1 (never in production, see app/config.py).
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=app.config["DEBUG"])
