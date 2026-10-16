# HungryBird

Street-food discovery for India: hidden-gem stalls, reviews, maps and community suggestions.

| Part | Folder | Stack |
| --- | --- | --- |
| API | [`backend/`](backend) | Flask, SQLAlchemy, Alembic (Postgres on Render, SQLite locally) |
| Website + admin panel | [`frontend/`](frontend) | Next.js 16 (public site at `/`, admin at `/admin`) |
| Mobile app | [`mobile/`](mobile) | Flutter (Android / iOS) — see its [README](mobile/README.md) |
| Research data | [`data/`](data) | Jaipur vendor datasets used by `backend/seed_jaipur_data.py` and `backend/import_jaipur_streetfood.py` — see its [README](data/README.md) |
| Product docs | [`docs/`](docs) | Product documentation and UI/UX screen specification (PDF) |
| Archive | [`archive/`](archive) | Superseded prototypes and tooling, kept for reference only — see its [README](archive/README.md) |

`backend/` and `frontend/` are the folders Render (`render.yaml`) and Vercel build from — keep those paths when moving things around.

## Running locally

**API** (Python 3.11)

```bash
cd backend
python -m venv .venv && .venv\Scripts\activate      # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
flask db upgrade                  # or: python seed_jaipur_data.py  (fresh DB with ~300 Jaipur vendors)
flask run --host 0.0.0.0          # http://127.0.0.1:5000
```

**Website + admin panel**

```bash
cd frontend
npm install
set NEXT_PUBLIC_API_URL=http://127.0.0.1:5000   # PowerShell: $env:NEXT_PUBLIC_API_URL="…"
npm run dev                                     # http://localhost:3000 and /admin
```

**Mobile app** — see [`mobile/README.md`](mobile/README.md):
`flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5000`

## Admin panel

`/admin` manages everything the website and the app show:

- **Dashboard** — live totals, 7/30-day activity chart, recent activity, vendors by city.
- **Submissions** — approve (with editable details and coordinates) or reject community suggestions.
- **Vendors** — search/filter/paginate, full create & edit (description, specialty dish, hours, price, photo, map position…), hide, bulk CSV/XLSX import, CSV export.
- **Cities**, **Categories** (the app's filter chips), **Reviews** (vendor reviews, rating summary, website testimonials).
- **Users** (suspend / reactivate / delete), **Staff** (admin accounts with roles), **Inbox** (contact form + in-app support), **Reports** (flagged vendors/reviews/reels with one-click take-down), **Reels**.
- **App settings** — home banners, broadcast notifications, maintenance mode, minimum app version (forces updates), announcement strip, store links, guest reviews on/off.

Staff roles: `super_admin` (everything), `moderator`, `support`, `city_manager`, `app_manager`. Every role can read; write access is limited per area, and only super admins manage staff.

**First login.** On an empty `admin_users` table the API creates a super admin from `ADMIN_USERNAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD`. If those aren't set it falls back to the old panel login (`saransh` / `Sara@123`). After the first login, change the password (sidebar → Password) and add named accounts for your team under **Staff**.

## Deploying

The Render blueprint (`render.yaml`) runs `pip install -r requirements.txt && flask db upgrade` on every deploy.

Migration `e7a1c9d2f3b4` adds the admin/app tables (staff, categories, inbox, reports, banners, settings, notifications) and user moderation fields. It also back-fills vendor columns that existed in the model but never had a migration; every step checks the live schema first, so it is safe on existing databases. Default food categories are seeded when the table is created.

Environment variables:

| Service | Variable | Notes |
| --- | --- | --- |
| API | `SECRET_KEY`, `DATABASE_URL` | set by the blueprint |
| API | `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | first super admin (only used while no admin exists) |
| Website | `NEXT_PUBLIC_API_URL` | API root, e.g. `https://hungry-bird-jye4.onrender.com` |
| App | `--dart-define=API_BASE_URL=…` | defaults to the Render API |

## API overview

Public (`/api`): `cities`, `vendors` (filters: `city`, `category`, `q`, `is_hidden_gem`, `is_famous`, `sort=rating|popular|newest|distance`, `lat`/`lng`, `limit`/`offset`), `vendors/<id>`, `vendors/nearby`, `vendors/hidden-gems`, `search`, `vendors/<id>/rate`, `submit-vendor`, `app/config`, `categories`, `notifications`, `contact`, `reports`, `trails`, `guides`, `vendor-reviews`, `site-reviews`, `reels`.

Account (`/api/auth`, Bearer token): `register`, `login`, `me`, `profile`, `password`, `account` (delete), `notifications-preference`; plus `/api/favorites` (`toggle`, `sync`) and `/api/user/{submissions,reviews}`.

Admin (`/api/admin`, staff token): `login`, `me`, `stats`, `counts`, `submissions`, `vendors` (+ `bulk-upload`, `export`), `cities`, `categories`, `ratings`, `reviews`, `site-reviews`, `users`, `staff`, `inbox`, `reports` (+ `take-down`), `reels`, `app-settings`, `banners`, `notifications`.
