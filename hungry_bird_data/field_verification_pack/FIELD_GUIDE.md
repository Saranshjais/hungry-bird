# Hungry Bird — Field Verification Guide (Jaipur, Round 1)

Prepared: 2026-08-13 · Sheet: `field_visit_sheet.csv` (21 visits, 3 priorities)

## Route plan

**P1 — Anchors (10 vendors).** The multi-source-verified names. One walked route
covers most of them: MI Road (Lassiwala Shop 312 → Gulab Ji Chai Wale, Ganpati
Plaza lane) → Chaura Rasta (Samrat, Sahu Chaiwala at New Gate) → Johari Bazaar
(LMB) → Hawa Mahal Road (Pandit Kulfi) → Chandpole (Mahaveer Rabri Bhandar).
Separate short trips: Rawat (Station Road), Egg Dee (Bapu Nagar), Kanha (Gopalpura).

**P2 — Masala Chowk (7 stall records, one visit).** Ram Niwas Garden, near Albert
Hall. Verifies Samrat & Mahaveer stalls plus Gopal Singh Patasi, Sethani Ka Dhaba,
Rama Kishana Kalkatti Chat, Pawana Rajasthani Vyanjan, Andewalaz. Also settle the
venue-hours discrepancy (sources disagree: 8:00–22:30 vs 9:00–22:00) and entry fee.

**P3 — Hidden-gem singles (4).** PP Samosa (near Golcha Cinema), Danger Special
Patashi (Bapu Bazaar), Prajeet Chaat Bhandar (Baba Harish Chandra Marg),
Special Kulfi Bhandar (Khejron ka Rasta). Single-source records — existence itself
is what needs confirming.

## Per-visit checklist (fill the CHK_ columns)

1. **Exists** — is the vendor actually operating at/near the stated spot?
2. **Name** — exact name on the board/cart (photograph the board). If it differs
   from our record, write the actual name; do NOT overwrite the record in the field.
3. **GPS** — capture coordinates standing at the stall (phone GPS is fine; note accuracy).
4. **Food confirmed** — what do they actually sell?
5. **Signature item** — ask the vendor or observe the bestseller.
6. **Actual price** — price of the signature item today (menu/board photo if possible).
7. **Actual hours & closed days** — ask the vendor directly.
8. **Photos** — stall front, food, board. Get verbal OK; note refusals.
9. **Consent (optional)** — ask if they'd like to be listed on Hungry Bird; note
   interest and any public phone they volunteer.

## Hard rules

- Never collect Aadhaar, bank details, or any ID documents.
- A private phone number is recorded only if the vendor explicitly offers it for
  public listing.
- If the vendor isn't found: mark status FAILED with notes — do not guess a
  replacement or assume a similarly named stall is the same business (watch the
  documented traps: Lassiwala copycats on MI Road; original Sahu at New Gate vs
  "Sahu Chai Wala" franchise outlets elsewhere).
- Data goes back into the master dataset only via the ingest step, which sets
  `verification_level = LEVEL_4_FIELD_VERIFIED`, `location_accuracy = FIELD_GPS`,
  and stamps `last_verified_at`.
