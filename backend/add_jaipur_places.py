from app import create_app, db
from app.models import City, Vendor

app = create_app()

jaipur_famous_places = [
    {
        "name": "Rawat Mishtan Bhandar",
        "cuisine_type": "Street Food",
        "is_hidden_gem": False,
        "is_famous": True,
        "avg_rating": 4.8,
        "price_level": "₹₹",
        "address_text": "Sindhi Camp, Jaipur",
        "area": "Sindhi Camp",
        "lat": 26.9200,
        "lng": 75.7950,
        "image_url": "https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=400&auto=format&fit=crop"
    },
    {
        "name": "Laxmi Mishtan Bhandar (LMB)",
        "cuisine_type": "Sweets",
        "is_hidden_gem": False,
        "is_famous": True,
        "avg_rating": 4.6,
        "price_level": "₹₹₹",
        "address_text": "Johari Bazar, Jaipur",
        "area": "Johari Bazar",
        "lat": 26.9239,
        "lng": 75.8267,
        "image_url": "https://images.unsplash.com/photo-1555126634-323283e090fa?q=80&w=400&auto=format&fit=crop"
    },
    {
        "name": "Gulab Ji Chai Wale",
        "cuisine_type": "Beverages",
        "is_hidden_gem": True,
        "is_famous": True,
        "avg_rating": 4.9,
        "price_level": "₹",
        "address_text": "MI Road, Jaipur",
        "area": "MI Road",
        "lat": 26.9155,
        "lng": 75.8078,
        "image_url": "https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=400&auto=format&fit=crop"
    },
    {
        "name": "Pandit Kulfi",
        "cuisine_type": "Desserts",
        "is_hidden_gem": True,
        "is_famous": True,
        "avg_rating": 4.7,
        "price_level": "₹",
        "address_text": "Hawa Mahal Road, Jaipur",
        "area": "Badi Chaupar",
        "lat": 26.9230,
        "lng": 75.8260,
        "image_url": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?q=80&w=400&auto=format&fit=crop"
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
            vendor = Vendor(
                city_id=city.id,
                **place_data
            )
            db.session.add(vendor)
            print(f"Added {vendor.name}")
        else:
            print(f"Skipped {place_data['name']} (already exists)")
            
    db.session.commit()
    print("Database seeding completed.")
