# Hungry Bird — Jaipur Vendor Research: Final Report (Phase A–F)

Run date: 2026-08-13 · Per brief §24, this run delivers the reviewable foundation (A–F).
Large-scale expansion should proceed only after this is reviewed.

## Answers to the 15 report questions (§23)

1. **How many Jaipur street-food vendors were found?** 307 named, food-focused candidates (284 from OpenStreetMap + 23 documented via official sites/press), plus 133 unnamed mapped food places as field leads, plus 12,312 entries in the official government street-vendor register (internal seed — names/registration numbers only, all trades, no locations).
2. **From official government sources?** 12,312 register entries (LSG Dept PDF, Nagar Nigam Heritage & Greater Jaipur, ≈2020). None are usable as food-discovery listings yet — the register has no locations or trade types. 0 of the 307 food candidates currently carry a matched registration number.
3. **From OpenStreetMap?** 284 named candidates (+133 unnamed leads); OSM base data timestamp 2026-06-01.
4. **Multiple independent sources?** 13 vendors: 9 at LEVEL_3 (multi-source business-verified) and 4 confirmed OSM↔press cross-matches (2 more plausible, unmerged).
5. **Verified coordinates?** 288 candidates have real mapped coordinates (OSM geometry). Independently *corroborated* locations: 4 (LMB, Gulab Ji Chai, Sahu Ki Chai, Pandit Kulfi). No coordinates were geocoded from addresses (Rule 5).
6. **Verified food categories?** All 307 have a source-stated category signal (OSM tag or article text); independently confirmed (LEVEL_3): 9.
7. **Require field verification?** Effectively all: 284 OSM candidates are queued (`jaipur_vendor_needs_verification.csv`, 122 HIGH priority by category), plus the 133 unnamed leads.
8. **Strongest area coverage?** Sindhi Camp (55), Vaishali Nagar (37), Tripolia Bazaar (19), Jagatpura (15), MI Road (14), Gopalpura (14), C-Scheme (13), Johari Bazaar (11).
9. **Poor coverage?** Raja Park (0), Pratap Nagar (1), Sodala (1), Jhotwara (2), Durgapura (2), Kishanpole Bazaar (2), Adarsh Nagar (3), Bapu Bazaar (3), Sanganer (4) — dense street-food areas that OSM under-maps; field discovery targets.
10. **Strongest categories?** small_eatery (133), cafe (74), fast_food_snacks (29), sweets (19), bakery (18). Classic street-food categories (chaat, kachori, chai) are data-weakest online — they live in the unnamed leads and un-mapped bazaars.
11. **Most frequently missing fields?** price (99%), signature dish (93%), opening hours (90%), phone (90%) — left NULL per Rules 1–3.
12. **Duplicate candidates?** 6 flagged rows in 3 groups (kept separate, Rules 7–8), plus documented name-collision traps (Lassiwala copycats, Sahu original vs franchise, Kanha branches).
13. **Suitable for Hidden Gem review?** 6 candidates (`hidden_gem_candidates.csv`): PP Samosa, Danger Special Patashi, Prajeet Chaat Bhandar, Special Kulfi Bhandar, Mahaveer Rabri Bhandar, Sethani Ka Dhaba — all PENDING_CURATOR_REVIEW; no scores fabricated.
14. **Most trustworthy sources?** (i) official business websites, (ii) LSG government repository, (iii) national press (Outlook Traveller, The Better India), (iv) OpenStreetMap (breadth + coordinates, not proof of operation), (v) local food blogs (leads only). Details in `source_report.md`.
15. **What to verify manually first?**
    1. The 9 LEVEL_3 anchor vendors — fastest path to LEVEL_4/5 launch listings (visit, GPS, price, hours, photos).
    2. The 6 hidden-gem candidates — highest product value, thinnest data.
    3. Walled-city bazaar sweep (Tripolia/Johari/Chandpole/Kishanpole/Bapu Bazaar) — verify the 40+ mapped candidates and capture the unmapped stalls around them.
    4. Masala Chowk — one visit verifies ~5 stall records + settles the venue-hours discrepancy (8:00 vs 9:00 opening across sources).
    5. RTI/written request to Nagar Nigam Jaipur (Greater & Heritage) + LSG Dept for the current location-bearing survey list (Street Vendors Act 2014 Sec. 3 obliges publication).

## Phase deliverables (§24)

- **A. Source inventory** → `source_report.md` (12 sources, trust-ranked, access verdicts incl. SOURCE_BLOCKED_OR_UNAVAILABLE entries)
- **B. Government source inventory** → `source_report.md` §B: register PDF downloaded & parsed (12,312 rows → `jaipur_gov_street_vendor_register_INTERNAL.csv`), Scheme 2017/Rules 2016 PDFs, gated portals documented (SSO-gated license register; login-gated PM SVANidhi dashboard; 403 on data.gov.in bot access; expired TLS on Heritage MC site)
- **C. Jaipur area coverage** → `jaipur_areas.csv` + coverage tables in `data_quality_report.md`
- **D. Sample real records** → `jaipur_vendor_documented_sample.csv` (23 vendors, every fact cited in `jaipur_vendor_sources.csv`, 46 provenance rows) + `jaipur_vendor_candidates.csv` (284 OSM records with tags & URLs)
- **E. Data schema** → `vendor_database_schema.sql` + `data_dictionary.md`
- **F. Verification methodology** → `verification_methodology.md`

## What was NOT done (by design)
- No synthetic vendors, prices, hours, phones, coordinates, ratings, or descriptions.
- No Google Maps scraping (ToS); no CAPTCHA/login/robots bypass anywhere.
- No merging of uncertain duplicates; no publication of government personal data.
- The 500-vendor target was not forced: **307 legitimate named food candidates** is what the accessible, legal sources genuinely support today. The path to 500+ is field verification + the RTI route + community submissions — not more scraping.
