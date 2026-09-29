# Hungry Bird — Jaipur Vendor Dataset (Phase A–F)

Built: 2026-08-13 · Project: Hungry Bird (https://hungry-bird-gamma.vercel.app/) ·
Geography: Jaipur, Rajasthan

Every record is **real and traceable** — sourced from OpenStreetMap, official
government documents, official business websites, and established media. No
vendor, price, hour, phone, coordinate or rating was invented. Unknown = empty.

## Start here
| File | What it is |
|---|---|
| `FINAL_REPORT.md` | Answers to the 15 research questions + phase A–F summary |
| `data_quality_report.md` | Honest counts, gaps, coverage, risks |
| `source_report.md` | Every source used, trust-ranked, with access verdicts |
| `verification_methodology.md` | How LEVEL_0…LEVEL_5 are assigned |
| `data_dictionary.md` | Field-by-field definitions for all CSVs |
| `vendor_database_schema.sql` | SQL DDL (tables, checks, public-safe view) |

## Data files
| File | Rows | Contents |
|---|---|---|
| `jaipur_vendor_candidates.csv` | 284 | Named OSM food places (LEVEL_1, LOW confidence, real coords + tags) |
| `jaipur_vendor_documented_sample.csv` | 23 | Web-documented vendors, every fact cited |
| `jaipur_vendor_verified.csv` | 10 | LEVEL_2+ subset (multi-source verified) |
| `jaipur_vendor_sources.csv` | 46 | Provenance ledger (vendor ↔ source URL) |
| `jaipur_vendor_needs_verification.csv` | 284 | Field-verification queue (PENDING) |
| `jaipur_vendor_duplicates.csv` | 6 | Flagged duplicates, kept separate |
| `jaipur_vendor_crossmatch.csv` | 8 | OSM ↔ documented cross-match audit |
| `jaipur_vendor_excluded_chains.csv` | 23 | Large chains excluded per brief |
| `jaipur_osm_unnamed_leads.csv` | 133 | Unnamed mapped food places — field leads |
| `hidden_gem_candidates.csv` | 6 | Hidden-gem candidates (PENDING_CURATOR_REVIEW) |
| `jaipur_food_categories.csv` / `jaipur_areas.csv` | — | Controlled vocabularies |
| `osm_extraction_stats.json` | — | Raw Overpass extraction stats |
| `jaipur_gov_street_vendor_register_INTERNAL.csv` | 12,312 | ⚠️ Official 2020 register (names + reg. numbers). **INTERNAL ONLY — personal data, never publish** |

## Action packs
- `field_verification_pack/` — prioritized 21-visit sheet + field guide (P1 anchors,
  P2 Masala Chowk, P3 hidden gems)
- `rti_drafts/` — ready-to-file RTI applications to both Jaipur Nagar Nigams for
  the current location-bearing survey list, + filing instructions

## Licensing / attribution
- OSM-derived records: © OpenStreetMap contributors, ODbL — attribution required
  in any public product (https://www.openstreetmap.org/copyright).
- Government documents: public records of the Govt. of Rajasthan; personal data
  therein must not be republished.
- Cited media facts: keep the source URL attached wherever displayed internally.
