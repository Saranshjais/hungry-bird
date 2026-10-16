import os
import sys
import csv
from datetime import datetime

# Ensure backend directory is in sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app import create_app, db
from app.models import City, Vendor, User, Category

DATA_DIR = os.path.join(os.path.dirname(backend_dir), 'data')

USAGE = """Usage: python seed_jaipur_data.py --reset

Drops EVERY table and rebuilds a local SQLite database with the Jaipur research vendors.
It refuses to touch anything but a local SQLite database unless ALLOW_DESTRUCTIVE_SEED=1.
"""

DEFAULT_CATEGORIES = [
    ('Street Food', 'street-food', '🌮', 'street food, street_food, chaat, golgappa, pani puri'),
    ('Kachori & Samosa', 'kachori-samosa', '🥟', 'kachori, samosa'),
    ('Chai & Tea', 'tea-chai', '☕', 'tea, chai'),
    ('Lassi & Dairy', 'dairy-lassi', '🥛', 'lassi, dairy, milk'),
    ('Sweets', 'sweets', '🍬', 'sweet, mithai, mishtan, dessert'),
    ('Kulfi & Ice Cream', 'kulfi-ice-cream', '🍦', 'kulfi, ice cream, ice_cream'),
    ('Snacks & Fast Food', 'fast-food-snacks', '🍔', 'fast food, fast_food, snack'),
    ('Rajasthani', 'rajasthani-traditional', '🍛', 'rajasthani, dal baati, thali'),
]


def clean(val):
    """Stripped text, or None for empty / 'null' cells (never a made-up default)."""
    val = (val or '').strip()
    return None if not val or val.lower() == 'null' else val

def parse_float(val):
    if not val or val.strip() == '' or val.strip().lower() == 'null':
        return None
    try:
        return float(val.strip())
    except ValueError:
        return None

def parse_bool(val):
    if not val:
        return False
    return str(val).strip().lower() in ('true', '1', 'yes', 't')

def _guard_destructive(app):
    """drop_all() only ever runs on a local SQLite file, never on whatever DATABASE_URL points at."""
    url = str(app.config["SQLALCHEMY_DATABASE_URI"])
    if app.config.get("IS_PRODUCTION"):
        sys.exit("Refusing to reset a production database.")
    if not url.startswith("sqlite:") and os.getenv("ALLOW_DESTRUCTIVE_SEED") != "1":
        sys.exit(f"Refusing to drop tables on {db.engine.url.render_as_string(hide_password=True)} "
                 "(set ALLOW_DESTRUCTIVE_SEED=1 if you really mean it).")


def seed_database():
    if "--reset" not in sys.argv:
        sys.exit(USAGE)
    app = create_app()
    with app.app_context():
        _guard_destructive(app)
        print("Recreating database tables for fresh schema...")
        db.drop_all()
        db.create_all()

        # Seed Jaipur City
        jaipur = City.query.filter_by(slug='jaipur').first()
        if not jaipur:
            print("Creating Jaipur City record...")
            jaipur = City(
                name='Jaipur',
                slug='jaipur',
                state='Rajasthan',
                country='India',
                lat=26.9124,
                lng=75.7873
            )
            db.session.add(jaipur)
            db.session.commit()

        city_id = jaipur.id

        hidden_gems_map = {}
        gem_csv = os.path.join(DATA_DIR, 'hidden_gem_candidates.csv')
        if os.path.exists(gem_csv):
            with open(gem_csv, mode='r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    cid = row.get('vendor_id', '').strip()
                    if cid:
                        hidden_gems_map[cid] = row

        seen_codes = set()
        seen_names = set()
        added_count = 0

        # 1. Process jaipur_vendor_documented_sample.csv (23 Anchor vendors)
        doc_csv = os.path.join(DATA_DIR, 'jaipur_vendor_documented_sample.csv')
        if os.path.exists(doc_csv):
            print(f"Reading documented vendors from {doc_csv}...")
            with open(doc_csv, mode='r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    raw_code = row.get('vendor_id', '').strip()
                    name = row.get('vendor_name', '').strip()
                    if not name or name in seen_names:
                        continue

                    seen_names.add(name)

                    if raw_code and raw_code not in seen_codes:
                        code = raw_code
                    else:
                        code = f"HB-DOC-{added_count+1:04d}"
                    seen_codes.add(code)

                    cat = row.get('food_category', '').strip()

                    p_min = parse_float(row.get('price_min'))
                    p_max = parse_float(row.get('price_max'))
                    # Only derive a price band from a real price; unknown stays unknown.
                    p_lvl = ('₹' if p_min <= 50 else '₹₹') if p_min else None
                    opening, closing = clean(row.get('opening_time')), clean(row.get('closing_time'))

                    gem_info = hidden_gems_map.get(raw_code)
                    is_gem = parse_bool(row.get('hidden_gem_candidate')) or bool(gem_info)
                    score_status = row.get('hidden_gem_score_status', '').strip() or ('PENDING_CURATOR_REVIEW' if is_gem else None)

                    v_obj = Vendor(
                        city_id=city_id,
                        vendor_code=code,
                        name=name,
                        vendor_type=row.get('vendor_type', 'street_stall'),
                        area=clean(row.get('area')),
                        locality=clean(row.get('locality')),
                        market=clean(row.get('market')),
                        street=clean(row.get('street')),
                        landmark=clean(row.get('landmark')),
                        address_text=clean(row.get('address')) or clean(row.get('street')),
                        lat=parse_float(row.get('latitude')),
                        lng=parse_float(row.get('longitude')),
                        food_category=cat,
                        food_subcategories=row.get('food_subcategories', '').strip(),
                        cuisine_type=cat.replace('_', ' ').title(),
                        specialty_dish=clean(row.get('signature_dish')),
                        price_min=p_min,
                        price_max=p_max,
                        price_level=p_lvl,
                        price_currency=row.get('price_currency', 'INR').strip() or 'INR',
                        opening_time=opening,
                        closing_time=closing,
                        closed_days=clean(row.get('closed_days')),
                        opening_hours=f"{opening} - {closing}" if opening and closing else None,
                        phone=clean(row.get('phone')),
                        website=clean(row.get('website')),
                        instagram=clean(row.get('instagram')),
                        source_url=row.get('source_url', '').strip(),
                        source_type=row.get('source_type', '').strip(),
                        source_name=row.get('source_name', '').strip(),
                        verification_level=clean(row.get('verification_level')),
                        verification_status=clean(row.get('verification_status')),
                        verified_status='verified',
                        last_verified_at=clean(row.get('last_verified_at')),
                        verified_location=parse_bool(row.get('verified_location')),
                        verified_business=parse_bool(row.get('verified_business')),
                        verified_food_type=parse_bool(row.get('verified_food_type')),
                        hidden_gem_candidate=is_gem,
                        is_hidden_gem=is_gem,
                        is_premium=is_gem,
                        team_verified=False,
                        hidden_gem_score_status=score_status,
                        description=clean(row.get('description')),
                        notes=clean(row.get('notes')),
                        # No stock photo and no rating: ratings come only from real reviews.
                        image_url=None,
                        avg_rating=None,
                        total_ratings=0,
                        data_confidence=clean(row.get('data_confidence'))
                    )
                    db.session.add(v_obj)
                    added_count += 1

        # 2. Process jaipur_vendor_candidates.csv (284 mapped candidates)
        cand_csv = os.path.join(DATA_DIR, 'jaipur_vendor_candidates.csv')
        if os.path.exists(cand_csv):
            print(f"Reading vendor candidates from {cand_csv}...")
            with open(cand_csv, mode='r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    raw_code = row.get('vendor_id', '').strip()
                    name = row.get('vendor_name', '').strip()
                    if not name or name.lower() == 'null' or name in seen_names:
                        continue

                    seen_names.add(name)

                    if raw_code and raw_code not in seen_codes:
                        code = raw_code
                    else:
                        code = f"HB-OSM-{added_count+1:04d}"
                    seen_codes.add(code)

                    cat = clean(row.get('food_category'))

                    v_obj = Vendor(
                        city_id=city_id,
                        vendor_code=code,
                        name=name,
                        vendor_type=clean(row.get('vendor_type')),
                        area=clean(row.get('area')),
                        locality=clean(row.get('locality')),
                        address_text=clean(row.get('address')),
                        lat=parse_float(row.get('latitude')),
                        lng=parse_float(row.get('longitude')),
                        food_category=cat,
                        cuisine_type=cat.replace('_', ' ').title() if cat else None,
                        specialty_dish=clean(row.get('signature_dish')),
                        opening_hours=None,
                        source_url=row.get('source_url', '').strip(),
                        source_type=row.get('source_type', 'OPENSTREETMAP').strip() or 'OPENSTREETMAP',
                        source_name=row.get('source_name', 'OpenStreetMap').strip() or 'OpenStreetMap',
                        verification_level=clean(row.get('verification_level')),
                        verification_status='CANDIDATE',
                        verified_status='verified',
                        verified_location=parse_bool(row.get('verified_location')),
                        is_premium=True,
                        team_verified=False,
                        image_url=None,
                        avg_rating=None,
                        total_ratings=0,
                        data_confidence=clean(row.get('data_confidence'))
                    )
                    db.session.add(v_obj)
                    added_count += 1

        # Default app categories (slugs mirror the food_category data keys)
        if Category.query.count() == 0:
            for i, (name, slug, icon, keywords) in enumerate(DEFAULT_CATEGORIES):
                db.session.add(Category(name=name, slug=slug, icon=icon, keywords=keywords, sort_order=i, is_active=True))

        db.session.commit()
        # create_all() built the current schema, so record it as fully migrated.
        from flask_migrate import stamp
        stamp(directory=os.path.join(backend_dir, 'migrations'))
        total_vendors = Vendor.query.count()
        hidden_gems_count = Vendor.query.filter((Vendor.is_hidden_gem == True) | (Vendor.hidden_gem_candidate == True)).count()
        print(f"Database Seeding Complete! Total Vendors in DB: {total_vendors} (Hidden Gems: {hidden_gems_count}).")

if __name__ == '__main__':
    seed_database()
