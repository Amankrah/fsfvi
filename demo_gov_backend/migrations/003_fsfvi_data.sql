-- ============================================================================
-- FSFVI DATA SCHEMA (fsfvi_data)
-- ============================================================================
-- Contains ONLY validated, cleaned data ready for FSFVI calculations
-- This is the single source of truth for FSFVI computations
-- Matches ComponentInput structure from fsfi-backend/src/fsfvi_api/models.rs
-- CRITICAL: This is a government-level system where livelihoods depend on
-- accurate data and correct decisions.
-- ============================================================================

CREATE TABLE IF NOT EXISTS fsfvi_data (
    id TEXT PRIMARY KEY NOT NULL,

    -- Traceability
    source_raw_data_id TEXT, -- Links back to demo_raw_data if applicable
    government_id TEXT NOT NULL,

    -- Geographic & Temporal Context
    country_code TEXT NOT NULL CHECK (length(country_code) = 2), -- ISO 3166-1 alpha-2
    country_name TEXT NOT NULL,
    fiscal_year INTEGER NOT NULL CHECK (fiscal_year >= 2000 AND fiscal_year <= 2100),
    reporting_period TEXT NOT NULL, -- Format: "YYYY-Qn" or "YYYY-Annual"

    -- ========================================================================
    -- FSFVI ComponentInput Fields (matches fsfi-backend/src/fsfvi_api/models.rs lines 41-72)
    -- ========================================================================

    -- component_id: OPTIONAL - String, max 50 chars, alphanumeric + underscore
    component_id TEXT CHECK (
        component_id IS NULL OR
        (length(component_id) <= 50 AND component_id GLOB '[A-Za-z0-9_]*')
    ),

    -- component_type: REQUIRED - Must be one of 6 standard types
    component_type TEXT NOT NULL CHECK (component_type IN (
        'agricultural_development',
        'infrastructure',
        'nutrition_health',
        'climate_natural_resources',
        'social_protection_equity',
        'governance_institutions'
    )),

    -- observed_value: REQUIRED - Float64, >= 0.0, must be finite (not NaN/Infinity)
    observed_value REAL NOT NULL CHECK (
        observed_value >= 0.0 AND
        observed_value < 1.0e308 AND  -- Not infinity
        observed_value = observed_value  -- Not NaN (NaN != NaN in SQL)
    ),

    -- benchmark_value: REQUIRED - Float64, >= 0.0, must be finite (not NaN/Infinity)
    benchmark_value REAL NOT NULL CHECK (
        benchmark_value >= 0.0 AND
        benchmark_value < 1.0e308 AND  -- Not infinity
        benchmark_value = benchmark_value  -- Not NaN
    ),

    -- financial_allocation_usd: REQUIRED - Float64, >= 0.0, MUST BE IN USD
    financial_allocation_usd REAL NOT NULL CHECK (
        financial_allocation_usd >= 0.0 AND
        financial_allocation_usd < 1.0e15 AND  -- Sanity check: < 1 quadrillion USD
        financial_allocation_usd = financial_allocation_usd  -- Not NaN
    ),

    -- weight: OPTIONAL - Float64, range [0.0, 1.0], auto-calculated if not provided
    weight REAL CHECK (
        weight IS NULL OR
        (weight >= 0.0 AND weight <= 1.0 AND weight = weight)
    ),

    -- sensitivity_parameter: OPTIONAL - Float64, range [0.0005, 0.005] per spec
    -- Unit: 1/USD (per million USD in practice)
    sensitivity_parameter REAL CHECK (
        sensitivity_parameter IS NULL OR
        (sensitivity_parameter >= 0.0005 AND sensitivity_parameter <= 0.005 AND sensitivity_parameter = sensitivity_parameter)
    ),

    -- ========================================================================
    -- Additional Metadata (not in ComponentInput but useful for tracking)
    -- ========================================================================

    data_source TEXT, -- e.g., "Ministry of Agriculture 2024 Report"
    data_quality_rating TEXT CHECK (data_quality_rating IN ('high', 'medium', 'low', NULL)),
    collection_method TEXT, -- e.g., "Survey", "Administrative Records", "Satellite Data"
    notes TEXT,
    metadata_json TEXT, -- Additional flexible data as JSON

    -- Audit Trail (REQUIRED for government accountability)
    created_at TEXT NOT NULL,
    created_by TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_modified_by TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1, -- Track data versions

    -- Uniqueness Constraint: One component type per government per period
    UNIQUE(government_id, component_type, fiscal_year, reporting_period),

    FOREIGN KEY (government_id) REFERENCES users(id),
    FOREIGN KEY (source_raw_data_id) REFERENCES demo_raw_data(id)
);

-- ============================================================================
-- COMPONENT METADATA (Supplementary Information)
-- ============================================================================

CREATE TABLE IF NOT EXISTS fsfvi_component_metadata (
    id TEXT PRIMARY KEY NOT NULL,
    fsfvi_data_id TEXT NOT NULL,

    -- Organizational Context
    responsible_department TEXT, -- e.g., "Ministry of Agriculture and Livestock"
    contact_person TEXT,
    contact_email TEXT,
    contact_phone TEXT,

    -- Indicator Breakdown
    indicators_json TEXT, -- JSON: [{"name": "Crop yield", "value": 3.5, "unit": "tons/ha", "weight": 0.4}]

    -- Budget Details
    budget_source TEXT, -- e.g., "Domestic", "Donor-Funded", "Mixed"
    budget_breakdown_json TEXT, -- JSON: {"domestic_usd": 80000000, "donor_usd": 20000000, "private_usd": 0}
    disbursement_status TEXT, -- e.g., "Allocated", "Partially Disbursed", "Fully Disbursed"

    -- Performance Tracking
    target_value REAL,
    target_date TEXT,
    previous_year_value REAL,
    trend TEXT CHECK (trend IN ('improving', 'stable', 'declining', NULL)),

    -- Documentation
    supporting_documents_urls TEXT, -- JSON array of URLs

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (fsfvi_data_id) REFERENCES fsfvi_data(id) ON DELETE CASCADE
);

-- ============================================================================
-- INDEXES for FSFVI Data (Critical for Query Performance)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_fsfvi_gov_year ON fsfvi_data(government_id, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_fsfvi_component_type ON fsfvi_data(component_type);
CREATE INDEX IF NOT EXISTS idx_fsfvi_country ON fsfvi_data(country_code);
CREATE INDEX IF NOT EXISTS idx_fsfvi_period ON fsfvi_data(fiscal_year, reporting_period);
CREATE INDEX IF NOT EXISTS idx_fsfvi_created ON fsfvi_data(created_at);
CREATE INDEX IF NOT EXISTS idx_fsfvi_source ON fsfvi_data(source_raw_data_id);
