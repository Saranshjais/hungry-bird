# Hungry Bird — Data Quality Report (Jaipur)

Run date: 2026-08-13 · OSM data timestamp: 2026-06-01

## Headline counts

| Metric | Count |
|---|---|
| total_candidates (named, food-focused) | **307** (284 OSM + 23 web-documented) |
| government registry entries (internal seed, not food candidates) | 12,312 |
| unnamed OSM food-place leads (field-discovery targets) | 133 |
| excluded large chains (per brief §5) | 23 |
| total_source_verified (LEVEL_1) | 297 |
| total_location_verified (LEVEL_2) | 1 |
| total_business_verified (LEVEL_3) | 9 |
| total_field_verified (LEVEL_4) | 0 — no field work yet |
| total_hungry_bird_verified (LEVEL_5) | 0 |
| duplicate_flagged (kept separate, Rules 7–8) | 6 rows in 3 groups |
| cross-matched OSM↔web-documented (independent corroboration) | 4 confirmed, 2 plausible |

## Missing-field profile (honest gaps — never filled by guessing)

| Field | Missing | % of 307 |
|---|---|---|
| coordinates | 19 | 6% (all 288 present coords are real OSM geometry) |
| prices | 303 | 99% |
| opening hours | 276 | 90% (a further 30 OSM records carry raw `opening_hours` strings in notes) |
| signature dish | 284 | 93% |
| phone | 277 | 90% |

**Interpretation:** prices, hours and signature dishes essentially require field verification — public sources rarely state them, and the brief forbids inventing them. This is the expected shape of an honest street-vendor dataset at the discovery stage.

## Confidence distribution
- HIGH: 9 (2.9%) — multi-source documented vendors
- MEDIUM: 12 (3.9%)
- LOW: 286 (93.2%) — OSM-only records (single source by definition)

## Coverage by category (all candidates)
small_eatery 133 · cafe 74 · fast_food_snacks 29 · sweets 19 · bakery 18 ·
dairy_lassi 12 · kulfi_ice_cream 6 · street_food 5 · food_court 3 ·
tea_chai 3 · kachori_samosa 3 · rajasthani_traditional 2

## Coverage by area (top; area is partly coordinate-derived — see data dictionary)
Sindhi Camp 55 · Vaishali Nagar 37 · UNASSIGNED 35 · Tripolia Bazaar 19 ·
Jagatpura 15 · MI Road 14 · Gopalpura 14 · C-Scheme 13 · Johari Bazaar 11 ·
Civil Lines 10 · Malviya Nagar 9 · Vidyadhar Nagar 9

**Strong coverage:** transit/commercial west (Sindhi Camp, MI Road), Vaishali Nagar, walled-city bazaars (Tripolia/Johari/Chandpole), Jagatpura.
**Weak coverage:** Sanganer (4), Bapu Bazaar (3), Adarsh Nagar (3), Kishanpole Bazaar (2), Jhotwara (2), Durgapura (2), Sodala (1), Pratap Nagar (1), Raja Park (0 mapped in this pull), Amer (5, mostly tourist cafes) — these are exactly the kind of dense street-food areas OSM under-maps in India; they need field discovery, not more scraping.

## Known data risks
1. **OSM staleness** — a mapped stall may have closed; every OSM record stays LOW-confidence until checked (brief §12).
2. **True street carts are underrepresented everywhere online** — the 133 unnamed leads and the weak-coverage bazaars are the real hidden-gem territory; only field work fixes this.
3. **Government register (2020) lacks locations** and predates the Heritage/Greater reorganisation; use only as a registration-number cross-check.
4. **Published prices/hours are stale by design** (articles from 2018–2026); all are marked unverified and excluded from `verified_price`/`verified_hours`.
5. **Name-collision traps** documented: Lassiwala copycats on MI Road; original Sahu (New Gate) vs "Sahu Chai Wala" franchise outlets; Sodhani/Sodani spelling variants; multiple Kanha branches. All kept separate per Rules 6–8.
