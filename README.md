# Hungry Bird — Vendor Detail Page + Fixes

Drop these files into your repo at the **same relative paths** (they'll overwrite/add to existing files). Folder structure here matches your repo exactly:

```
backend/app/models.py                                    → updated (new columns)
backend/app/routes/main.py                                → updated (new endpoint)
backend/migrations/versions/d3f9a1b2c4e5_...py             → new migration
frontend/src/app/vendor/[id]/page.jsx                      → new (SEO metadata, server component)
frontend/src/app/vendor/[id]/VendorDetailClient.jsx        → new (the actual page UI)
frontend/src/app/vendor/[id]/VendorMap.jsx                 → new (mini map)
frontend/src/app/city/[slug]/page.jsx                      → updated (VendorCard + Near Me)
```

## What changed

**Backend**
- `Vendor` model: added `description`, `specialty_dish`, `opening_hours` columns
- New migration for those columns — run `flask db upgrade` after dropping the file in
- New endpoint: `GET /api/vendors/<id>` — returns full vendor detail, all reviews, and 4 nearby vendors in the same city

**Frontend**
- New vendor detail page at `/vendor/[id]` — photo hero, badges (Hidden Gem / Verified / price), rating summary, description, full review list + review form, mini-map, directions button, nearby vendors. Includes `generateMetadata` for proper link previews on WhatsApp/social when people share a vendor.
- `VendorCard` on the city page: removed the fake `"60% OFF"` badges, replaced with real `Hidden Gem` / price-level badges. Clicking the card now goes to the vendor detail page; "Get Directions" is now its own button so both actions are reachable.
- "Near Me" button on the city page now actually works — uses real geolocation, sorts vendors by distance, and shows the distance on each card. Click again to turn it off.

## Before you run it

1. Since `description`, `specialty_dish`, `opening_hours` are new and start empty for all existing vendors, the vendor detail page falls back to a generic sentence when `description` is blank. Consider a quick admin panel field (in `admin/vendors`) to let you fill these in for your best stalls — that's what will make the page feel premium instead of generic.
2. Run the migration: `cd backend && flask db upgrade`
3. Nothing else needs new npm packages — the vendor map reuses `react-leaflet`, already a dependency via `CityMap.jsx`.

## Not done yet (from the original priority list)
- Favorites/Wishlist UI — the backend already has `/api/favorites` and `/api/saved` routes (and even two overlapping models for it — `Favorite` and `SavedVendor` — worth consolidating to one before building the UI)
- City-agnostic "Explore Near Me" page across all cities
- Admin UI fields for the new `description`/`specialty_dish`/`opening_hours` columns
