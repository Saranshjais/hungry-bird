# How to file these RTI applications

Prepared 2026-08-13. Two draft applications are in this folder:

| File | Addressed to | Why |
|---|---|---|
| `RTI_Nagar_Nigam_Greater_Jaipur.md` | SPIO, Nagar Nigam Jaipur (Greater) | Covers Mansarovar, Malviya Nagar, Vaishali Nagar, Jagatpura, Jhotwara etc. |
| `RTI_Nagar_Nigam_Heritage_Jaipur.md` | SPIO, Nagar Nigam Jaipur (Heritage) | Covers the walled city — Hungry Bird's core bazaars |

## Steps

1. **Fill the brackets** — applicant name, address, contact, date. RTI must be
   filed by an individual (Indian citizen), not a company name.
2. **Fee** — ₹10 per application (Rajasthan standard). Pay via e-Mitra kiosk,
   or attach an Indian Postal Order payable to the respective Nagar Nigam if
   posting.
3. **Filing channels** (verify current details before filing):
   - Online: Rajasthan RTI portal via SSO ID, or any e-Mitra kiosk.
   - Offline: registered post or hand delivery to the SPIO at each Nigam office —
     confirm the current office addresses locally before posting (the two Nigams
     were reorganised/merged around 2025, so the correct receiving office should
     be confirmed at filing time; if the merger consolidated them, file one
     application to the unified Nagar Nigam Jaipur and note it covers both
     erstwhile areas).
4. **Keep the receipt** — the PIO must respond within **30 days** (Section 7(1)).
   No reply → first appeal to the First Appellate Authority of the same Nigam
   within the next 30 days.
5. **Legal basis to cite if questioned:** Section 3 of the Street Vendors
   (Protection of Livelihood and Regulation of Street Vending) Act, 2014 requires
   the local authority to conduct a survey of street vendors, and the scheme/rules
   require publication of the survey list. A 2020-era list for Jaipur is already
   public on the LSG website (see `source_report.md` §B1) — you are asking for the
   current version with locations.

## What to do with the response

- If a current location-bearing list arrives: ingest it as source_type
  `MUNICIPAL_RECORD` with the RTI reply as `source_url`/document reference,
  match registration numbers against `jaipur_gov_street_vendor_register_INTERNAL.csv`,
  and use it to upgrade field-verified food vendors to registered status.
- Personal data in the reply stays internal — never on public profiles (§17–18
  of the research brief).
