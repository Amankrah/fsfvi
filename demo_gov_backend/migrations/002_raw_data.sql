-- ============================================================================
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
