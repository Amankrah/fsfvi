-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'demo_government',
    is_temporary_password BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_login TEXT,
    login_attempts INTEGER NOT NULL DEFAULT 0,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    lockout_expiry TEXT,
    password_changed_at TEXT,
    session_token TEXT,
    session_expires_at TEXT,
    two_fa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    two_fa_secret TEXT,
    two_fa_backup_codes TEXT, -- JSON array of backup codes
    two_fa_enabled_at TEXT
);

-- Login attempts table for audit logging
CREATE TABLE IF NOT EXISTS login_attempts (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT,
    username TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    failure_reason TEXT,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Security events table for comprehensive audit logging
CREATE TABLE IF NOT EXISTS security_events (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT,
    event_type TEXT NOT NULL,
    description TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    timestamp TEXT NOT NULL,
    metadata TEXT, -- JSON data
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_session_token ON users(session_token);
CREATE INDEX IF NOT EXISTS idx_login_attempts_timestamp ON login_attempts(timestamp);
CREATE INDEX IF NOT EXISTS idx_login_attempts_user_id ON login_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);-- ============================================================================
-- RAW DATA SCHEMA (demo_raw_data)
-- ============================================================================
-- Stores unprocessed CSV/Excel imports exactly as received
-- This data is NOT used for calculations until validated and moved to fsfvi_data
-- CRITICAL: This is a government-level system where livelihoods depend on
-- accurate data and correct decisions. All data must be validated before use.
-- ============================================================================

CREATE TABLE IF NOT EXISTS demo_raw_data (
    id TEXT PRIMARY KEY NOT NULL,

    -- Import Metadata
    import_batch_id TEXT NOT NULL, -- Links all rows from same import
    row_number INTEGER NOT NULL, -- Original row number in CSV
    government_id TEXT NOT NULL,
    imported_at TEXT NOT NULL,
    imported_by TEXT NOT NULL,

    -- Raw Data Fields (stored as TEXT to capture exactly what was imported)
    country_code TEXT,
    country_name TEXT,
    fiscal_year TEXT, -- Stored as TEXT initially
    reporting_period TEXT,

    -- Core FSFVI Fields (from CSV, stored as TEXT for validation)
    component_type TEXT, -- Will be validated against 6 standard types
    component_id TEXT, -- Optional in spec
    observed_value TEXT, -- Stored as TEXT to catch invalid numbers
    benchmark_value TEXT, -- Stored as TEXT to catch invalid numbers
    financial_allocation_usd TEXT, -- CRITICAL: must be validated as USD
    weight TEXT, -- Optional field
    sensitivity_parameter TEXT, -- Optional field

    -- Supplementary Data
    data_source TEXT,
    notes TEXT,

    -- Validation Status
    validation_status TEXT NOT NULL DEFAULT 'pending' CHECK (validation_status IN (
        'pending',      -- Not yet validated
        'valid',        -- Passed all validations
        'invalid',      -- Failed validation
        'corrected'     -- Was invalid but manually corrected
    )),
    validation_errors TEXT, -- JSON array of validation error messages
    validation_warnings TEXT, -- JSON array of non-critical warnings
    validated_at TEXT,
    validated_by TEXT,

    -- Processing Status
    processed_to_fsfvi_data BOOLEAN NOT NULL DEFAULT FALSE,
    processed_at TEXT,

    FOREIGN KEY (government_id) REFERENCES users(id)
);

-- ============================================================================
-- DATA IMPORT LOG (Audit Trail for CSV/Excel Imports)
-- ============================================================================

CREATE TABLE IF NOT EXISTS fsfvi_import_log (
    id TEXT PRIMARY KEY NOT NULL,

    -- Import Context
    government_id TEXT NOT NULL,
    import_batch_id TEXT NOT NULL UNIQUE, -- UUID for this import batch
    filename TEXT NOT NULL,
    file_size_bytes INTEGER,
    file_hash TEXT, -- SHA-256 hash for integrity verification

    -- Import Timing
    import_started_at TEXT NOT NULL,
    import_completed_at TEXT,
    processing_time_ms INTEGER,

    -- Import Statistics
    rows_total INTEGER NOT NULL,
    rows_imported_to_raw INTEGER NOT NULL DEFAULT 0,
    rows_validated INTEGER NOT NULL DEFAULT 0,
    rows_failed_validation INTEGER NOT NULL DEFAULT 0,
    rows_loaded_to_fsfvi INTEGER NOT NULL DEFAULT 0,

    -- Validation Summary
    validation_errors_json TEXT, -- JSON array of validation errors by row
    validation_warnings_json TEXT, -- JSON array of non-critical warnings

    -- Data Quality Metrics
    duplicate_rows INTEGER DEFAULT 0,
    missing_required_fields INTEGER DEFAULT 0,
    invalid_data_types INTEGER DEFAULT 0,
    out_of_range_values INTEGER DEFAULT 0,

    -- Import Status
    status TEXT NOT NULL CHECK (status IN (
        'in_progress',
        'completed_with_errors',
        'completed_successfully',
        'failed'
    )),
    error_message TEXT,

    -- Audit
    created_at TEXT NOT NULL,
    created_by TEXT NOT NULL,

    FOREIGN KEY (government_id) REFERENCES users(id)
);

-- ============================================================================
-- INDEXES for Raw Data
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_raw_import_batch ON demo_raw_data(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_raw_validation_status ON demo_raw_data(validation_status);
CREATE INDEX IF NOT EXISTS idx_raw_government ON demo_raw_data(government_id);
CREATE INDEX IF NOT EXISTS idx_raw_processed ON demo_raw_data(processed_to_fsfvi_data);

CREATE INDEX IF NOT EXISTS idx_import_log_gov ON fsfvi_import_log(government_id);
CREATE INDEX IF NOT EXISTS idx_import_log_date ON fsfvi_import_log(import_started_at);
CREATE INDEX IF NOT EXISTS idx_import_log_batch ON fsfvi_import_log(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_import_log_status ON fsfvi_import_log(status);
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
-- ============================================================================
-- FSFVI RESULTS SCHEMA
-- ============================================================================
-- Stores FSFVI assessment results and budget scenarios
-- ============================================================================

-- ============================================================================
-- ASSESSMENT HISTORY (FSFVI Calculation Results)
-- ============================================================================

CREATE TABLE IF NOT EXISTS fsfvi_assessments (
    id TEXT PRIMARY KEY NOT NULL,

    -- Assessment Context
    government_id TEXT NOT NULL,
    assessment_name TEXT NOT NULL, -- e.g., "2024 Annual Baseline Assessment"
    assessment_date TEXT NOT NULL,
    fiscal_year INTEGER NOT NULL,
    assessment_type TEXT NOT NULL CHECK (assessment_type IN (
        'baseline',
        'midterm_review',
        'endline',
        'crisis_assessment',
        'ad_hoc'
    )),

    -- FSFVI Calculation Results
    fsfvi_score REAL NOT NULL CHECK (fsfvi_score >= 0.0),
    vulnerability_level TEXT NOT NULL CHECK (vulnerability_level IN (
        'low',          -- FSFVI < 0.15
        'medium',       -- FSFVI 0.15-0.30
        'high',         -- FSFVI 0.30-0.50
        'critical'      -- FSFVI > 0.50
    )),

    -- Calculation Configuration
    weighting_method TEXT NOT NULL CHECK (weighting_method IN (
        'Hybrid',
        'Expert',
        'Financial',
        'Network'
    )),
    scenario TEXT NOT NULL CHECK (scenario IN (
        'NormalOperations',
        'ClimateShock',
        'EconomicCrisis',
        'ConflictDisplacement',
        'PandemicResponse',
        'PostDisasterRecovery'
    )),

    -- Component Scores (JSON array)
    component_scores_json TEXT NOT NULL, -- [{"component_type": "...", "score": 0.25, "weight": 0.18}]

    -- Components Used (JSON array of fsfvi_data IDs)
    component_ids_json TEXT NOT NULL, -- ["id1", "id2", ...] Links to fsfvi_data

    -- Recommendations Generated
    recommendations_json TEXT, -- JSON array of actionable recommendations

    -- Priority Areas Identified
    priority_components_json TEXT, -- JSON array of components needing urgent attention

    -- Comparison with Previous Assessment
    previous_assessment_id TEXT,
    score_change REAL, -- Change from previous assessment

    -- Approval Workflow
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft',
        'under_review',
        'approved',
        'published'
    )),
    approved_by TEXT,
    approved_at TEXT,

    -- Audit
    created_at TEXT NOT NULL,
    created_by TEXT NOT NULL,

    FOREIGN KEY (government_id) REFERENCES users(id),
    FOREIGN KEY (previous_assessment_id) REFERENCES fsfvi_assessments(id)
);

-- ============================================================================
-- BUDGET SCENARIOS (Optimization Results)
-- ============================================================================

CREATE TABLE IF NOT EXISTS fsfvi_budget_scenarios (
    id TEXT PRIMARY KEY NOT NULL,

    -- Scenario Context
    government_id TEXT NOT NULL,
    scenario_name TEXT NOT NULL,
    fiscal_year INTEGER NOT NULL,
    total_budget_usd REAL NOT NULL CHECK (total_budget_usd >= 0.0),

    -- Scenario Type
    scenario_type TEXT NOT NULL CHECK (scenario_type IN (
        'baseline',           -- Current allocations
        'optimized',          -- AI-optimized allocations
        'crisis_response',    -- Emergency reallocation
        'custom'              -- User-defined scenario
    )),

    -- Optimization Parameters
    optimization_objective TEXT CHECK (optimization_objective IN (
        'minimize_fsfvi',
        'maximize_efficiency',
        'balanced',
        NULL
    )),

    -- Component Allocations (JSON)
    component_allocations_json TEXT NOT NULL, -- {"agricultural_development": 450000000, ...}

    -- Constraints Applied (JSON)
    constraints_json TEXT, -- {"min_per_component": 10000000, "max_change_pct": 25}

    -- Projected Impact
    projected_fsfvi REAL,
    efficiency_score REAL,
    roi_estimate REAL, -- Estimated return on investment

    -- Comparison with Baseline
    baseline_scenario_id TEXT,
    budget_difference_usd REAL,
    fsfvi_improvement REAL,

    -- Documentation
    description TEXT,
    rationale TEXT,
    assumptions_json TEXT, -- JSON array of assumptions made

    -- Status
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft',
        'proposed',
        'approved',
        'implemented'
    )),

    -- Audit
    created_at TEXT NOT NULL,
    created_by TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (government_id) REFERENCES users(id),
    FOREIGN KEY (baseline_scenario_id) REFERENCES fsfvi_budget_scenarios(id)
);

-- ============================================================================
-- INDEXES for Results Tables
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_assessment_gov_date ON fsfvi_assessments(government_id, assessment_date);
CREATE INDEX IF NOT EXISTS idx_assessment_year ON fsfvi_assessments(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_assessment_type ON fsfvi_assessments(assessment_type);
CREATE INDEX IF NOT EXISTS idx_assessment_status ON fsfvi_assessments(status);

CREATE INDEX IF NOT EXISTS idx_scenario_gov_year ON fsfvi_budget_scenarios(government_id, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_scenario_type ON fsfvi_budget_scenarios(scenario_type);
CREATE INDEX IF NOT EXISTS idx_scenario_status ON fsfvi_budget_scenarios(status);
-- Security Events Table
-- CRITICAL: Immutable audit log for all security-relevant events
-- This table supports government accountability and compliance

CREATE TABLE IF NOT EXISTS security_events (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT,
    event_type TEXT NOT NULL,
    description TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    success BOOLEAN NOT NULL DEFAULT 0,
    timestamp DATETIME NOT NULL,
    metadata TEXT,  -- JSON data for additional context
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indices for fast audit log queries
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_success ON security_events(success);

-- Index for finding failed login attempts (security monitoring)
CREATE INDEX IF NOT EXISTS idx_security_events_failed_logins
ON security_events(event_type, success, timestamp)
WHERE event_type = 'failed_login' AND success = 0;
-- ============================================================================
-- DEMO GOVERNMENT FSFVI DATA - FISCAL YEAR 2025
-- ============================================================================
-- Realistic mock data for demonstrating the FSFVI algorithm
-- Based on international benchmarks (CAADP, SDGs, HLPE recommendations)
-- Represents a typical developing country with varied performance across
-- food system components
--
-- CRITICAL: This is government-level demonstration data where livelihoods
-- depend on accurate FSFVI calculations and correct policy decisions.
-- ============================================================================

-- ============================================================================
-- DATA CONTEXT: Demo Government Country Profile (Fiscal Year 2025)
-- ============================================================================
-- Country: Demo Republic (fictional developing country in Sub-Saharan Africa)
-- Population: ~45 million
-- GDP: ~$75 billion USD
-- Agricultural workforce: ~60% of population
-- Food security status: Moderate vulnerability with regional disparities
-- Government budget: ~$15 billion USD
-- Food systems budget: ~$1.2 billion USD (8% of total budget)
-- ============================================================================

-- ============================================================================
-- CREATE DEMO GOVERNMENT USER
-- ============================================================================
-- Required because fsfvi_data has FOREIGN KEY to users(id)
-- Insert demo_government user if it doesn't exist
INSERT OR IGNORE INTO users (
    id,
    username,
    password_hash,
    role,
    is_temporary_password,
    created_at,
    updated_at,
    login_attempts,
    is_locked,
    two_fa_enabled
) VALUES (
    'demo_government',
    'demo_gov_user',
    'unused_hash_for_demo_data',
    'demo_government',
    0,
    datetime('now'),
    datetime('now'),
    0,
    0,
    0
);

-- ============================================================================
-- Insert validated FSFVI data for Demo Government - FY 2025
-- ============================================================================
-- All 6 component types with realistic performance gaps and allocations

-- ============================================================================
-- 1. AGRICULTURAL DEVELOPMENT
-- ============================================================================
-- Benchmark based on CAADP Malabo Declaration:
-- - 10% of national budget to agriculture (Malabo target)
-- - Agricultural productivity growth rate of 6% per year
-- - This component measures agricultural production, productivity, and value chains
--
-- Observed: 6.8% agricultural budget allocation (BELOW CAADP 10% target)
-- Benchmark: 10.0% (CAADP Malabo target)
-- Performance gap: Underperformance (-32% below target)
-- Allocation: $420M USD (35% of food systems budget - largest allocation)
-- Rationale: High priority but underfunded relative to target
-- NOTE: Weight and sensitivity_parameter will be calculated by the system algorithms
-- ============================================================================

INSERT INTO fsfvi_data (
    id,
    source_raw_data_id,
    government_id,
    country_code,
    country_name,
    fiscal_year,
    reporting_period,
    component_id,
    component_type,
    observed_value,
    benchmark_value,
    financial_allocation_usd,
    data_source,
    data_quality_rating,
    collection_method,
    notes,
    created_at,
    created_by,
    updated_at,
    last_modified_by,
    version
) VALUES (
    'fsfvi_2025_agdev_001',
    NULL,
    'demo_government',
    'DR',
    'Demo Republic',
    2025,
    '2025-Annual',
    'agr_dev_2025',
    'agricultural_development',
    6.8,  -- Observed: 6.8% of national budget to agriculture
    10.0, -- Benchmark: 10% CAADP Malabo target
    420000000.0, -- $420M USD allocation
    'Ministry of Agriculture and Livestock Development - Annual Budget Report 2025',
    'high',
    'Administrative Records',
    'Budget allocation below CAADP Malabo target of 10%. Government committed to increasing allocation to 8% by 2026 and 10% by 2028. Productivity metrics include crop yields, livestock production, and agricultural GDP contribution.',
    datetime('now'),
    'demo_admin',
    datetime('now'),
    'demo_admin',
    1
);

-- ============================================================================
-- 2. INFRASTRUCTURE
-- ============================================================================
-- Benchmark based on FAO/World Bank infrastructure access targets:
-- - 75% rural road accessibility (all-season roads)
-- - 90% post-harvest storage capacity utilization
-- - 80% market infrastructure coverage
--
-- Observed: 58.2% composite infrastructure score (BELOW target)
-- Benchmark: 75.0% (FAO/World Bank target for food systems infrastructure)
-- Performance gap: Underperformance (-22.4% below target)
-- Allocation: $280M USD (23.3% of food systems budget)
-- Rationale: Critical bottleneck in value chain, high allocation priority
-- NOTE: Weight and sensitivity_parameter will be calculated by the system algorithms
-- ============================================================================

INSERT INTO fsfvi_data (
    id,
    source_raw_data_id,
    government_id,
    country_code,
    country_name,
    fiscal_year,
    reporting_period,
    component_id,
    component_type,
    observed_value,
    benchmark_value,
    financial_allocation_usd,
    data_source,
    data_quality_rating,
    collection_method,
    notes,
    created_at,
    created_by,
    updated_at,
    last_modified_by,
    version
) VALUES (
    'fsfvi_2025_infra_002',
    NULL,
    'demo_government',
    'DR',
    'Demo Republic',
    2025,
    '2025-Annual',
    'infrastructure_2025',
    'infrastructure',
    58.2, -- Observed: 58.2% composite infrastructure score
    75.0, -- Benchmark: 75% FAO/World Bank target
    280000000.0, -- $280M USD allocation
    'Ministry of Infrastructure and Transport - Food Systems Infrastructure Assessment 2025',
    'high',
    'Field Surveys and Satellite Data',
    'Rural road accessibility at 52%, post-harvest storage at 65%, market infrastructure at 57%. Major infrastructure gaps in northern and eastern regions. Government prioritizing feeder roads and warehouse construction in 2025-2027.',
    datetime('now'),
    'demo_admin',
    datetime('now'),
    'demo_admin',
    1
);

-- ============================================================================
-- 3. NUTRITION AND HEALTH
-- ============================================================================
-- Benchmark based on WHO/UNICEF/SDG 2 targets:
-- - Stunting prevalence < 20% (WHO target: end malnutrition)
-- - Wasting prevalence < 5% (WHO acceptable threshold)
-- - Anemia prevalence < 25% (WHO moderate public health significance)
--
-- Observed: 68.5% composite nutrition score (ABOVE target - GOOD PERFORMANCE)
-- Benchmark: 65.0% (WHO/UNICEF composite nutrition target)
-- Performance gap: Outperformance (+5.4% above target)
-- Allocation: $185M USD (15.4% of food systems budget)
-- Rationale: Performing well but requires sustained investment
-- NOTE: Weight and sensitivity_parameter will be calculated by the system algorithms
-- ============================================================================

INSERT INTO fsfvi_data (
    id,
    source_raw_data_id,
    government_id,
    country_code,
    country_name,
    fiscal_year,
    reporting_period,
    component_id,
    component_type,
    observed_value,
    benchmark_value,
    financial_allocation_usd,
    data_source,
    data_quality_rating,
    collection_method,
    notes,
    created_at,
    created_by,
    updated_at,
    last_modified_by,
    version
) VALUES (
    'fsfvi_2025_nutr_003',
    NULL,
    'demo_government',
    'DR',
    'Demo Republic',
    2025,
    '2025-Annual',
    'nutrition_health_2025',
    'nutrition_health',
    68.5, -- Observed: 68.5% composite nutrition score (GOOD)
    65.0, -- Benchmark: 65% WHO/UNICEF target
    185000000.0, -- $185M USD allocation
    'Ministry of Health and Sanitation - National Nutrition Survey 2025',
    'high',
    'Demographic and Health Surveys (DHS)',
    'Stunting at 22.5% (improving from 28% in 2020), wasting at 6.2%, anemia at 38%. Strong school feeding programs and fortification initiatives showing results. Urban-rural disparities persist with rural areas lagging.',
    datetime('now'),
    'demo_admin',
    datetime('now'),
    'demo_admin',
    1
);

-- ============================================================================
-- 4. CLIMATE AND NATURAL RESOURCES
-- ============================================================================
-- Benchmark based on IPCC/FAO climate resilience targets:
-- - 40% climate-smart agriculture adoption
-- - 25% forest cover maintenance (FAO sustainable threshold)
-- - 60% sustainable water resource management
--
-- Observed: 42.8% composite climate resilience score (BELOW target)
-- Benchmark: 55.0% (IPCC/FAO climate resilience target)
-- Performance gap: Underperformance (-22.2% below target)
-- Allocation: $155M USD (12.9% of food systems budget)
-- Rationale: Climate vulnerability high, requires increased investment
-- NOTE: Weight and sensitivity_parameter will be calculated by the system algorithms
-- ============================================================================

INSERT INTO fsfvi_data (
    id,
    source_raw_data_id,
    government_id,
    country_code,
    country_name,
    fiscal_year,
    reporting_period,
    component_id,
    component_type,
    observed_value,
    benchmark_value,
    financial_allocation_usd,
    data_source,
    data_quality_rating,
    collection_method,
    notes,
    created_at,
    created_by,
    updated_at,
    last_modified_by,
    version
) VALUES (
    'fsfvi_2025_climate_004',
    NULL,
    'demo_government',
    'DR',
    'Demo Republic',
    2025,
    '2025-Annual',
    'climate_natural_res_2025',
    'climate_natural_resources',
    42.8, -- Observed: 42.8% composite climate resilience score
    55.0, -- Benchmark: 55% IPCC/FAO target
    155000000.0, -- $155M USD allocation
    'Ministry of Environment and Climate Change - Climate Resilience Assessment 2025',
    'medium',
    'Satellite Data and Field Assessments',
    'Climate-smart agriculture at 28%, forest cover at 31%, sustainable water management at 45%. Increased frequency of droughts (2022-2024) exposed vulnerabilities. National Adaptation Plan prioritizes irrigation expansion and drought-resistant crop varieties.',
    datetime('now'),
    'demo_admin',
    datetime('now'),
    'demo_admin',
    1
);

-- ============================================================================
-- 5. SOCIAL PROTECTION AND EQUITY
-- ============================================================================
-- Benchmark based on ILO/World Bank social protection targets:
-- - 60% coverage of vulnerable populations by social protection programs
-- - Gender parity in agricultural extension services (50% female participation)
-- - 80% food assistance reach to food-insecure households
--
-- Observed: 71.2% composite social protection score (ABOVE target - GOOD)
-- Benchmark: 65.0% (ILO/World Bank social protection target)
-- Performance gap: Outperformance (+9.5% above target)
-- Allocation: $120M USD (10% of food systems budget)
-- Rationale: Strong performance, maintain funding to sustain programs
-- NOTE: Weight and sensitivity_parameter will be calculated by the system algorithms
-- ============================================================================

INSERT INTO fsfvi_data (
    id,
    source_raw_data_id,
    government_id,
    country_code,
    country_name,
    fiscal_year,
    reporting_period,
    component_id,
    component_type,
    observed_value,
    benchmark_value,
    financial_allocation_usd,
    data_source,
    data_quality_rating,
    collection_method,
    notes,
    created_at,
    created_by,
    updated_at,
    last_modified_by,
    version
) VALUES (
    'fsfvi_2025_social_005',
    NULL,
    'demo_government',
    'DR',
    'Demo Republic',
    2025,
    '2025-Annual',
    'social_protection_2025',
    'social_protection_equity',
    71.2, -- Observed: 71.2% composite social protection score (GOOD)
    65.0, -- Benchmark: 65% ILO/World Bank target
    120000000.0, -- $120M USD allocation
    'Ministry of Gender, Children and Social Protection - Social Protection Coverage Report 2025',
    'high',
    'Administrative Records and Household Surveys',
    'Social protection coverage at 68%, gender parity at 47% (improving), food assistance reach at 85%. Cash transfer programs (120,000 households) and school feeding (2.5M children) performing well. Youth unemployment remains challenge.',
    datetime('now'),
    'demo_admin',
    datetime('now'),
    'demo_admin',
    1
);

-- ============================================================================
-- 6. GOVERNANCE AND INSTITUTIONS
-- ============================================================================
-- Benchmark based on FAO/World Bank governance indicators:
-- - 75% budget execution rate (effective fund utilization)
-- - 80% policy implementation score
-- - 70% institutional capacity index
--
-- Observed: 54.5% composite governance score (BELOW target)
-- Benchmark: 70.0% (FAO/World Bank governance target)
-- Performance gap: Underperformance (-22.1% below target)
-- Allocation: $40M USD (3.3% of food systems budget - smallest allocation)
-- Rationale: Weak governance undermines all other components, needs boost
-- NOTE: Weight and sensitivity_parameter will be calculated by the system algorithms
-- ============================================================================

INSERT INTO fsfvi_data (
    id,
    source_raw_data_id,
    government_id,
    country_code,
    country_name,
    fiscal_year,
    reporting_period,
    component_id,
    component_type,
    observed_value,
    benchmark_value,
    financial_allocation_usd,
    data_source,
    data_quality_rating,
    collection_method,
    notes,
    created_at,
    created_by,
    updated_at,
    last_modified_by,
    version
) VALUES (
    'fsfvi_2025_gov_006',
    NULL,
    'demo_government',
    'DR',
    'Demo Republic',
    2025,
    '2025-Annual',
    'governance_inst_2025',
    'governance_institutions',
    54.5, -- Observed: 54.5% composite governance score
    70.0, -- Benchmark: 70% FAO/World Bank target
    40000000.0, -- $40M USD allocation (UNDERFUNDED)
    'Ministry of Planning and Budget - Institutional Capacity Assessment 2025',
    'medium',
    'Administrative Records and Expert Assessments',
    'Budget execution at 62% (delayed disbursements), policy implementation at 51%, institutional capacity at 49%. Coordination challenges between ministries. Data systems fragmented. FSFVI implementation aims to improve governance through evidence-based planning.',
    datetime('now'),
    'demo_admin',
    datetime('now'),
    'demo_admin',
    1
);

-- ============================================================================
-- DATA SUMMARY AND INSIGHTS FOR FSFVI DEMONSTRATION
-- ============================================================================
--
-- TOTAL FOOD SYSTEMS BUDGET: $1.2 billion USD (8% of $15B national budget)
--
-- COMPONENT ALLOCATION BREAKDOWN:
-- 1. Agricultural Development:    $420M (35.0%) - GAP: -32%
-- 2. Infrastructure:              $280M (23.3%) - GAP: -22%
-- 3. Nutrition & Health:          $185M (15.4%) - GAP: +5% ✓
-- 4. Climate & Natural Resources: $155M (12.9%) - GAP: -22%
-- 5. Social Protection & Equity:  $120M (10.0%) - GAP: +10% ✓
-- 6. Governance & Institutions:   $40M  (3.3%)  - GAP: -22%
--                                ------
--                                $1.20B (100%)
--
-- NOTE: Weights and sensitivity parameters will be calculated by FSFVI algorithms
--
-- KEY INSIGHTS FOR FSFVI ALGORITHM DEMONSTRATION:
--
-- 1. MISALIGNMENT: Governance has lowest allocation (3.3%) but critical gap (-22%)
--    → FSFVI should flag this as high vulnerability (weak institutions undermine all)
--
-- 2. UNDERPERFORMANCE IN HIGH-PRIORITY AREAS:
--    - Agricultural Development: Largest allocation BUT still 32% below CAADP target
--    - Infrastructure: Second-largest allocation BUT 22% below target
--    → FSFVI should identify these as requiring MORE resources despite high allocation
--
-- 3. GOOD PERFORMANCE AREAS:
--    - Nutrition & Health: 5% ABOVE target (sustain current investment)
--    - Social Protection: 10% ABOVE target (cost-effective programs working well)
--    → FSFVI should recognize efficient resource use
--
-- 4. EMERGING VULNERABILITY:
--    - Climate & Natural Resources: 22% below target with increasing shocks
--    - Allocation only 12.9% despite growing climate crisis
--    → FSFVI should flag as rising vulnerability requiring attention
--
-- 5. RESOURCE ALLOCATION PATTERNS:
--    - Agriculture: 35% allocation (largest) but still 32% below CAADP target
--    - Infrastructure: 23.3% allocation (second) but 22% below target
--    - Nutrition: 15.4% allocation with good performance (+5% above target)
--    - Climate: 12.9% allocation with poor performance (-22% below target)
--    - Social Protection: 10% allocation with excellent performance (+10% above target)
--    - Governance: 3.3% allocation (smallest) with poor performance (-22% below target)
--    → FSFVI weighting and sensitivity algorithms will analyze optimal allocation
--
-- EXPECTED FSFVI OUTPUT:
-- - Overall FSFVI Index: ~0.55-0.65 (moderate vulnerability)
-- - Highest vulnerability: Governance, Climate, Infrastructure, Agriculture
-- - Lowest vulnerability: Social Protection, Nutrition
-- - Financial efficiency: Social protection highest, governance/infrastructure lower
-- - Recommended reallocation: Increase governance & climate, maintain nutrition/social
--
-- POLICY IMPLICATIONS:
-- 1. Strengthen institutional capacity (governance) as foundation
-- 2. Close agricultural budget gap to reach CAADP 10% target
-- 3. Accelerate climate adaptation investments
-- 4. Maintain nutrition and social protection programs (working well)
-- 5. Infrastructure requires sustained high investment (multi-year)
--
-- This dataset provides a realistic demonstration of:
-- - Performance gaps (some components above, some below benchmarks)
-- - Budget allocation decisions (not always aligned with needs)
-- - Cross-component dependencies (governance affects all)
-- - Resource efficiency variations (social protection cost-effective, infrastructure capital-intensive)
-- - Climate vulnerabilities (emerging threat requiring attention)
-- ============================================================================

-- Verify data insertion
SELECT
    component_type,
    observed_value,
    benchmark_value,
    ROUND((observed_value - benchmark_value) / benchmark_value * 100, 1) AS performance_gap_pct,
    ROUND(financial_allocation_usd / 1000000, 0) AS allocation_millions_usd,
    ROUND(financial_allocation_usd / 1200000000.0 * 100, 1) AS pct_of_total_budget
FROM fsfvi_data
WHERE government_id = 'demo_government'
  AND fiscal_year = 2025
ORDER BY financial_allocation_usd DESC;
