-- ============================================================
-- Hungry Bird — Jaipur Vendor Database Schema
-- Generated: 2026-08-13
-- Principle: REAL → TRACEABLE → SOURCE-BACKED → LOCATION-AWARE → VERIFICATION-AWARE
-- Unknown values stay NULL. Never invent data.
-- ============================================================

CREATE TABLE vendors (
    vendor_id                       VARCHAR(40) PRIMARY KEY,   -- e.g. HB-OSM-N123456, HB-DOC-0001, HB-GOV-0001
    vendor_name                     VARCHAR(200),              -- NULL allowed for unnamed field leads
    vendor_type                     VARCHAR(60),               -- food_stall_or_fast_food | street_cart | sweet_shop | cafe | eatery | food_court | shop_* | unknown

    -- Geography (research-organised; NULL when unknown)
    city                            VARCHAR(60)  NOT NULL DEFAULT 'Jaipur',
    state                           VARCHAR(60)  NOT NULL DEFAULT 'Rajasthan',
    area                            VARCHAR(100),
    locality                        VARCHAR(100),
    market                          VARCHAR(100),
    street                          VARCHAR(150),
    landmark                        VARCHAR(150),

    latitude                        DECIMAL(10,7),             -- NULL if not verifiable; NEVER geocoded from vague addresses
    longitude                       DECIMAL(10,7),
    location_accuracy               VARCHAR(30) DEFAULT 'UNKNOWN', -- OSM_MAPPED | SOURCE_STATED | FIELD_GPS | APPROXIMATE | UNKNOWN

    address                         VARCHAR(400),

    -- Food
    food_category                   VARCHAR(60),               -- controlled: see food_categories table
    food_subcategories              VARCHAR(300),              -- semicolon-separated
    cuisine                         VARCHAR(200),
    signature_dish                  VARCHAR(200),

    -- Price (NULL when unknown — Rule 2)
    price_min                       DECIMAL(8,2),
    price_max                       DECIMAL(8,2),
    price_currency                  CHAR(3) DEFAULT 'INR',

    -- Hours (NULL when unknown — Rule 3)
    opening_time                    TIME,
    closing_time                    TIME,
    closed_days                     VARCHAR(60),

    -- Public contact only (no private numbers)
    phone                           VARCHAR(40),
    website                         VARCHAR(300),
    instagram                       VARCHAR(120),
    other_public_contact            VARCHAR(300),

    -- Provenance (mandatory — §16)
    source_url                      VARCHAR(500) NOT NULL,
    source_type                     VARCHAR(40)  NOT NULL,     -- see CHECK below
    source_name                     VARCHAR(200),

    government_registration_number  VARCHAR(80),               -- internal only; never exposed publicly
    government_source               VARCHAR(300),

    -- Verification (§9)
    verification_status             VARCHAR(30) DEFAULT 'CANDIDATE',  -- CANDIDATE | IN_REVIEW | VERIFIED | REJECTED
    verification_level              VARCHAR(40) NOT NULL DEFAULT 'LEVEL_0_UNVERIFIED',
    last_verified_at                DATE,
    verified_location               BOOLEAN DEFAULT FALSE,
    verified_business               BOOLEAN DEFAULT FALSE,
    verified_food_type              BOOLEAN DEFAULT FALSE,
    verified_hours                  BOOLEAN DEFAULT FALSE,
    verified_price                  BOOLEAN DEFAULT FALSE,

    -- Media
    photos_source                   VARCHAR(300),
    photo_license_status            VARCHAR(40),               -- LICENSED | OWN_PHOTO | PENDING | NONE

    -- Hidden gem (§14) — curator-gated
    hidden_gem_candidate            BOOLEAN,
    hidden_gem_score                DECIMAL(5,2),
    hidden_gem_score_status         VARCHAR(30),               -- CALCULATED | INSUFFICIENT_DATA | PENDING_CURATOR_REVIEW

    rating                          DECIMAL(3,2),              -- only from real review platforms with source
    review_count                    INTEGER,

    description                     TEXT,                      -- generated ONLY from source-backed facts (Rule 10)

    data_confidence                 VARCHAR(10),               -- HIGH | MEDIUM | LOW
    notes                           TEXT,

    CONSTRAINT chk_source_type CHECK (source_type IN (
        'OFFICIAL_GOVERNMENT','MUNICIPAL_RECORD','PM_SVANIDHI','JAN_SOCHNA',
        'OPENSTREETMAP','OFFICIAL_BUSINESS_WEBSITE','PUBLIC_SOCIAL_PROFILE',
        'NEWS_MEDIA','TOURISM_GOV','FIELD_VERIFIED','COMMUNITY_SUBMISSION','OTHER')),
    CONSTRAINT chk_verification_level CHECK (verification_level IN (
        'LEVEL_0_UNVERIFIED','LEVEL_1_SOURCE_VERIFIED','LEVEL_2_LOCATION_VERIFIED',
        'LEVEL_3_BUSINESS_VERIFIED','LEVEL_4_FIELD_VERIFIED','LEVEL_5_HUNGRY_BIRD_VERIFIED')),
    CONSTRAINT chk_confidence CHECK (data_confidence IN ('HIGH','MEDIUM','LOW'))
);

-- A vendor can have many sources; multiple independent sources raise confidence.
CREATE TABLE vendor_sources (
    source_id           INTEGER PRIMARY KEY,
    vendor_id           VARCHAR(40) NOT NULL REFERENCES vendors(vendor_id),
    source_url          VARCHAR(500) NOT NULL,
    source_type         VARCHAR(40) NOT NULL,
    source_name         VARCHAR(200),
    document_title      VARCHAR(300),
    document_date       DATE,
    department          VARCHAR(200),
    source_page         VARCHAR(40),
    retrieved_at        DATE NOT NULL,
    supports_fields     VARCHAR(400),      -- which vendor fields this source supports
    notes               TEXT
);

CREATE TABLE field_verification_queue (
    queue_id                INTEGER PRIMARY KEY,
    vendor_id               VARCHAR(40) NOT NULL REFERENCES vendors(vendor_id),
    vendor_name             VARCHAR(200),
    area                    VARCHAR(100),
    latitude                DECIMAL(10,7),
    longitude               DECIMAL(10,7),
    verification_priority   VARCHAR(10),   -- HIGH | MEDIUM | LOW
    missing_fields          VARCHAR(400),
    verification_notes      TEXT,
    assigned_to             VARCHAR(100),
    status                  VARCHAR(20) DEFAULT 'PENDING',
    CONSTRAINT chk_queue_status CHECK (status IN ('PENDING','IN_PROGRESS','VERIFIED','FAILED','CLOSED'))
);

CREATE TABLE duplicate_candidates (
    duplicate_group     VARCHAR(20) NOT NULL,
    vendor_id           VARCHAR(40) NOT NULL REFERENCES vendors(vendor_id),
    reason              VARCHAR(300),
    action              VARCHAR(60) DEFAULT 'KEEP_SEPARATE_UNTIL_VERIFIED',
    resolved            BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (duplicate_group, vendor_id)
);

CREATE TABLE food_categories (
    category_code       VARCHAR(60) PRIMARY KEY,
    category_name       VARCHAR(100) NOT NULL,
    description         VARCHAR(300)
);

CREATE TABLE areas (
    area_name           VARCHAR(100) PRIMARY KEY,
    area_type           VARCHAR(40),       -- bazaar | residential | commercial | transit_hub | heritage
    zone                VARCHAR(60),       -- filled only from official municipal boundaries
    ward                VARCHAR(60),       -- filled only if officially available
    notes               VARCHAR(300)
);

CREATE INDEX idx_vendors_area ON vendors(area);
CREATE INDEX idx_vendors_category ON vendors(food_category);
CREATE INDEX idx_vendors_verification ON vendors(verification_level);
CREATE INDEX idx_vendors_location ON vendors(latitude, longitude);
CREATE INDEX idx_sources_vendor ON vendor_sources(vendor_id);

-- Public view: never exposes government IDs, registration numbers or internal notes (§18).
CREATE VIEW public_vendor_profiles AS
SELECT vendor_id, vendor_name, vendor_type, area, locality, market, landmark,
       latitude, longitude, food_category, food_subcategories, cuisine,
       signature_dish, price_min, price_max, price_currency,
       opening_time, closing_time, closed_days,
       website, instagram,
       verification_level, last_verified_at, rating, review_count, description
FROM vendors
WHERE verification_level IN ('LEVEL_2_LOCATION_VERIFIED','LEVEL_3_BUSINESS_VERIFIED',
                             'LEVEL_4_FIELD_VERIFIED','LEVEL_5_HUNGRY_BIRD_VERIFIED')
  AND verification_status = 'VERIFIED';
