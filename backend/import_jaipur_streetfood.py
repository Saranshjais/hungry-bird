"""Safely add street-food records from the large Jaipur CSV.

Unlike seed_jaipur_data.py, this importer never drops existing tables or rows.
"""

import csv
import hashlib
import json
import os
import re
import sys

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app import create_app, db
from app.models import City, Vendor


CSV_PATH = os.path.join(os.path.dirname(backend_dir), "jaipur-streetfood.csv")
DEFAULT_IMAGE = "https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=600"


def clean(value):
    return (value or "").strip()


def number(value, fallback=None):
    try:
        return float(clean(value))
    except (TypeError, ValueError):
        return fallback


def normalize_name(value):
    return re.sub(r"[^a-z0-9]+", " ", clean(value).lower()).strip()


def opening_hours(value):
    raw = clean(value)
    if not raw or raw == "{}":
        return "Open Daily"
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            return "; ".join(f"{day}: {', '.join(hours)}" for day, hours in sorted(parsed.items()))[:150]
    except json.JSONDecodeError:
        pass
    return raw[:150]


def vendor_code(place_id):
    digest = hashlib.sha1(place_id.encode("utf-8")).hexdigest()[:16]
    return f"HB-G-{digest}"


def import_records():
    if not os.path.exists(CSV_PATH):
        raise FileNotFoundError(CSV_PATH)

    with open(CSV_PATH, newline="", encoding="utf-8-sig") as source:
        rows = [row for row in csv.DictReader(source) if clean(row.get("is_street_food")).lower() == "yes"]

    # Keep the strongest row when normalized names repeat.
    rows.sort(
        key=lambda row: (
            number(row.get("popularity_score"), 0),
            number(row.get("review_count"), 0),
        ),
        reverse=True,
    )
    selected = []
    seen_names = set()
    for row in rows:
        name = normalize_name(row.get("name_normalized") or row.get("title"))
        place_id = clean(row.get("place_id"))
        if not name or name in seen_names or not place_id:
            continue
        seen_names.add(name)
        selected.append(row)

    app = create_app()
    with app.app_context():
        city = City.query.filter_by(slug="jaipur").first()
        if not city:
            city = City(name="Jaipur", slug="jaipur", state="Rajasthan", country="India", lat=26.9124, lng=75.7873)
            db.session.add(city)
            db.session.flush()

        existing_place_ids = {clean(value) for (value,) in db.session.query(Vendor.place_id).filter(Vendor.place_id.isnot(None)).all()}
        existing_names = {normalize_name(value) for (value,) in db.session.query(Vendor.name).all()}
        added = 0
        skipped_existing = 0

        for row in selected:
            place_id = clean(row.get("place_id"))
            name = clean(row.get("title")) or clean(row.get("name_normalized"))
            normalized = normalize_name(row.get("name_normalized") or name)
            if place_id in existing_place_ids or normalized in existing_names:
                skipped_existing += 1
                continue

            tier = clean(row.get("tier"))
            rating = number(row.get("review_rating"), 4.5)
            reviews = int(number(row.get("review_count"), 0) or 0)
            candidate = tier in {"hidden_gem", "local_street_food"}
            db.session.add(
                Vendor(
                    city_id=city.id,
                    name=name[:200],
                    cuisine_type=clean(row.get("category"))[:200] or "Street Food",
                    is_hidden_gem=tier == "hidden_gem",
                    is_famous=tier == "well_known",
                    avg_rating=rating,
                    total_ratings=reviews,
                    address_text=clean(row.get("address"))[:300],
                    area="Jaipur",
                    description=f"Street-food discovery in Jaipur. {clean(row.get('category'))}"[:1000],
                    specialty_dish=clean(row.get("category"))[:150] or "Street Food Specialty",
                    opening_hours=opening_hours(row.get("open_hours")),
                    lat=number(row.get("latitude")),
                    lng=number(row.get("longitude")),
                    source="jaipur-streetfood.csv",
                    verified_status="verified",
                    place_id=place_id,
                    image_url=DEFAULT_IMAGE,
                    vendor_code=vendor_code(place_id),
                    vendor_type=tier[:80] or "street_food",
                    food_category=clean(row.get("category"))[:80] or "Street Food",
                    phone=clean(row.get("phone"))[:50] or None,
                    website=clean(row.get("website"))[:300] or None,
                    source_url=clean(row.get("link"))[:500] or None,
                    source_type="GOOGLE_MAPS",
                    source_name="Google Maps",
                    verification_level="LEVEL_1_SOURCE_VERIFIED",
                    hidden_gem_candidate=candidate,
                    hidden_gem_score=number(row.get("street_food_score")),
                    hidden_gem_score_status="DATASET_CLASSIFIED" if candidate else None,
                    data_confidence="MEDIUM",
                    notes=f"Imported from jaipur-streetfood.csv; tier={tier or 'unverified'}",
                )
            )
            existing_place_ids.add(place_id)
            existing_names.add(normalized)
            added += 1

        db.session.commit()
        print(f"Selected street-food rows: {len(rows)}")
        print(f"Unique rows selected: {len(selected)}")
        print(f"Skipped already present: {skipped_existing}")
        print(f"Added new vendors: {added}")
        print(f"Total Jaipur vendors: {Vendor.query.filter_by(city_id=city.id).count()}")


if __name__ == "__main__":
    import_records()
