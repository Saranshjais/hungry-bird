"""launch: email codes, token revocation, premium passes + Razorpay payments, food trails,
city/category content fields, and removal of fabricated vendor data

Schema (every step checks the live schema first, like e7a1c9d2f3b4, so it is safe on databases
whose tables were created by db.create_all()):
- users: email_verified, token_version, premium_until
- vendors: is_premium (backfilled from the public "hidden gem" flag), team_verified
- cities: description, image_url, is_active, sort_order (descriptions of the three launch cities
  that used to be hard-coded in routes/main.py are copied into rows)
- categories: keywords (filter words for the default categories)
- new tables: auth_codes, subscription_plans (two example passes), payments, subscription_events,
  trails (the two Jaipur trails that used to be hard-coded in routes/main.py)

Data (not reversible):
- NaN/Infinity numbers are removed (deleted ratings/site reviews, NULL coordinates/prices)
- avg_rating / total_ratings are recomputed for EVERY vendor from real `ratings` rows, which
  removes the ratings the seed/import scripts invented (4.5/35, 4.6/85, 4.8/120, Google copies)
- seed placeholders are cleared: opening_hours "Open Daily", specialty_dish "Local Specialty" /
  "Street Food Specialty", generic import descriptions, area equal to the city name, and the
  review text "Initial rating from submitter"; curator research notes that the seed stored as the
  public description of the documented (HB-DOC-*) vendors are moved to vendors.notes

Revision ID: f4b8c2d6a9e1
Revises: e7a1c9d2f3b4
Create Date: 2026-10-16 12:00:00.000000

"""
import json
import math
from datetime import datetime

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f4b8c2d6a9e1'
down_revision = 'e7a1c9d2f3b4'
branch_labels = None
depends_on = None


CITY_DESCRIPTIONS = {
    'jaipur': 'Famous for Dal Baati Churma, rich spices, and traditional Rajasthani flavors.',
    'delhi': 'Known for Chole Bhature, Golgappa, and diverse Mughlai cuisine.',
    'mumbai': 'Popular for Vada Pav, Pav Bhaji, and vibrant street food culture.',
}

CATEGORY_KEYWORDS = {
    'street-food': 'street food, street_food, chaat, golgappa, pani puri',
    'kachori-samosa': 'kachori, samosa',
    'tea-chai': 'tea, chai',
    'dairy-lassi': 'lassi, dairy, milk',
    'sweets': 'sweet, mithai, mishtan, dessert',
    'kulfi-ice-cream': 'kulfi, ice cream, ice_cream',
    'fast-food-snacks': 'fast food, fast_food, snack',
    'rajasthani-traditional': 'rajasthani, dal baati, thali',
}

# Example passes only: premium stays switched off until the owner sets real prices and enables it.
DEFAULT_PLANS = [
    ('Monthly pass', '30 days of HungryBird Premium.', 4900, 30, 0),
    ('Yearly pass', '365 days of HungryBird Premium.', 39900, 365, 1),
]

# Content that used to be hard-coded in GET /api/trails.
JAIPUR_TRAILS = [
    {
        'title': 'Walled City Old Heritage Food Trail',
        'description': "Explore 100+ year old street food legends inside Jaipur's Pink City.",
        'duration_text': '2.5 hours',
        'price_text': '₹150 - ₹250',
        'stops': ['Lassiwala Shop 312', 'Sahu Ki Chai', 'Laxmi Misthan Bhandar', 'PP Samosa', 'Pandit Kulfi'],
        'image_url': 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=800',
    },
    {
        'title': 'Masala Chowk Food Court Safari',
        'description': 'All famous Jaipur street-food stalls in one beautiful garden food court.',
        'duration_text': '1.5 hours',
        'price_text': '₹100 - ₹200',
        'stops': ['Gopal Singh Patasi', 'Sethani Ka Dhaba', 'Mahaveer Rabri Bhandar', 'Samrat Street Food'],
        'image_url': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=800',
    },
]


RESEARCH_NOTE_MARKERS = ('source', 'osm', 'rule ', 'official site', 'food media', 'food-media', 'homegrown',
                         'corroborated', 'aggregator', 'article')


def _columns(inspector, table):
    return {c['name'] for c in inspector.get_columns(table)}


def _add_missing_columns(inspector, table, columns):
    """Add the (name, Column) pairs that don't exist yet. Returns the names that were added."""
    existing = _columns(inspector, table)
    missing = [(name, col) for name, col in columns if name not in existing]
    if missing:
        with op.batch_alter_table(table) as batch:
            for _, col in missing:
                batch.add_column(col)
    return {name for name, _ in missing}


def _not_finite(value):
    return value is not None and isinstance(value, float) and not math.isfinite(value)


def _null_non_finite(bind, table, columns):
    rows = bind.execute(sa.text(f"SELECT id, {', '.join(columns)} FROM {table}")).fetchall()
    for row in rows:
        for i, col in enumerate(columns, start=1):
            if _not_finite(row[i]):
                bind.execute(sa.text(f"UPDATE {table} SET {col} = NULL WHERE id = :id"), {'id': row[0]})


def _delete_non_finite(bind, table, column):
    rows = bind.execute(sa.text(f"SELECT id, {column} FROM {table}")).fetchall()
    bad = [r[0] for r in rows if _not_finite(r[1])]
    for row_id in bad:
        bind.execute(sa.text(f"DELETE FROM {table} WHERE id = :id"), {'id': row_id})


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    now = datetime.utcnow()

    # --- users: email verification, token revocation, premium pass ---
    _add_missing_columns(inspector, 'users', [
        ('email_verified', sa.Column('email_verified', sa.Boolean(), nullable=False, server_default=sa.false())),
        ('token_version', sa.Column('token_version', sa.Integer(), nullable=False, server_default='0')),
        ('premium_until', sa.Column('premium_until', sa.DateTime(), nullable=True)),
    ])

    # --- vendors: premium content + "checked by the HungryBird team" ---
    added = _add_missing_columns(inspector, 'vendors', [
        ('is_premium', sa.Column('is_premium', sa.Boolean(), nullable=False, server_default=sa.false())),
        ('team_verified', sa.Column('team_verified', sa.Boolean(), nullable=False, server_default=sa.false())),
    ])
    vendors = sa.table(
        'vendors',
        sa.column('id', sa.Integer), sa.column('is_premium', sa.Boolean),
        sa.column('is_hidden_gem', sa.Boolean), sa.column('hidden_gem_candidate', sa.Boolean),
    )
    if 'is_premium' in added:
        # Premium content = what the apps show as a hidden gem (is_hidden_gem OR hidden_gem_candidate).
        op.execute(
            vendors.update()
            .where(sa.or_(vendors.c.is_hidden_gem == sa.true(), vendors.c.hidden_gem_candidate == sa.true()))
            .values(is_premium=sa.true())
        )
    # The first migration made lat/lng NOT NULL, but the model (and admin "missing location") allow NULL.
    strict = [c['name'] for c in inspector.get_columns('vendors') if c['name'] in ('lat', 'lng') and not c['nullable']]
    if strict:
        with op.batch_alter_table('vendors') as batch:
            for name in strict:
                batch.alter_column(name, existing_type=sa.Float(), nullable=True)

    # --- cities: admin-managed description / image / visibility / order ---
    _add_missing_columns(inspector, 'cities', [
        ('description', sa.Column('description', sa.Text(), nullable=True)),
        ('image_url', sa.Column('image_url', sa.String(length=500), nullable=True)),
        ('is_active', sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true())),
        ('sort_order', sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0')),
    ])
    for slug, description in CITY_DESCRIPTIONS.items():
        bind.execute(
            sa.text("UPDATE cities SET description = :d WHERE slug = :s AND description IS NULL"),
            {'d': description, 's': slug},
        )

    # --- categories: filter keywords ---
    if 'categories' in tables:
        _add_missing_columns(inspector, 'categories', [
            ('keywords', sa.Column('keywords', sa.String(length=500), nullable=True)),
        ])
        for slug, keywords in CATEGORY_KEYWORDS.items():
            bind.execute(
                sa.text("UPDATE categories SET keywords = :k WHERE slug = :s AND keywords IS NULL"),
                {'k': keywords, 's': slug},
            )

    # --- new tables ---
    if 'auth_codes' not in tables:
        op.create_table(
            'auth_codes',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('email', sa.String(length=150), nullable=False),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('purpose', sa.String(length=30), nullable=False),
            sa.Column('code_hash', sa.String(length=64), nullable=False),
            sa.Column('attempts', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('expires_at', sa.DateTime(), nullable=False),
            sa.Column('consumed_at', sa.DateTime(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('ip', sa.String(length=100), nullable=True),
        )
        op.create_index('ix_auth_codes_email', 'auth_codes', ['email'])
        op.create_index('ix_auth_codes_created_at', 'auth_codes', ['created_at'])

    if 'subscription_plans' not in tables:
        op.create_table(
            'subscription_plans',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('name', sa.String(length=100), nullable=False),
            sa.Column('description', sa.String(length=500), nullable=True),
            sa.Column('price_paise', sa.Integer(), nullable=False),
            sa.Column('duration_days', sa.Integer(), nullable=False),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
        )

    if 'payments' not in tables:
        op.create_table(
            'payments',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('plan_id', sa.Integer(), sa.ForeignKey('subscription_plans.id', ondelete='SET NULL'), nullable=True),
            sa.Column('email', sa.String(length=150), nullable=True),
            sa.Column('plan_name', sa.String(length=100), nullable=True),
            sa.Column('days', sa.Integer(), nullable=False),
            sa.Column('amount_paise', sa.Integer(), nullable=False),
            sa.Column('currency', sa.String(length=10), nullable=False, server_default='INR'),
            sa.Column('status', sa.String(length=20), nullable=False, server_default='created'),
            sa.Column('method', sa.String(length=30), nullable=True),
            sa.Column('provider', sa.String(length=20), nullable=False, server_default='razorpay'),
            sa.Column('provider_order_id', sa.String(length=64), nullable=False, unique=True),
            sa.Column('provider_payment_id', sa.String(length=64), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('paid_at', sa.DateTime(), nullable=True),
        )
        op.create_index('ix_payments_user_id', 'payments', ['user_id'])
        op.create_index('ix_payments_created_at', 'payments', ['created_at'])

    if 'subscription_events' not in tables:
        op.create_table(
            'subscription_events',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('kind', sa.String(length=20), nullable=False),
            sa.Column('days', sa.Integer(), nullable=True),
            sa.Column('previous_until', sa.DateTime(), nullable=True),
            sa.Column('ends_at', sa.DateTime(), nullable=True),
            sa.Column('payment_id', sa.Integer(), sa.ForeignKey('payments.id', ondelete='SET NULL'), nullable=True),
            sa.Column('staff_id', sa.Integer(), sa.ForeignKey('admin_users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('staff_name', sa.String(length=100), nullable=True),
            sa.Column('note', sa.String(length=500), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
        )
        op.create_index('ix_subscription_events_user_id', 'subscription_events', ['user_id'])

    if 'trails' not in tables:
        op.create_table(
            'trails',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('city_id', sa.Integer(), sa.ForeignKey('cities.id'), nullable=False),
            sa.Column('title', sa.String(length=200), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('image_url', sa.String(length=500), nullable=True),
            sa.Column('duration_text', sa.String(length=100), nullable=True),
            sa.Column('price_text', sa.String(length=100), nullable=True),
            sa.Column('stops', sa.Text(), nullable=True),
            sa.Column('is_premium', sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
        )
        op.create_index('ix_trails_city_id', 'trails', ['city_id'])

    # --- seed rows (only into empty tables, so re-runs and admin edits are never overwritten) ---
    plans = sa.table(
        'subscription_plans',
        sa.column('name', sa.String), sa.column('description', sa.String), sa.column('price_paise', sa.Integer),
        sa.column('duration_days', sa.Integer), sa.column('is_active', sa.Boolean), sa.column('sort_order', sa.Integer),
        sa.column('created_at', sa.DateTime), sa.column('updated_at', sa.DateTime),
    )
    if not bind.execute(sa.text("SELECT COUNT(*) FROM subscription_plans")).scalar():
        op.bulk_insert(plans, [
            {'name': n, 'description': d, 'price_paise': p, 'duration_days': days, 'is_active': True,
             'sort_order': order, 'created_at': now, 'updated_at': now}
            for n, d, p, days, order in DEFAULT_PLANS
        ])

    jaipur_id = bind.execute(sa.text("SELECT id FROM cities WHERE slug = 'jaipur'")).scalar()
    if jaipur_id and not bind.execute(sa.text("SELECT COUNT(*) FROM trails")).scalar():
        names = {
            (name or '').strip().lower(): vid
            for vid, name in bind.execute(
                sa.text("SELECT id, name FROM vendors WHERE city_id = :c"), {'c': jaipur_id}
            ).fetchall()
        }
        trails = sa.table(
            'trails',
            sa.column('city_id', sa.Integer), sa.column('title', sa.String), sa.column('description', sa.Text),
            sa.column('image_url', sa.String), sa.column('duration_text', sa.String), sa.column('price_text', sa.String),
            sa.column('stops', sa.Text), sa.column('is_premium', sa.Boolean), sa.column('is_active', sa.Boolean),
            sa.column('sort_order', sa.Integer), sa.column('created_at', sa.DateTime), sa.column('updated_at', sa.DateTime),
        )
        op.bulk_insert(trails, [
            {
                'city_id': jaipur_id, 'title': t['title'], 'description': t['description'],
                'image_url': t['image_url'], 'duration_text': t['duration_text'], 'price_text': t['price_text'],
                'stops': json.dumps([
                    {'name': s, 'vendor_id': names.get(s.lower()), 'note': None} for s in t['stops']
                ]),
                'is_premium': True, 'is_active': True, 'sort_order': i, 'created_at': now, 'updated_at': now,
            }
            for i, t in enumerate(JAIPUR_TRAILS)
        ])

    # --- data: remove NaN/Infinity (invalid JSON; NaN also sorted first in Postgres) ---
    _delete_non_finite(bind, 'ratings', 'rating_value')
    if 'site_reviews' in tables:
        _delete_non_finite(bind, 'site_reviews', 'rating_value')
    _null_non_finite(bind, 'vendors', ['lat', 'lng', 'price_min', 'price_max', 'avg_rating', 'hidden_gem_score'])
    _null_non_finite(bind, 'cities', ['lat', 'lng'])
    if 'vendor_submissions' in tables:
        _null_non_finite(bind, 'vendor_submissions', ['lat', 'lng', 'rating'])

    # --- data: boilerplate review text created by submission approval ---
    bind.execute(sa.text("UPDATE ratings SET review_text = NULL WHERE review_text = 'Initial rating from submitter'"))

    # --- data: ratings come only from real reviews ---
    bind.execute(sa.text("UPDATE vendors SET avg_rating = NULL, total_ratings = 0"))
    aggregates = bind.execute(sa.text(
        "SELECT vendor_id, COUNT(rating_value), AVG(rating_value) FROM ratings "
        "WHERE rating_value IS NOT NULL GROUP BY vendor_id"
    )).fetchall()
    for vendor_id, count, average in aggregates:
        bind.execute(
            sa.text("UPDATE vendors SET avg_rating = :a, total_ratings = :n WHERE id = :id"),
            {'a': round(float(average), 1), 'n': int(count), 'id': vendor_id},
        )

    # --- data: placeholders the seed/import scripts stored as if they were facts ---
    bind.execute(sa.text("UPDATE vendors SET opening_hours = NULL WHERE opening_hours = 'Open Daily'"))
    bind.execute(sa.text(
        "UPDATE vendors SET specialty_dish = NULL WHERE specialty_dish IN ('Local Specialty', 'Street Food Specialty')"
    ))
    bind.execute(sa.text("UPDATE vendors SET description = NULL WHERE description LIKE 'Street-food discovery in Jaipur.%'"))
    bind.execute(sa.text(
        "UPDATE vendors SET area = NULL WHERE area IS NOT NULL AND "
        "LOWER(area) = (SELECT LOWER(c.name) FROM cities c WHERE c.id = vendors.city_id)"
    ))
    # The seed copied the research dataset's curator notes ("Single source.", "CROSS-MATCH: OSM ...")
    # into the public description of the documented vendors; move them to the internal notes column.
    documented = bind.execute(sa.text(
        "SELECT id, description FROM vendors WHERE vendor_code LIKE 'HB-DOC-%' "
        "AND notes IS NULL AND description IS NOT NULL"
    )).fetchall()
    for vendor_id, description in documented:
        text = (description or '').lower()
        if any(marker in text for marker in RESEARCH_NOTE_MARKERS):
            bind.execute(
                sa.text("UPDATE vendors SET notes = description, description = NULL WHERE id = :id"),
                {'id': vendor_id},
            )


def downgrade():
    inspector = sa.inspect(op.get_bind())
    tables = set(inspector.get_table_names())
    for table in ('subscription_events', 'payments', 'subscription_plans', 'auth_codes', 'trails'):
        if table in tables:
            op.drop_table(table)
    for table, names in (
        ('users', ('premium_until', 'token_version', 'email_verified')),
        ('vendors', ('team_verified', 'is_premium')),
        ('cities', ('sort_order', 'is_active', 'image_url', 'description')),
        ('categories', ('keywords',)),
    ):
        if table not in tables:
            continue
        existing = _columns(inspector, table)
        drop = [n for n in names if n in existing]
        if drop:
            with op.batch_alter_table(table) as batch:
                for name in drop:
                    batch.drop_column(name)
    # Data clean-up (recomputed ratings, removed placeholders) is intentionally not reverted.
