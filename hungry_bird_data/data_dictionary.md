# Hungry Bird — Data Dictionary

Generated: 2026-08-13 · Scope: Jaipur, Rajasthan vendor research dataset

Core principle: **every value is either traced to a source or NULL.** No field is ever filled by guessing.

## vendors (main table / `jaipur_vendor_candidates.csv`)

| Field | Type | Meaning | Rules |
|---|---|---|---|
| `vendor_id` | string | Stable Hungry Bird ID. Prefix encodes origin: `HB-OSM-N/W/R<id>` (OpenStreetMap node/way/relation), `HB-DOC-####` (documented via public web sources), `HB-GOV-####` (government record), `HB-FLD-####` (field-discovered) | Primary key |
| `vendor_name` | string | Name exactly as it appears in the source | Never invented; NULL for unnamed leads |
| `vendor_type` | string | `food_stall_or_fast_food`, `street_cart`, `sweet_shop`, `cafe`, `eatery`, `food_court`, `shop_<osm shop tag>`, `unknown` | From source evidence only |
| `city` / `state` | string | Always `Jaipur` / `Rajasthan` in this dataset | — |
| `area` | string | Research area (see `jaipur_areas.csv`). May be **derived from real coordinates** (nearest locality centroid ≤2.5 km) — when derived, this is flagged in `notes` | Derived ≠ source-stated |
| `locality` | string | Only from a source (e.g. OSM `addr:suburb`) | NULL if absent |
| `market` / `street` / `landmark` | string | Only from a source | NULL if absent |
| `latitude` / `longitude` | decimal | Real coordinates from the source (OSM geometry, field GPS) | NEVER geocoded from a vague address (Rule 5) |
| `location_accuracy` | enum | `OSM_MAPPED`, `SOURCE_STATED`, `FIELD_GPS`, `APPROXIMATE`, `UNKNOWN` | `UNKNOWN` when lat/lon NULL |
| `address` | string | Assembled only from source `addr:*` parts or source-stated address | NULL if absent |
| `food_category` | enum | See `jaipur_food_categories.csv` | Mapped from source tags/text |
| `food_subcategories` | string | Semicolon-separated | Source-backed only |
| `cuisine` | string | Raw cuisine value from source (e.g. OSM `cuisine` tag) | — |
| `signature_dish` | string | Only if a source names it | NULL otherwise |
| `price_min` / `price_max` | decimal | Only if a source states prices | NULL otherwise (Rule 2) |
| `price_currency` | string | `INR` | — |
| `opening_time` / `closing_time` | time | Parsed only from unambiguous source hours; complex raw values kept in `notes` | NULL otherwise (Rule 3) |
| `closed_days` | string | Source-stated only | — |
| `phone` / `website` / `instagram` / `other_public_contact` | string | Public business contact from the source itself | Never private numbers; never generated |
| `source_url` | string | Exact URL of the primary source | Mandatory |
| `source_type` | enum | `OFFICIAL_GOVERNMENT`, `MUNICIPAL_RECORD`, `PM_SVANIDHI`, `JAN_SOCHNA`, `OPENSTREETMAP`, `OFFICIAL_BUSINESS_WEBSITE`, `PUBLIC_SOCIAL_PROFILE`, `NEWS_MEDIA`, `TOURISM_GOV`, `FIELD_VERIFIED`, `COMMUNITY_SUBMISSION`, `OTHER` | Controlled list |
| `source_name` | string | Human-readable source (e.g. "OpenStreetMap contributors (ODbL)") | — |
| `government_registration_number` / `government_source` | string | Internal only — **never shown publicly** (§18) | NULL unless found in an official record |
| `verification_status` | enum | `CANDIDATE`, `IN_REVIEW`, `VERIFIED`, `REJECTED` | — |
| `verification_level` | enum | `LEVEL_0_UNVERIFIED` … `LEVEL_5_HUNGRY_BIRD_VERIFIED` | See verification_methodology.md |
| `last_verified_at` | date | Date of the latest check against the source | — |
| `verified_location` / `verified_business` / `verified_food_type` / `verified_hours` / `verified_price` | boolean | Per-fact verification flags | All start `false` |
| `photos_source` / `photo_license_status` | string | Where photos come from and their license state | No unlicensed photos |
| `hidden_gem_candidate` | boolean | Candidate flag only; curator approval required for the public badge | NULL until evidence exists |
| `hidden_gem_score` | decimal | Weighted score (see methodology §14) | NULL unless computable |
| `hidden_gem_score_status` | enum | `CALCULATED`, `INSUFFICIENT_DATA`, `PENDING_CURATOR_REVIEW` | Almost all records start `INSUFFICIENT_DATA` |
| `rating` / `review_count` | decimal/int | Only from a real, cited review platform | NULL otherwise; never fabricated |
| `description` | text | Written only after facts are source-backed (Rule 10) | NULL for now |
| `data_confidence` | enum | `HIGH` (multiple reliable sources agree), `MEDIUM` (one strong + support), `LOW` (single/weak source) | OSM-only records = `LOW` |
| `notes` | text | Raw source tags, derivation flags, unparsed hours | Internal only |

## Companion files

| File | Contents |
|---|---|
| `jaipur_vendor_candidates.csv` | All named candidates (currently OSM-sourced discovery layer) |
| `jaipur_vendor_verified.csv` | Vendors at LEVEL_2+ (empty until verification passes run) |
| `jaipur_vendor_needs_verification.csv` | Field-verification queue (§17 fields, PENDING status) |
| `jaipur_vendor_duplicates.csv` | Flagged duplicate groups — kept separate until verified (Rules 7–8) |
| `jaipur_vendor_excluded_chains.csv` | Large chains found in sources but excluded per §5 |
| `jaipur_osm_unnamed_leads.csv` | Real mapped food places with no name tag — field-discovery leads |
| `jaipur_vendor_sources.csv` | One row per (vendor, source) pair — provenance ledger |
| `jaipur_food_categories.csv` | Controlled category list |
| `jaipur_areas.csv` | Research areas with type notes |
| `osm_extraction_stats.json` | Raw extraction statistics from the Overpass run |

## Attribution

OpenStreetMap-derived records: © OpenStreetMap contributors, licensed under
[ODbL](https://www.openstreetmap.org/copyright). Any public product using
these records must display OSM attribution.
