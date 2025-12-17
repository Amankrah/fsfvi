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
