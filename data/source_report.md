# Hungry Bird — Source Report (Jaipur)

Research date: 2026-08-13. Every URL below was actually fetched or verified in live search results during this run.

## A. Source inventory & trust assessment

| # | Source | URL | Type | What it yields | Accessibility | Trust |
|---|---|---|---|---|---|---|
| 1 | LSG Dept Rajasthan document repository | https://lsg.urban.rajasthan.gov.in/ | MUNICIPAL_RECORD | **The key government source.** Hosts the official Jaipur street-vendor list PDF (see B1), Street Vendors Scheme 2017, Rules 2016, zone/ward profiles | PUBLIC — direct PDF download, no login | HIGH (official) |
| 2 | PM SVANidhi portal (MoHUA) | https://pmsvanidhi.mohua.gov.in/ | PM_SVANIDHI | National aggregate stats; per-vendor public search at `/Schemes/SearchVendor` (state + name/ID, one record at a time) | PUBLIC aggregates; NO bulk export; dashboard login-gated | HIGH (official) but not bulk-usable |
| 3 | Jan Soochna Portal | https://jansoochna.rajasthan.gov.in/ | JAN_SOCHNA | PM-SVANidhi services incl. "Informations of PM-Svanidhi Street Vendor Survey" — per-applicant lookup, not a bulk dataset | PUBLIC lookup only | HIGH (official) but not bulk-usable |
| 4 | LSG Online street-vendor service | https://lsgonline.rajasthan.gov.in/street-vendor_service.aspx | OFFICIAL_GOVERNMENT | Registration process docs; the live "Street Vending License Register" link redirects to Rajasthan SSO login | Register: **SOURCE_BLOCKED_OR_UNAVAILABLE (SSO login)** | HIGH (official), gated |
| 5 | Jaipur MC Greater | https://jaipurmc.org/ | MUNICIPAL_RECORD | Town Vending Committee meeting notices (e.g. dated 29.02.2024); circulars; **no vendor register online**. `jaipurmcgreater.rajasthan.gov.in` does not resolve (DNS failure) | PUBLIC, thin | MEDIUM-HIGH |
| 6 | Jaipur MC Heritage | https://jaipurmcheritage.org/ | MUNICIPAL_RECORD | Unknown | **SOURCE_BLOCKED_OR_UNAVAILABLE — expired TLS certificate at fetch time** | — |
| 7 | data.gov.in | https://www.data.gov.in/resource/district-wise-beneficiaries-and-loan-amount-disbursed-released-under-pm-svanidhi-scheme | OFFICIAL_GOVERNMENT | District-wise Rajasthan PM SVANidhi beneficiaries (as on 08-12-2022) — aggregate, not vendor-level | **HTTP 403 to automated fetch**; retrievable via browser or free API key | HIGH, aggregate only |
| 8 | OpenStreetMap (Overpass API) | https://overpass-api.de / mirror overpass.kumi.systems | OPENSTREETMAP | 440 real mapped food places in the Jaipur bbox (data timestamp 2026-06-01); 284 named candidates | PUBLIC (ODbL — attribution required) | MEDIUM (community-mapped; discovery layer, not proof of operation) |
| 9 | Official business websites | rawatmisthanbhandar.in, lmbsweets.com, gulabjichaiwale.com, eggdee.com, kanha.co | OFFICIAL_BUSINESS_WEBSITE | Identity, branches, public phone, dishes | PUBLIC | HIGH for the vendor's own facts |
| 10 | Established media / food press | outlooktraveller.com, thebetterindia.com, homegrown.co.in, cityshor.com, learnjaipur.in, jaipurlove.com, pinkcitypost.com, cityscope.media, tasteofcity.com, jaipurunveiled.com, foodiesonly.in | NEWS_MEDIA | Vendor names, locations/landmarks, signature dishes, history; some prices/hours (as-published) | PUBLIC | MEDIUM-HIGH (national press) / MEDIUM (local blogs) |
| 11 | Wikipedia | https://en.wikipedia.org/wiki/LMB_Hotel | OTHER | LMB history and identity | PUBLIC | MEDIUM-HIGH |
| 12 | tourism.rajasthan.gov.in | — | TOURISM_GOV | No vendor-level pages surfaced in searches this run | — | — |

## B. Government findings in detail

### B1. Official Jaipur street-vendor list (downloaded and parsed this run)
- **URL:** https://www.lsg.urban.rajasthan.gov.in/content/dam/raj/udh/lsgs/lsg-jaipur/Order/order_2020/streetvendor/Jaipur.pdf
- **Document:** "List of Street Vendors — Nagar Nigam Heritage & Greater Jaipur", 494 pages, 6.87 MB, order_2020 path (≈2020 vintage; no visible date in the text layer).
- **Parsed result:** **12,312 vendor entries** (serials 1–12,312, continuous, zero duplicates) with vendor name, father/husband name, registration/certificate number. Extracted to `jaipur_gov_street_vendor_register_INTERNAL.csv`.
- **Limitations:** no vending locations, wards, phones, or trade/food type — so it cannot seed food-discovery listings by itself. It is a *registry seed*: registration numbers can later confirm that a field-verified food vendor is officially registered.
- **Privacy handling:** file is marked INTERNAL. Personal names from a government register are never published on Hungry Bird (§17–18 of the brief); gender column was deliberately not parsed (column alignment in the PDF text layer is unreliable and misalignment would fabricate data).

### B2. Supporting official documents (same repository, direct download)
- Street Vendors Scheme 2017 (scanned, needs OCR): https://lsg.urban.rajasthan.gov.in/content/dam/raj/udh/lsgs/lsg-jaipur/pdf/Street%20Vendors%20Scheme-2017.pdf
- Rajasthan Street Vendors Rules, 2016: https://lsg.urban.rajasthan.gov.in/content/dam/raj/udh/lsgs/lsg-jaipur/pdf/Rules%20and%20Regulations%20(acts)%20pdf/The%20Rajasthan%20Street%20Vendors%20(Protection%20of%20Livelihood%20and%20Regulation%20of%20Street%20Vending)%20Rules,%202016.pdf
- Rajasthan Street Vendors Scheme 2016: https://lsg.urban.rajasthan.gov.in/content/dam/raj/udh/lsgs/lsg-jaipur/pdf/Notifications%20and%20Sanctions%20pdf/Rajasthan%20Street%20Vendors%20(Protection%20of%20Livelihood%20and%20Regulation%20of%20Street%20Vendings)%20Scheme%202016.pdf
- Nagar Nigam Greater Jaipur zone/ward profiles (Jagatpura, Malviya Nagar, Jhotwara, Vidyadhar Nagar; Swachhtam Portal 2024): https://lsg.urban.rajasthan.gov.in/content/dam/raj/udh/organizations/jaipur-nagar-nigam/pdf/WardWiseData/Jagatpura%20Zone%20Details(Swachhtam%20Portal%202024).pdf

### B3. Honest assessment of government pipeline
There is **no fully programmatic government source of current, location-bearing vendor data**. The realistic path for authoritative current data:
1. Use the 2020 register (B1) as the internal registration-number seed.
2. File an **RTI / written request** to Nagar Nigam Jaipur (Greater & Heritage) and the LSG Department for the current survey list with vending sites — the Street Vendors Act 2014 (Sec. 3) requires ULBs to publish survey lists, and the Jaipur Town Vending Committee demonstrably meets (notice dated 29.02.2024 on jaipurmc.org).
3. data.gov.in aggregates can be pulled with a free API key for district-level context.

## C. Most trustworthy sources (ranked for Hungry Bird's purposes)
1. **Official business websites** — best for identity/contact of established vendors (but only ~5 of 23 sampled vendors have one; true street stalls almost never do).
2. **LSG document repository** — authoritative registration data, but stale (≈2020) and location-less.
3. **National press (Outlook Traveller, The Better India)** — reliable for existence, location, signature dish.
4. **OpenStreetMap** — best breadth + real coordinates; must never be treated as proof of current operation.
5. **Local food blogs** — good discovery leads; require corroboration before any public display.
