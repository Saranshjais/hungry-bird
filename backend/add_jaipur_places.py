from app import create_app, db
from app.models import City, Vendor

app = create_app()

jaipur_famous_places = [
    {
        "name": "Rawat Mishtan Bhandar",
        "cuisine_type": "Street Food",
        "is_hidden_gem": False,
        "is_famous": True,
        "price_level": "₹₹",
        "address_text": "Sindhi Camp, Jaipur",
        "area": "Sindhi Camp",
        "lat": 26.9200,
        "lng": 75.7950
    },
    {
        "name": "Laxmi Mishtan Bhandar (LMB)",
        "cuisine_type": "Sweets",
        "is_hidden_gem": False,
        "is_famous": True,
        "price_level": "₹₹₹",
        "address_text": "Johari Bazar, Jaipur",
        "area": "Johari Bazar",
        "lat": 26.9239,
        "lng": 75.8267
    },
    {
        "name": "Gulab Ji Chai Wale",
        "cuisine_type": "Beverages",
        "is_hidden_gem": True,
        "is_famous": True,
        "price_level": "₹",
        "address_text": "MI Road, Jaipur",
        "area": "MI Road",
        "lat": 26.9155,
        "lng": 75.8078
    },
    {
        "name": "Pandit Kulfi",
        "cuisine_type": "Desserts",
        "is_hidden_gem": True,
        "is_famous": True,
        "price_level": "₹",
        "address_text": "Hawa Mahal Road, Jaipur",
        "area": "Badi Chaupar",
        "lat": 26.9230,
        "lng": 75.8260
    }
]

with app.app_context():
    # Find or create Jaipur
    city = City.query.filter_by(slug='jaipur').first()
    if not city:
        city = City(name="Jaipur", slug="jaipur", state="Rajasthan", country="India", lat=26.9124, lng=75.7873)
        db.session.add(city)
        db.session.commit()
    
    # Add famous places
    for place_data in jaipur_famous_places:
        existing = Vendor.query.filter_by(name=place_data["name"], city_id=city.id).first()
        if not existing:
            # No invented rating or stock photo: ratings come from real reviews, photos from staff.
            vendor = Vendor(
                city_id=city.id,
                is_premium=place_data["is_hidden_gem"],
                team_verified=False,
                total_ratings=0,
                **place_data
            )
            db.session.add(vendor)
            print(f"Added {vendor.name}")
        else:
            print(f"Skipped {place_data['name']} (already exists)")
            
    db.session.commit()
    print("Database seeding completed.")
