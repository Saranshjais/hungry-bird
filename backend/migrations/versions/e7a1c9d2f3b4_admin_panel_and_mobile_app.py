"""admin panel + mobile app: staff, categories, inbox, reports, banners, settings, notifications

Also backfills Vendor data-schema columns that were added to the model without a migration
(existing databases created via db.create_all() already have them, so every step is guarded).

Revision ID: e7a1c9d2f3b4
Revises: cc5b22baed85
Create Date: 2026-10-09 12:00:00.000000

"""
from datetime import datetime

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e7a1c9d2f3b4'
down_revision = 'cc5b22baed85'
branch_labels = None
depends_on = None


VENDOR_COLUMNS = [
    ('vendor_code', sa.String(length=50)),
    ('vendor_type', sa.String(length=80)),
    ('locality', sa.String(length=100)),
    ('market', sa.String(length=100)),
    ('street', sa.String(length=150)),
    ('landmark', sa.String(length=150)),
    ('food_category', sa.String(length=80)),
    ('food_subcategories', sa.String(length=300)),
    ('price_min', sa.Float()),
    ('price_max', sa.Float()),
    ('price_currency', sa.String(length=10)),
    ('opening_time', sa.String(length=20)),
    ('closing_time', sa.String(length=20)),
    ('closed_days', sa.String(length=60)),
    ('phone', sa.String(length=50)),
    ('website', sa.String(length=300)),
    ('instagram', sa.String(length=150)),
    ('source_url', sa.String(length=500)),
    ('source_type', sa.String(length=50)),
    ('source_name', sa.String(length=200)),
    ('verification_status', sa.String(length=30)),
    ('verification_level', sa.String(length=60)),
    ('last_verified_at', sa.String(length=30)),
    ('verified_location', sa.Boolean()),
    ('verified_business', sa.Boolean()),
    ('verified_food_type', sa.Boolean()),
    ('hidden_gem_candidate', sa.Boolean()),
    ('hidden_gem_score', sa.Float()),
    ('hidden_gem_score_status', sa.String(length=50)),
    ('data_confidence', sa.String(length=20)),
    ('notes', sa.Text()),
    ('description', sa.Text()),
    ('specialty_dish', sa.String(length=150)),
    ('opening_hours', sa.String(length=150)),
    ('image_url', sa.String(length=500)),
    ('place_id', sa.String(length=200)),
    ('photo_reference', sa.String(length=500)),
]

DEFAULT_CATEGORIES = [
    ('Street Food', 'street-food', '🌮'),
    ('Kachori & Samosa', 'kachori-samosa', '🥟'),
    ('Chai & Tea', 'tea-chai', '☕'),
    ('Lassi & Dairy', 'dairy-lassi', '🥛'),
    ('Sweets', 'sweets', '🍬'),
    ('Kulfi & Ice Cream', 'kulfi-ice-cream', '🍦'),
    ('Snacks & Fast Food', 'fast-food-snacks', '🍔'),
    ('Rajasthani', 'rajasthani-traditional', '🍛'),
]


def _columns(inspector, table):
    return {c['name'] for c in inspector.get_columns(table)}


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    # --- users: moderation status + last login ---
    if 'users' in tables:
        cols = _columns(inspector, 'users')
        with op.batch_alter_table('users') as batch:
            if 'status' not in cols:
                batch.add_column(sa.Column('status', sa.String(length=20), nullable=True, server_default='active'))
            if 'last_login_at' not in cols:
                batch.add_column(sa.Column('last_login_at', sa.DateTime(), nullable=True))

    # --- vendors: backfill columns missing from older migrations ---
    if 'vendors' in tables:
        cols = _columns(inspector, 'vendors')
        missing = [(name, type_) for name, type_ in VENDOR_COLUMNS if name not in cols]
        if missing:
            with op.batch_alter_table('vendors') as batch:
                for name, type_ in missing:
                    batch.add_column(sa.Column(name, type_, nullable=True))

    if 'admin_users' not in tables:
        op.create_table(
            'admin_users',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('name', sa.String(length=100), nullable=False),
            sa.Column('email', sa.String(length=150), nullable=False, unique=True),
            sa.Column('username', sa.String(length=80), nullable=True, unique=True),
            sa.Column('password_hash', sa.String(length=255), nullable=False),
            sa.Column('role', sa.String(length=30), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=True),
            sa.Column('last_login', sa.DateTime(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
        )

    if 'categories' not in tables:
        categories = op.create_table(
            'categories',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('name', sa.String(length=100), nullable=False),
            sa.Column('slug', sa.String(length=100), nullable=False, unique=True),
            sa.Column('icon', sa.String(length=20), nullable=True),
            sa.Column('image_url', sa.String(length=500), nullable=True),
            sa.Column('sort_order', sa.Integer(), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
        )
        now = datetime.utcnow()
        op.bulk_insert(categories, [
            {'name': name, 'slug': slug, 'icon': icon, 'sort_order': i, 'is_active': True, 'created_at': now}
            for i, (name, slug, icon) in enumerate(DEFAULT_CATEGORIES)
        ])

    if 'contact_messages' not in tables:
        op.create_table(
            'contact_messages',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('name', sa.String(length=100), nullable=False),
            sa.Column('email', sa.String(length=150), nullable=False),
            sa.Column('subject', sa.String(length=200), nullable=True),
            sa.Column('message', sa.Text(), nullable=False),
            sa.Column('source', sa.String(length=20), nullable=True),
            sa.Column('status', sa.String(length=20), nullable=True),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
        )

    if 'reports' not in tables:
        op.create_table(
            'reports',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('target_type', sa.String(length=20), nullable=False),
            sa.Column('target_id', sa.Integer(), nullable=False),
            sa.Column('reason', sa.String(length=100), nullable=False),
            sa.Column('details', sa.Text(), nullable=True),
            sa.Column('reporter_user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('reporter_name', sa.String(length=100), nullable=True),
            sa.Column('status', sa.String(length=20), nullable=True),
            sa.Column('admin_notes', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('resolved_at', sa.DateTime(), nullable=True),
        )

    if 'app_banners' not in tables:
        op.create_table(
            'app_banners',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('title', sa.String(length=150), nullable=False),
            sa.Column('subtitle', sa.String(length=250), nullable=True),
            sa.Column('image_url', sa.String(length=500), nullable=False),
            sa.Column('link_type', sa.String(length=20), nullable=True),
            sa.Column('link_value', sa.String(length=500), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=True),
            sa.Column('sort_order', sa.Integer(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
        )

    if 'app_settings' not in tables:
        op.create_table(
            'app_settings',
            sa.Column('key', sa.String(length=80), primary_key=True),
            sa.Column('value', sa.Text(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
        )

    if 'app_notifications' not in tables:
        op.create_table(
            'app_notifications',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('title', sa.String(length=150), nullable=False),
            sa.Column('body', sa.Text(), nullable=False),
            sa.Column('target', sa.String(length=100), nullable=True),
            sa.Column('link_type', sa.String(length=20), nullable=True),
            sa.Column('link_value', sa.String(length=500), nullable=True),
            sa.Column('push_sent_count', sa.Integer(), nullable=True),
            sa.Column('sent_by', sa.String(length=100), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
        )


def downgrade():
    inspector = sa.inspect(op.get_bind())
    tables = set(inspector.get_table_names())
    for table in ('app_notifications', 'app_settings', 'app_banners', 'reports',
                  'contact_messages', 'categories', 'admin_users'):
        if table in tables:
            op.drop_table(table)
    if 'users' in tables:
        cols = _columns(inspector, 'users')
        with op.batch_alter_table('users') as batch:
            if 'last_login_at' in cols:
                batch.drop_column('last_login_at')
            if 'status' in cols:
                batch.drop_column('status')
    # Vendor backfill columns are intentionally kept: the model depends on them.
