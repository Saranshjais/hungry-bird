from app import create_app, db
from app.models import City

app = create_app()
with app.app_context():
    cities = City.query.all()
    print(f"Found {len(cities)} cities:")
    for city in cities:
        print(f"- {city.name} ({city.slug})")
