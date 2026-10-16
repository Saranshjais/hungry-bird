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
pip install -r requirements-dev.txt
flask db upgrade                  # or: python seed_jaipur_data.py --reset  (fresh local SQLite with ~300 Jaipur vendors)
set FLASK_DEBUG=1                 # optional; PowerShell: $env:FLASK_DEBUG="1"
flask run --host 0.0.0.0          # http://127.0.0.1:5000
python -m pytest tests            # test suite (uses its own temporary SQLite files)
```

The schema is managed only by Alembic. A local SQLite file that was created by an older version of the app
(via `db.create_all()`, so it has no `alembic_version` table) must be stamped once before upgrading:
`flask db stamp e7a1c9d2f3b4 && flask db upgrade`.

Without SMTP settings the API prints email codes (verification / password reset) to the console in local
development. `seed_jaipur_data.py --reset` drops every table, so it refuses to run against anything but a
local SQLite file (or with `ALLOW_DESTRUCTIVE_SEED=1`).

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

- **Dashboard** — live totals, 7/30-day activity chart, recent activity, vendors by city, Premium revenue (Super Admin).
- **Submissions** — approve (with editable details and coordinates) or reject community suggestions.
- **Vendors** — search/filter/paginate, full create & edit (description, specialty dish, hours, price, photo, map position, **Premium** and **Checked by HungryBird** flags…), hide, recalculate rating from real reviews, bulk CSV/XLSX import, CSV export.
- **Cities** (description, image, visible/hidden, order), **Categories** (the app's filter chips, with match keywords), **Food trails**, **Reviews** (vendor reviews, rating summary, website testimonials — new testimonials wait for approval).
- **Users** (suspend / reactivate / send a password-reset code / delete), **Staff** (admin accounts with roles), **Inbox** (contact form + in-app support), **Reports** (flagged vendors/reviews/reels with one-click take-down), **Reels**.
- **Premium** — passes (plans and prices), subscribers, manual grant / extend / revoke (logged with the staff member), payments.
- **App settings** — home banners, broadcast notifications, maintenance mode, minimum app version (forces updates), announcement strip, store links, support phone/email, social links, guest reviews on/off, **Premium on/off**, payment methods, Premium benefits.

Staff roles and what they can open (read) / change (write):

| Role | Read | Write |
| --- | --- | --- |
| `super_admin` | everything | everything (only role for **Premium** and **Staff**) |
| `moderator` | dashboard, submissions, vendors, cities, categories, reviews, users, inbox, reports, reels, trails | submissions, vendors, reviews, reports, reels, categories, users (not delete), inbox |
| `support` | dashboard, inbox, reports, users, vendors, cities, categories, trails | inbox, reports (take-down needs the content's own area) |
| `city_manager` | dashboard, submissions, vendors, cities, categories, trails | cities, vendors, submissions, trails |
| `app_manager` | dashboard, app settings, categories, trails, cities, vendors | app settings, categories, trails |

Personal data (user list, reviewer emails/IPs, submitter emails, inbox) is only returned to roles that can read
`users`/`inbox`. `GET /api/admin/me` returns `read_permissions`, `write_permissions` and `areas` so the panel
can hide pages. Deleting users is Super Admin only.

**First login.** The API creates the first Super Admin only when the `admin_users` table is empty **and**
`ADMIN_USERNAME`, `ADMIN_EMAIL` and `ADMIN_PASSWORD` (at least 12 characters) are all set — there are no
built-in credentials. Set them on Render, deploy, log in, then add named accounts for your team under **Staff**.

## Premium (UPI via Razorpay)

Free users see everything except Premium content: vendors flagged **Premium** (hidden gems by default) and
Premium food trails appear as locked previews (no name, address, location, contact, hours or reviews). The lock
is enforced by the API. Everything stays unlocked until **App settings → Premium enabled** is switched on.

1. Create a Razorpay account, finish KYC, and copy the API **Key ID** and **Key Secret** into `RAZORPAY_KEY_ID` /
   `RAZORPAY_KEY_SECRET` (use test keys first).
2. In Razorpay → Webhooks add `https://<your-api-host>/api/payments/webhook` with the events `payment.captured`,
   `order.paid` and `payment.failed`, and put its secret in `RAZORPAY_WEBHOOK_SECRET` (activates passes even if
   the app is closed before payment confirmation).
3. Set real prices under **Premium → Plans** (the migration adds two example passes: ₹49 / 30 days and ₹399 / 365 days).
4. Switch on **Premium enabled**. Buying requires a verified email; each pass extends `premium_until` by its days.

## Deploying

The Render blueprint (`render.yaml`) runs `pip install -r requirements.txt && flask db upgrade` on every deploy
and starts `gunicorn -w 1 --threads 16 --timeout 60 run:app` (one worker because of Socket.IO; rate limits are
kept in memory, which is correct for a single worker — use a Redis `RATELIMIT_STORAGE_URI` if you ever scale out).

With `APP_ENV=production` (or on Render) the API refuses to start when `SECRET_KEY` is missing or a known default,
or when `DATABASE_URL` is missing; Render then keeps the previous deploy running. Debug mode is never on in
production.

Migration `e7a1c9d2f3b4` adds the admin/app tables (staff, categories, inbox, reports, banners, settings,
notifications) and user moderation fields. Migration `f4b8c2d6a9e1` (launch) adds email codes, token revocation,
Premium plans/payments/subscription log, food trails, city and category content fields, `vendors.is_premium`
(back-filled from hidden gems) and `vendors.team_verified`, and moves the two old hard-coded Jaipur trails and the
city descriptions into rows. It also removes data the old seed/import scripts invented: every vendor's rating is
recomputed from real reviews, and placeholders such as "Open Daily" are cleared. Every schema step checks the
live database first, so it is safe on existing databases.

Environment variables:

| Service | Variable | Notes |
| --- | --- | --- |
| API | `APP_ENV` | `production` on Render (set by the blueprint) |
| API | `SECRET_KEY` | long random value (generated by the blueprint); signs every token — rotating it logs everyone out |
| API | `DATABASE_URL` | Postgres connection string (required in production) |
| API | `FRONTEND_URL`, `CORS_ORIGINS` | website origin(s) allowed by CORS, comma separated, e.g. `https://hungry-bird-gamma.vercel.app` |
| API | `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | first Super Admin (only used while no admin exists; password 12+ characters) |
| API | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM`, `SMTP_SECURITY` | email codes; `SMTP_SECURITY` is `starttls` (port 587, default), `ssl` (465) or `none`; `SMTP_FROM` e.g. `HungryBird <no-reply@yourdomain>`. Without them production answers `EMAIL_NOT_CONFIGURED` |
| API | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | UPI payments (see Premium above); without keys `payments_available` is false |
| API | `RATELIMIT_STORAGE_URI` | rate-limit storage, default `memory://` |
| API | `PROXY_FIX_X_FOR`, `CLIENT_IP_HEADER` | how the client IP is found behind Render's proxy (rate limits and guest-review limits use it): number of trusted `X-Forwarded-For` hops (default `1`), or a header set by the edge such as `CF-Connecting-IP` |
| API | `GOOGLE_MAPS_API_KEY` | browser key returned to the website's city page (restrict it by HTTP referrer) |
| API | `FLASK_DEBUG` | `1` for local debugging only (ignored in production) |
| Website | `NEXT_PUBLIC_API_URL` | API root, e.g. `https://hungry-bird-jye4.onrender.com` |
| App | `--dart-define=API_BASE_URL=…` | defaults to the Render API |

## API overview

Public (`/api`): `cities`, `vendors` (filters: `city`, `category`, `q`, `is_hidden_gem`, `is_famous`, `sort=rating|popular|newest|distance`, `lat`/`lng`, `limit`/`offset`), `vendors/<id>`, `vendors/nearby`, `vendors/hidden-gems`, `search`, `city/<slug>`, `vendors/<id>/rate`, `submit-vendor`, `app/config`, `categories`, `notifications`, `contact`, `reports`, `trails?city=` (+ `trails/<id>`), `vendor-reviews?city=`, `site-reviews`, `reels`, `submit-reel` (login required).

Account (`/api/auth`, Bearer token): `register`, `login`, `me`, `profile`, `password`, `account` (delete), `notifications-preference`, `push-token`, `email/send-code`, `email/verify`, `password/forgot`, `password/reset`; plus `/api/favorites` (`toggle`, `sync`), `/api/saved`, `/api/user/{submissions,reviews}`.

Premium: `/api/premium/plans`, `/api/premium/status`, `/api/payments/order`, `/api/payments/verify`, `/api/payments/webhook`.

Admin (`/api/admin`, staff token): `login`, `me`, `stats`, `counts`, `submissions`, `vendors` (+ `bulk-upload`, `export`, `<id>/recalculate-rating`), `cities`, `categories`, `trails`, `ratings`, `reviews`, `site-reviews`, `users` (+ `<id>/premium`, `<id>/send-reset`), `plans`, `subscriptions`, `payments`, `staff`, `inbox`, `reports` (+ `take-down`), `reels`, `app-settings`, `banners`, `notifications`.

Errors are JSON `{"error": "<message>", "code": "<MACHINE_CODE>"}`; public endpoints that accept writes are rate limited (`429`, `RATE_LIMITED`).
