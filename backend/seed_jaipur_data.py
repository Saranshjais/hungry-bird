import os
import sys
import csv
from datetime import datetime

# Ensure backend directory is in sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app import create_app, db
from app.models import City, Vendor, User

DATA_DIR = os.path.join(os.path.dirname(backend_dir), 'hungry_bird_data')

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

def seed_database():
    app = create_app()
    with app.app_context():
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

        category_images = {
            'sweets': 'https://images.unsplash.com/photo-1589301760014-d929f39ce9b1?q=80&w=800',
            'dairy_lassi': 'https://images.unsplash.com/photo-1571006682862-3cd6145277d1?q=80&w=800',
            'tea_chai': 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?q=80&w=800',
            'fast_food_snacks': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=800',
            'kachori_samosa': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=800',
            'kulfi_ice_cream': 'https://images.unsplash.com/photo-1560008511-11c63416e52d?q=80&w=800',
            'street_food': 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=800',
            'small_eatery': 'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?q=80&w=800',
            'rajasthani_traditional': 'https://images.unsplash.com/photo-1626777552726-4c2810a41be7?q=80&w=800'
        }
        default_image = 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=800'

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
                    img = category_images.get(cat, default_image)

                    p_min = parse_float(row.get('price_min'))
                    p_max = parse_float(row.get('price_max'))
                    p_lvl = '₹' if p_min and p_min <= 50 else ('₹₹' if p_min else '₹')

                    gem_info = hidden_gems_map.get(raw_code)
                    is_gem = parse_bool(row.get('hidden_gem_candidate')) or bool(gem_info)
                    score_status = row.get('hidden_gem_score_status', '').strip() or ('PENDING_CURATOR_REVIEW' if is_gem else None)

                    v_obj = Vendor(
                        city_id=city_id,
                        vendor_code=code,
                        name=name,
                        vendor_type=row.get('vendor_type', 'street_stall'),
                        area=row.get('area', 'Jaipur').strip() or 'Jaipur',
                        locality=row.get('locality', '').strip(),
                        market=row.get('market', '').strip(),
                        street=row.get('street', '').strip(),
                        landmark=row.get('landmark', '').strip(),
                        address_text=row.get('address', '').strip() or row.get('street', '').strip() or row.get('area', '').strip(),
                        lat=parse_float(row.get('latitude')),
                        lng=parse_float(row.get('longitude')),
                        food_category=cat,
                        food_subcategories=row.get('food_subcategories', '').strip(),
                        cuisine_type=cat.replace('_', ' ').title(),
                        specialty_dish=row.get('signature_dish', '').strip() or 'Local Specialty',
                        price_min=p_min,
                        price_max=p_max,
                        price_level=p_lvl,
                        price_currency=row.get('price_currency', 'INR').strip() or 'INR',
                        opening_time=row.get('opening_time', '').strip(),
                        closing_time=row.get('closing_time', '').strip(),
                        closed_days=row.get('closed_days', '').strip(),
                        opening_hours=f"{row.get('opening_time', '')} - {row.get('closing_time', '')}" if row.get('opening_time') else "Open Daily",
                        phone=row.get('phone', '').strip(),
                        website=row.get('website', '').strip(),
                        instagram=row.get('instagram', '').strip(),
                        source_url=row.get('source_url', '').strip(),
                        source_type=row.get('source_type', '').strip(),
                        source_name=row.get('source_name', '').strip(),
                        verification_level=row.get('verification_level', 'LEVEL_3_BUSINESS_VERIFIED').strip(),
                        verification_status=row.get('verification_status', 'VERIFIED').strip(),
                        verified_status='verified',
                        last_verified_at=row.get('last_verified_at', '2026-08-13').strip(),
                        verified_location=parse_bool(row.get('verified_location')),
                        verified_business=parse_bool(row.get('verified_business')),
                        verified_food_type=parse_bool(row.get('verified_food_type')),
                        hidden_gem_candidate=is_gem,
                        is_hidden_gem=is_gem,
                        hidden_gem_score_status=score_status,
                        description=row.get('notes', '').strip() or row.get('description', '').strip() or f"Famous {name} in {row.get('area', 'Jaipur')}.",
                        image_url=img,
                        avg_rating=4.8 if is_gem else 4.6,
                        total_ratings=120 if is_gem else 85,
                        data_confidence=row.get('data_confidence', 'HIGH').strip() or 'HIGH'
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

                    cat = row.get('food_category', 'street_food').strip() or 'street_food'
                    img = category_images.get(cat, default_image)

                    v_obj = Vendor(
                        city_id=city_id,
                        vendor_code=code,
                        name=name,
                        vendor_type=row.get('vendor_type', 'street_stall').strip() or 'street_stall',
                        area=row.get('area', 'Jaipur').strip() or 'Jaipur',
                        locality=row.get('locality', '').strip(),
                        address_text=row.get('address', '').strip() or row.get('area', 'Jaipur').strip(),
                        lat=parse_float(row.get('latitude')),
                        lng=parse_float(row.get('longitude')),
                        food_category=cat,
                        cuisine_type=cat.replace('_', ' ').title(),
                        specialty_dish=row.get('signature_dish', '').strip() or 'Street Food Specialty',
                        opening_hours="Open Daily",
                        source_url=row.get('source_url', '').strip(),
                        source_type=row.get('source_type', 'OPENSTREETMAP').strip() or 'OPENSTREETMAP',
                        source_name=row.get('source_name', 'OpenStreetMap').strip() or 'OpenStreetMap',
                        verification_level=row.get('verification_level', 'LEVEL_1_SOURCE_VERIFIED').strip() or 'LEVEL_1_SOURCE_VERIFIED',
                        verification_status='CANDIDATE',
                        verified_status='verified',
                        verified_location=parse_bool(row.get('verified_location')),
                        image_url=img,
                        avg_rating=4.5,
                        total_ratings=35,
                        data_confidence=row.get('data_confidence', 'MEDIUM').strip() or 'MEDIUM'
                    )
                    db.session.add(v_obj)
                    added_count += 1

        db.session.commit()
        total_vendors = Vendor.query.count()
        hidden_gems_count = Vendor.query.filter((Vendor.is_hidden_gem == True) | (Vendor.hidden_gem_candidate == True)).count()
        print(f"Database Seeding Complete! Total Vendors in DB: {total_vendors} (Hidden Gems: {hidden_gems_count}).")

if __name__ == '__main__':
    seed_database()
