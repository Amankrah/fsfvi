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
