# Hungry Bird — Verification Methodology

Generated: 2026-08-13 · Scope: Jaipur vendor database

## Pipeline (§13 of the research brief)

```
SOURCE → RAW CANDIDATE → NORMALIZATION → DUPLICATE DETECTION →
LOCATION CHECK → BUSINESS CHECK → FOOD CATEGORY CHECK →
DATA CONFIDENCE → VERIFICATION STATUS → HUNGRY BIRD DATABASE
```

No stage may be skipped. A record can only move **up** a level when the
required evidence exists; it never moves up automatically.

## How each verification level is assigned

### LEVEL_0_UNVERIFIED
- A lead only: mentioned somewhere without a stable source record.
- Example: an unnamed OSM food node (`jaipur_osm_unnamed_leads.csv`), a
  community tip not yet checked.
- Never shown publicly.

### LEVEL_1_SOURCE_VERIFIED
- The vendor exists as a record in **one reliable public source** with a
  stable URL (OSM element, government register row, official business page,
  established news/tourism article).
- Assigned automatically at import, with `data_confidence = LOW` unless the
  source is official government (then `MEDIUM`).
- All current OSM candidates are at this level. **OSM presence proves a
  mapping contributor recorded the place — not that it operates today.**
- Never shown publicly as "verified".

### LEVEL_2_LOCATION_VERIFIED
- Coordinates/location confirmed by a **second, independent** reliable source
  (e.g. OSM position + official business page stating the same address, or
  recent Mapillary/street-level imagery showing the vendor at that point).
- Requires: `latitude`/`longitude` NOT NULL and `verified_location = true`
  with both supporting rows present in `jaipur_vendor_sources.csv`.

### LEVEL_3_BUSINESS_VERIFIED
- Identity **and** food activity confirmed by multiple independent reliable
  sources that agree on name + location + food type (e.g. OSM + official
  website + news coverage; or government register + OSM).
- Requires `verified_business = true` and `verified_food_type = true`,
  each backed by a cited source row.
- `data_confidence` becomes `HIGH` only when sources genuinely independent
  (not one source quoting another).

### LEVEL_4_FIELD_VERIFIED
- A field verifier visited the vendor (or the vendor directly confirmed) via
  the `field_verification_queue` workflow (§17): existence, location, name,
  food sold, signature item, approximate price, hours, photos.
- GPS captured on site (`location_accuracy = FIELD_GPS`).
- No Aadhaar/bank/sensitive identity data is ever collected.

### LEVEL_5_HUNGRY_BIRD_VERIFIED
- Internal Hungry Bird review completed on top of Level 4: data complete,
  photos licensed, description written from verified facts only, curator
  sign-off recorded.
- Only these (and Level 2–4, clearly labelled) appear as verified listings.

## Duplicate handling (Rules 7–8)
- Detection keys: normalized name, coordinates within 300 m, same address,
  same phone, same social profile, same registration number.
- Flagged pairs go to `jaipur_vendor_duplicates.csv` with
  `action = KEEP_SEPARATE_UNTIL_VERIFIED`. Merging happens only after a
  human confirms both records are the same business (similar names in the
  same bazaar are often genuinely different stalls — Rule 6).

## Data confidence
- `HIGH` — multiple independent reliable sources agree.
- `MEDIUM` — one strong source (e.g. government register) plus support.
- `LOW` — single public source (all OSM-only records). Never exposed as verified.

## Hidden gem scoring (§14)
- `hidden_gem_candidate` starts NULL; it becomes `true` only when there is
  actual evidence (e.g. repeated local recommendations in independent
  sources, longevity coverage).
- Score weights: food/community evidence 30%, local recommendation 20%,
  low mainstream visibility 15%, value for money 15%, uniqueness 10%,
  data/community trust 10%. A component without evidence is marked
  unavailable — the score is then `INSUFFICIENT_DATA`, never partially faked.
- The public `VERIFIED_HIDDEN_GEM` badge can be granted only by a Hungry
  Bird curator.

## What is never done
- No invented names, prices, hours, phones, coordinates, ratings, reviews or
  registration numbers.
- No geocoding vague addresses into fake GPS points.
- No marking OSM-only or Google-listing-only records as verified.
- No import of Aadhaar/sensitive personal data from government records into
  public profiles.
- No AI-generated text used as factual evidence; descriptions are written
  only after the underlying facts are source-backed.
