import sys
sys.path.append('.')
from app import create_app, db
from app.models import Vendor

app = create_app()
with app.app_context():
    vendors = Vendor.query.filter(Vendor.image_url != None).limit(5).all()
    for v in vendors:
        print(f"Vendor: {v.name}")
        print(f"URL: {v.image_url}")
        print("-" * 20)
