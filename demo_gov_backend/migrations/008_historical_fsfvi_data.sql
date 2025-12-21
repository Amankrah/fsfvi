-- ============================================================================
-- HISTORICAL FSFVI DATA - FISCAL YEARS 2021-2024
-- ============================================================================
-- Realistic historical progression showing how Demo Government performance
-- has evolved over 5 years (2021-2025)
--
-- This enables meaningful Gap Closure Tracking and trend analysis
-- ============================================================================

-- ============================================================================
-- FISCAL YEAR 2021 - BASELINE YEAR
-- ============================================================================
-- Starting point: Government beginning food systems reform
-- Total budget: $1.0B USD (6.7% of national budget)
-- ============================================================================

-- 1. Agricultural Development - FY 2021
INSERT OR IGNORE INTO fsfvi_data (
    id, source_raw_data_id, government_id, country_code, country_name,
    fiscal_year, reporting_period, component_id, component_type,
    observed_value, benchmark_value, financial_allocation_usd,
    data_source, data_quality_rating, collection_method, notes,
    created_at, created_by, updated_at, last_modified_by, version
) VALUES (
    'fsfvi_2021_agdev_001', NULL, 'demo_government', 'DR', 'Demo Republic',
    2021, '2021-Annual', 'agr_dev_2021', 'agricultural_development',
    5.2, 10.0, 320000000.0,
    'Ministry of Agriculture - Annual Budget Report 2021', 'medium',
    'Administrative Records',
    'Starting point: 5.2% agricultural budget allocation, significantly below CAADP 10% target. Limited productivity growth.',
    datetime('now'), 'demo_admin', datetime('now'), 'demo_admin', 1
);

-- 2. Infrastructure - FY 2021
INSERT OR IGNORE INTO fsfvi_data (
    id, source_raw_data_id, government_id, country_code, country_name,
    fiscal_year, reporting_period, component_id, component_type,
    observed_value, benchmark_value, financial_allocation_usd,
    data_source, data_quality_rating, collection_method, notes,
    created_at, created_by, updated_at, last_modified_by, version
) VALUES (
    'fsfvi_2021_infra_002', NULL, 'demo_government', 'DR', 'Demo Republic',
    2021, '2021-Annual', 'infrastructure_2021', 'infrastructure',
    48.5, 75.0, 210000000.0,
    'Ministry of Infrastructure - Infrastructure Assessment 2021', 'medium',
    'Field Surveys',
    'Poor infrastructure: rural road accessibility 42%, storage 48%, market infrastructure 50%. Major bottleneck.',
    datetime('now'), 'demo_admin', datetime('now'), 'demo_admin', 1
);

-- 3. Nutrition and Health - FY 2021
INSERT OR IGNORE INTO fsfvi_data (
    id, source_raw_data_id, government_id, country_code, country_name,
    fiscal_year, reporting_period, component_id, component_type,
    observed_value, benchmark_value, financial_allocation_usd,
    data_source, data_quality_rating, collection_method, notes,
    created_at, created_by, updated_at, last_modified_by, version
) VALUES (
    'fsfvi_2021_nutr_003', NULL, 'demo_government', 'DR', 'Demo Republic',
    2021, '2021-Annual', 'nutrition_health_2021', 'nutrition_health',
    61.2, 65.0, 150000000.0,
    'Ministry of Health - National Nutrition Survey 2021', 'high',
    'Demographic and Health Surveys (DHS)',
    'Baseline nutrition: Stunting at 31%, wasting at 8.5%, anemia at 45%. Below target but programs expanding.',
    datetime('now'), 'demo_admin', datetime('now'), 'demo_admin', 1
);

-- 4. Climate and Natural Resources - FY 2021
INSERT OR IGNORE INTO fsfvi_data (
    id, source_raw_data_id, government_id, country_code, country_name,
    fiscal_year, reporting_period, component_id, component_type,
    observed_value, benchmark_value, financial_allocation_usd,
    data_source, data_quality_rating, collection_method, notes,
    created_at, created_by, updated_at, last_modified_by, version
) VALUES (
    'fsfvi_2021_climate_004', NULL, 'demo_government', 'DR', 'Demo Republic',
    2021, '2021-Annual', 'climate_natural_res_2021', 'climate_natural_resources',
    35.8, 55.0, 110000000.0,
    'Ministry of Environment - Climate Assessment 2021', 'medium',
    'Satellite Data',
    'Very poor climate resilience: CSA adoption 18%, forest cover 28%, water management 38%. Climate vulnerability high.',
    datetime('now'), 'demo_admin', datetime('now'), 'demo_admin', 1
);

-- 5. Social Protection and Equity - FY 2021
INSERT OR IGNORE INTO fsfvi_data (
    id, source_raw_data_id, government_id, country_code, country_name,
    fiscal_year, reporting_period, component_id, component_type,
    observed_value, benchmark_value, financial_allocation_usd,
    data_source, data_quality_rating, collection_method, notes,
    created_at, created_by, updated_at, last_modified_by, version
) VALUES (
    'fsfvi_2021_social_005', NULL, 'demo_government', 'DR', 'Demo Republic',
    2021, '2021-Annual', 'social_protection_2021', 'social_protection_equity',
    58.5, 65.0, 80000000.0,
    'Ministry of Social Protection - Coverage Report 2021', 'medium',
    'Administrative Records',
    'Limited social protection: 55% coverage, gender parity 38%, food assistance 72%. Programs starting to scale.',
    datetime('now'), 'demo_admin', datetime('now'), 'demo_admin', 1
);

-- 6. Governance and Institutions - FY 2021
INSERT OR IGNORE INTO fsfvi_data (
    id, source_raw_data_id, government_id, country_code, country_name,
    fiscal_year, reporting_period, component_id, component_type,
    observed_value, benchmark_value, financial_allocation_usd,
    data_source, data_quality_rating, collection_method, notes,
    created_at, created_by, updated_at, last_modified_by, version
) VALUES (
    'fsfvi_2021_gov_006', NULL, 'demo_government', 'DR', 'Demo Republic',
    2021, '2021-Annual', 'governance_inst_2021', 'governance_institutions',
    48.2, 70.0, 30000000.0,
    'Ministry of Planning - Capacity Assessment 2021', 'low',
    'Expert Assessments',
    'Weak governance: Budget execution 52%, policy implementation 45%, capacity 47%. Major coordination gaps.',
    datetime('now'), 'demo_admin', datetime('now'), 'demo_admin', 1
);

-- ============================================================================
-- FISCAL YEAR 2022 - YEAR 2
-- ============================================================================
-- Some improvements, drought impact on agriculture
-- Total budget: $1.05B USD (7% of national budget)
-- ============================================================================

-- 1. Agricultural Development - FY 2022
INSERT OR IGNORE INTO fsfvi_data (
    id, source_raw_data_id, government_id, country_code, country_name,
    fiscal_year, reporting_period, component_id, component_type,
    observed_value, benchmark_value, financial_allocation_usd,
    data_source, data_quality_rating, collection_method, notes,
    created_at, created_by, updated_at, last_modified_by, version
) VALUES (
    'fsfvi_2022_agdev_001', NULL, 'demo_government', 'DR', 'Demo Republic',
    2022, '2022-Annual', 'agr_dev_2022', 'agricultural_development',
    5.8, 10.0, 350000000.0,
    'Ministry of Agriculture - Annual Budget Report 2022', 'medium',
    'Administrative Records',
    'Modest improvement to 5.8% despite drought. Budget increased but still below CAADP target.',
    datetime('now'), 'demo_admin', datetime('now'), 'demo_admin', 1
);

-- 2. Infrastructure - FY 2022
INSERT OR IGNORE INTO fsfvi_data (
    id, source_raw_data_id, government_id, country_code, country_name,
    fiscal_year, reporting_period, component_id, component_type,
    observed_value, benchmark_value, financial_allocation_usd,
    data_source, data_quality_rating, collection_method, notes,
    created_at, created_by, updated_at, last_modified_by, version
) VALUES (
    'fsfvi_2022_infra_002', NULL, 'demo_government', 'DR', 'Demo Republic',
    2022, '2022-Annual', 'infrastructure_2022', 'infrastructure',
    51.8, 75.0, 240000000.0,
    'Ministry of Infrastructure - Infrastructure Assessment 2022', 'medium',
    'Field Surveys',
    'Gradual improvement: Roads 45%, storage 55%, markets 52%. Feeder roads program launched.',
    datetime('now'), 'demo_admin', datetime('now'), 'demo_admin', 1
);

-- 3. Nutrition and Health - FY 2022
INSERT OR IGNORE INTO fsfvi_data (
    id, source_raw_data_id, government_id, country_code, country_name,
    fiscal_year, reporting_period, component_id, component_type,
    observed_value, benchmark_value, financial_allocation_usd,
    data_source, data_quality_rating, collection_method, notes,
    created_at, created_by, updated_at, last_modified_by, version
) VALUES (
    'fsfvi_2022_nutr_003', NULL, 'demo_government', 'DR', 'Demo Republic',
    2022, '2022-Annual', 'nutrition_health_2022', 'nutrition_health',
    63.5, 65.0, 160000000.0,
    'Ministry of Health - National Nutrition Survey 2022', 'high',
    'Demographic and Health Surveys (DHS)',
    'Good progress: Stunting down to 28%, wasting 7.5%, anemia 42%. School feeding scaling up.',
    datetime('now'), 'demo_admin', datetime('now'), 'demo_admin', 1
);

-- 4. Climate and Natural Resources - FY 2022
INSERT OR IGNORE INTO fsfvi_data (
    id, source_raw_data_id, government_id, country_code, country_name,
    fiscal_year, reporting_period, component_id, component_type,
    observed_value, benchmark_value, financial_allocation_usd,
    data_source, data_quality_rating, collection_method, notes,
    created_at, created_by, updated_at, last_modified_by, version
) VALUES (
    'fsfvi_2022_climate_004', NULL, 'demo_government', 'DR', 'Demo Republic',
    2022, '2022-Annual', 'climate_natural_res_2022', 'climate_natural_resources',
    37.2, 55.0, 120000000.0,
    'Ministry of Environment - Climate Assessment 2022', 'medium',
    'Satellite Data',
    'Drought year exposed vulnerabilities. CSA 20%, forest 29%, water 39%. Climate adaptation urgent.',
    datetime('now'), 'demo_admin', datetime('now'), 'demo_admin', 1
);

-- 5. Social Protection and Equity - FY 2022
INSERT OR IGNORE INTO fsfvi_data (
    id, source_raw_data_id, government_id, country_code, country_name,
    fiscal_year, reporting_period, component_id, component_type,
    observed_value, benchmark_value, financial_allocation_usd,
    data_source, data_quality_rating, collection_method, notes,
    created_at, created_by, updated_at, last_modified_by, version
) VALUES (
    'fsfvi_2022_social_005', NULL, 'demo_government', 'DR', 'Demo Republic',
    2022, '2022-Annual', 'social_protection_2022', 'social_protection_equity',
    62.8, 65.0, 95000000.0,
    'Ministry of Social Protection - Coverage Report 2022', 'high',
    'Administrative Records',
    'Strong improvement: Coverage 60%, gender parity 41%, food assistance 78%. Cash transfers expanding.',
    datetime('now'), 'demo_admin', datetime('now'), 'demo_admin', 1
);

-- 6. Governance and Institutions - FY 2022
INSERT OR IGNORE INTO fsfvi_data (
    id, source_raw_data_id, government_id, country_code, country_name,
    fiscal_year, reporting_period, component_id, component_type,
    observed_value, benchmark_value, financial_allocation_usd,
    data_source, data_quality_rating, collection_method, notes,
    created_at, created_by, updated_at, last_modified_by, version
) VALUES (
    'fsfvi_2022_gov_006', NULL, 'demo_government', 'DR', 'Demo Republic',
    2022, '2022-Annual', 'governance_inst_2022', 'governance_institutions',
    50.5, 70.0, 35000000.0,
    'Ministry of Planning - Capacity Assessment 2022', 'medium',
    'Expert Assessments',
    'Slight improvement: Budget execution 56%, policy 47%, capacity 48%. Data systems still fragmented.',
    datetime('now'), 'demo_admin', datetime('now'), 'demo_admin', 1
);

-- ============================================================================
-- FISCAL YEAR 2023 - YEAR 3
-- ============================================================================
-- Recovery from drought, investments showing results
-- Total budget: $1.1B USD (7.3% of national budget)
-- ============================================================================

-- 1. Agricultural Development - FY 2023
INSERT OR IGNORE INTO fsfvi_data (
    id, source_raw_data_id, government_id, country_code, country_name,
    fiscal_year, reporting_period, component_id, component_type,
    observed_value, benchmark_value, financial_allocation_usd,
    data_source, data_quality_rating, collection_method, notes,
    created_at, created_by, updated_at, last_modified_by, version
) VALUES (
    'fsfvi_2023_agdev_001', NULL, 'demo_government', 'DR', 'Demo Republic',
    2023, '2023-Annual', 'agr_dev_2023', 'agricultural_development',
    6.2, 10.0, 380000000.0,
    'Ministry of Agriculture - Annual Budget Report 2023', 'high',
    'Administrative Records',
    'Recovery year: 6.2% allocation. Productivity improvements from extension services. Still below target.',
    datetime('now'), 'demo_admin', datetime('now'), 'demo_admin', 1
);

-- 2. Infrastructure - FY 2023
INSERT OR IGNORE INTO fsfvi_data (
    id, source_raw_data_id, government_id, country_code, country_name,
    fiscal_year, reporting_period, component_id, component_type,
    observed_value, benchmark_value, financial_allocation_usd,
    data_source, data_quality_rating, collection_method, notes,
    created_at, created_by, updated_at, last_modified_by, version
) VALUES (
    'fsfvi_2023_infra_002', NULL, 'demo_government', 'DR', 'Demo Republic',
    2023, '2023-Annual', 'infrastructure_2023', 'infrastructure',
    54.5, 75.0, 260000000.0,
    'Ministry of Infrastructure - Infrastructure Assessment 2023', 'high',
    'Field Surveys and Satellite',
    'Infrastructure gains: Roads 48%, storage 60%, markets 55%. Warehouse construction accelerating.',
    datetime('now'), 'demo_admin', datetime('now'), 'demo_admin', 1
);

-- 3. Nutrition and Health - FY 2023
INSERT OR IGNORE INTO fsfvi_data (
    id, source_raw_data_id, government_id, country_code, country_name,
    fiscal_year, reporting_period, component_id, component_type,
    observed_value, benchmark_value, financial_allocation_usd,
    data_source, data_quality_rating, collection_method, notes,
    created_at, created_by, updated_at, last_modified_by, version
) VALUES (
    'fsfvi_2023_nutr_003', NULL, 'demo_government', 'DR', 'Demo Republic',
    2023, '2023-Annual', 'nutrition_health_2023', 'nutrition_health',
    65.8, 65.0, 170000000.0,
    'Ministry of Health - National Nutrition Survey 2023', 'high',
    'Demographic and Health Surveys (DHS)',
    'TARGET MET! Stunting 25%, wasting 7%, anemia 40%. Fortification programs working well.',
    datetime('now'), 'demo_admin', datetime('now'), 'demo_admin', 1
);

-- 4. Climate and Natural Resources - FY 2023
INSERT OR IGNORE INTO fsfvi_data (
    id, source_raw_data_id, government_id, country_code, country_name,
    fiscal_year, reporting_period, component_id, component_type,
    observed_value, benchmark_value, financial_allocation_usd,
    data_source, data_quality_rating, collection_method, notes,
    created_at, created_by, updated_at, last_modified_by, version
) VALUES (
    'fsfvi_2023_climate_004', NULL, 'demo_government', 'DR', 'Demo Republic',
    2023, '2023-Annual', 'climate_natural_res_2023', 'climate_natural_resources',
    39.5, 55.0, 135000000.0,
    'Ministry of Environment - Climate Assessment 2023', 'medium',
    'Satellite Data and Field',
    'Slow progress: CSA 23%, forest 30%, water 41%. National Adaptation Plan launched.',
    datetime('now'), 'demo_admin', datetime('now'), 'demo_admin', 1
);

-- 5. Social Protection and Equity - FY 2023
INSERT OR IGNORE INTO fsfvi_data (
    id, source_raw_data_id, government_id, country_code, country_name,
    fiscal_year, reporting_period, component_id, component_type,
    observed_value, benchmark_value, financial_allocation_usd,
    data_source, data_quality_rating, collection_method, notes,
    created_at, created_by, updated_at, last_modified_by, version
) VALUES (
    'fsfvi_2023_social_005', NULL, 'demo_government', 'DR', 'Demo Republic',
    2023, '2023-Annual', 'social_protection_2023', 'social_protection_equity',
    67.2, 65.0, 105000000.0,
    'Ministry of Social Protection - Coverage Report 2023', 'high',
    'Administrative Records',
    'EXCEEDS TARGET! Coverage 65%, gender parity 44%, food assistance 82%. Model programs.',
    datetime('now'), 'demo_admin', datetime('now'), 'demo_admin', 1
);

-- 6. Governance and Institutions - FY 2023
INSERT OR IGNORE INTO fsfvi_data (
    id, source_raw_data_id, government_id, country_code, country_name,
    fiscal_year, reporting_period, component_id, component_type,
    observed_value, benchmark_value, financial_allocation_usd,
    data_source, data_quality_rating, collection_method, notes,
    created_at, created_by, updated_at, last_modified_by, version
) VALUES (
    'fsfvi_2023_gov_006', NULL, 'demo_government', 'DR', 'Demo Republic',
    2023, '2023-Annual', 'governance_inst_2023', 'governance_institutions',
    52.2, 70.0, 38000000.0,
    'Ministry of Planning - Capacity Assessment 2023', 'medium',
    'Expert Assessments',
    'Incremental gains: Budget execution 58%, policy 49%, capacity 49%. Coordination improving.',
    datetime('now'), 'demo_admin', datetime('now'), 'demo_admin', 1
);

-- ============================================================================
-- FISCAL YEAR 2024 - YEAR 4
-- ============================================================================
-- Continued progress, FSFVI system being implemented
-- Total budget: $1.15B USD (7.7% of national budget)
-- ============================================================================

-- 1. Agricultural Development - FY 2024
INSERT OR IGNORE INTO fsfvi_data (
    id, source_raw_data_id, government_id, country_code, country_name,
    fiscal_year, reporting_period, component_id, component_type,
    observed_value, benchmark_value, financial_allocation_usd,
    data_source, data_quality_rating, collection_method, notes,
    created_at, created_by, updated_at, last_modified_by, version
) VALUES (
    'fsfvi_2024_agdev_001', NULL, 'demo_government', 'DR', 'Demo Republic',
    2024, '2024-Annual', 'agr_dev_2024', 'agricultural_development',
    6.5, 10.0, 400000000.0,
    'Ministry of Agriculture - Annual Budget Report 2024', 'high',
    'Administrative Records',
    'Steady progress to 6.5%. Value chain investments showing results. Path to 10% target by 2028.',
    datetime('now'), 'demo_admin', datetime('now'), 'demo_admin', 1
);

-- 2. Infrastructure - FY 2024
INSERT OR IGNORE INTO fsfvi_data (
    id, source_raw_data_id, government_id, country_code, country_name,
    fiscal_year, reporting_period, component_id, component_type,
    observed_value, benchmark_value, financial_allocation_usd,
    data_source, data_quality_rating, collection_method, notes,
    created_at, created_by, updated_at, last_modified_by, version
) VALUES (
    'fsfvi_2024_infra_002', NULL, 'demo_government', 'DR', 'Demo Republic',
    2024, '2024-Annual', 'infrastructure_2024', 'infrastructure',
    56.5, 75.0, 270000000.0,
    'Ministry of Infrastructure - Infrastructure Assessment 2024', 'high',
    'Field Surveys and Satellite',
    'Continued improvement: Roads 50%, storage 62%, markets 57%. Post-harvest losses declining.',
    datetime('now'), 'demo_admin', datetime('now'), 'demo_admin', 1
);

-- 3. Nutrition and Health - FY 2024
INSERT OR IGNORE INTO fsfvi_data (
    id, source_raw_data_id, government_id, country_code, country_name,
    fiscal_year, reporting_period, component_id, component_type,
    observed_value, benchmark_value, financial_allocation_usd,
    data_source, data_quality_rating, collection_method, notes,
    created_at, created_by, updated_at, last_modified_by, version
) VALUES (
    'fsfvi_2024_nutr_003', NULL, 'demo_government', 'DR', 'Demo Republic',
    2024, '2024-Annual', 'nutrition_health_2024', 'nutrition_health',
    67.2, 65.0, 178000000.0,
    'Ministry of Health - National Nutrition Survey 2024', 'high',
    'Demographic and Health Surveys (DHS)',
    'Strong performance: Stunting 24%, wasting 6.5%, anemia 39%. Sustaining gains.',
    datetime('now'), 'demo_admin', datetime('now'), 'demo_admin', 1
);

-- 4. Climate and Natural Resources - FY 2024
INSERT OR IGNORE INTO fsfvi_data (
    id, source_raw_data_id, government_id, country_code, country_name,
    fiscal_year, reporting_period, component_id, component_type,
    observed_value, benchmark_value, financial_allocation_usd,
    data_source, data_quality_rating, collection_method, notes,
    created_at, created_by, updated_at, last_modified_by, version
) VALUES (
    'fsfvi_2024_climate_004', NULL, 'demo_government', 'DR', 'Demo Republic',
    2024, '2024-Annual', 'climate_natural_res_2024', 'climate_natural_resources',
    41.2, 55.0, 145000000.0,
    'Ministry of Environment - Climate Assessment 2024', 'medium',
    'Satellite Data and Field',
    'Gradual progress: CSA 25%, forest 31%, water 43%. Drought-resistant varieties expanding.',
    datetime('now'), 'demo_admin', datetime('now'), 'demo_admin', 1
);

-- 5. Social Protection and Equity - FY 2024
INSERT OR IGNORE INTO fsfvi_data (
    id, source_raw_data_id, government_id, country_code, country_name,
    fiscal_year, reporting_period, component_id, component_type,
    observed_value, benchmark_value, financial_allocation_usd,
    data_source, data_quality_rating, collection_method, notes,
    created_at, created_by, updated_at, last_modified_by, version
) VALUES (
    'fsfvi_2024_social_005', NULL, 'demo_government', 'DR', 'Demo Republic',
    2024, '2024-Annual', 'social_protection_2024', 'social_protection_equity',
    69.5, 65.0, 115000000.0,
    'Ministry of Social Protection - Coverage Report 2024', 'high',
    'Administrative Records',
    'Excellent performance: Coverage 67%, gender parity 46%, food assistance 84%. Cost-effective programs.',
    datetime('now'), 'demo_admin', datetime('now'), 'demo_admin', 1
);

-- 6. Governance and Institutions - FY 2024
INSERT OR IGNORE INTO fsfvi_data (
    id, source_raw_data_id, government_id, country_code, country_name,
    fiscal_year, reporting_period, component_id, component_type,
    observed_value, benchmark_value, financial_allocation_usd,
    data_source, data_quality_rating, collection_method, notes,
    created_at, created_by, updated_at, last_modified_by, version
) VALUES (
    'fsfvi_2024_gov_006', NULL, 'demo_government', 'DR', 'Demo Republic',
    2024, '2024-Annual', 'governance_inst_2024', 'governance_institutions',
    53.5, 70.0, 40000000.0,
    'Ministry of Planning - Capacity Assessment 2024', 'medium',
    'Expert Assessments',
    'Modest gains: Budget execution 60%, policy 50%, capacity 50%. FSFVI system implementation beginning.',
    datetime('now'), 'demo_admin', datetime('now'), 'demo_admin', 1
);

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Check all 5 years of data

SELECT
    fiscal_year,
    component_type,
    observed_value,
    benchmark_value,
    ROUND((observed_value - benchmark_value) / benchmark_value * 100, 1) AS gap_pct,
    ROUND(financial_allocation_usd / 1000000, 0) AS allocation_m_usd
FROM fsfvi_data
WHERE government_id = 'demo_government'
ORDER BY fiscal_year ASC, component_type;

-- ============================================================================
-- DATA SUMMARY: 5-YEAR PROGRESSION (2021-2025)
-- ============================================================================
--
-- AGRICULTURAL DEVELOPMENT:
--   2021: 5.2% → 2022: 5.8% → 2023: 6.2% → 2024: 6.5% → 2025: 6.8%
--   Progress: +1.6% over 5 years (steady improvement but still 32% below target)
--   Budget: $320M → $350M → $380M → $400M → $420M (+31% growth)
--
-- INFRASTRUCTURE:
--   2021: 48.5% → 2022: 51.8% → 2023: 54.5% → 2024: 56.5% → 2025: 58.2%
--   Progress: +9.7% over 5 years (consistent gains, still 22% below target)
--   Budget: $210M → $240M → $260M → $270M → $280M (+33% growth)
--
-- NUTRITION & HEALTH:
--   2021: 61.2% → 2022: 63.5% → 2023: 65.8% → 2024: 67.2% → 2025: 68.5%
--   Progress: +7.3% over 5 years (MET TARGET in 2023, now EXCEEDS by 5%)
--   Budget: $150M → $160M → $170M → $178M → $185M (+23% growth)
--
-- CLIMATE & NATURAL RESOURCES:
--   2021: 35.8% → 2022: 37.2% → 2023: 39.5% → 2024: 41.2% → 2025: 42.8%
--   Progress: +7.0% over 5 years (slowest improvement, still 22% below target)
--   Budget: $110M → $120M → $135M → $145M → $155M (+41% growth)
--
-- SOCIAL PROTECTION & EQUITY:
--   2021: 58.5% → 2022: 62.8% → 2023: 67.2% → 2024: 69.5% → 2025: 71.2%
--   Progress: +12.7% over 5 years (BEST PERFORMER, exceeds target by 10%)
--   Budget: $80M → $95M → $105M → $115M → $120M (+50% growth)
--
-- GOVERNANCE & INSTITUTIONS:
--   2021: 48.2% → 2022: 50.5% → 2023: 52.2% → 2024: 53.5% → 2025: 54.5%
--   Progress: +6.3% over 5 years (slowest growth, still 22% below target)
--   Budget: $30M → $35M → $38M → $40M → $40M (+33% growth)
--
-- TOTAL BUDGET EVOLUTION:
--   2021: $1.00B (6.7% of national budget)
--   2022: $1.05B (7.0%)
--   2023: $1.10B (7.3%)
--   2024: $1.15B (7.7%)
--   2025: $1.20B (8.0%)
--   Growth: +20% over 5 years
--
-- KEY TRENDS FOR GAP CLOSURE TRACKING:
-- 1. SUCCESS STORY: Social Protection (58.5% → 71.2%, +12.7%)
-- 2. STRONG PERFORMANCE: Nutrition (61.2% → 68.5%, +7.3%, exceeds target)
-- 3. STEADY IMPROVEMENT: Infrastructure (48.5% → 58.2%, +9.7%)
-- 4. PERSISTENT GAPS: Agriculture, Climate, Governance (all still 22-32% below targets)
-- 5. RESOURCE EFFICIENCY: Social protection achieved most with moderate budget
-- 6. INVESTMENT NEED: Climate has highest budget growth (+41%) but slowest progress
--
-- This historical data enables:
-- - Meaningful gap closure tracking (baseline vs current comparison)
-- - Trend analysis (which components improving/stagnating)
-- - Resource efficiency assessment (budget growth vs performance gains)
-- - Policy effectiveness evaluation (what's working, what's not)
-- ============================================================================
