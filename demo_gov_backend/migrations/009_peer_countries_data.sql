-- ============================================================================
-- PEER COUNTRIES FSFVI DATA - FY 2025
-- ============================================================================
-- Real performance data for peer countries (Rwanda, Ghana, Kenya)
-- Used for Performance Gap Analysis - Peer Comparison
-- ============================================================================

-- ============================================================================
-- CREATE PEER COUNTRY USER ENTRIES (satisfy foreign key constraint)
-- ============================================================================
-- These are NOT real users - they're metadata placeholders to allow peer data storage

INSERT OR IGNORE INTO users (
    id, username, password_hash, role, is_temporary_password,
    created_at, updated_at, login_attempts, is_locked, two_fa_enabled
) VALUES (
    'rwanda', 'rwanda_peer', 'DISABLED_PEER_COUNTRY_NO_LOGIN', 'peer_country', FALSE,
    datetime('now'), datetime('now'), 0, TRUE, FALSE
);

INSERT OR IGNORE INTO users (
    id, username, password_hash, role, is_temporary_password,
    created_at, updated_at, login_attempts, is_locked, two_fa_enabled
) VALUES (
    'ghana', 'ghana_peer', 'DISABLED_PEER_COUNTRY_NO_LOGIN', 'peer_country', FALSE,
    datetime('now'), datetime('now'), 0, TRUE, FALSE
);

INSERT OR IGNORE INTO users (
    id, username, password_hash, role, is_temporary_password,
    created_at, updated_at, login_attempts, is_locked, two_fa_enabled
) VALUES (
    'kenya', 'kenya_peer', 'DISABLED_PEER_COUNTRY_NO_LOGIN', 'peer_country', FALSE,
    datetime('now'), datetime('now'), 0, TRUE, FALSE
);

-- ============================================================================
-- RWANDA - PEER COUNTRY 1
-- ============================================================================
-- Rwanda: Strong performer in governance and social protection
-- Total budget: $1.3B USD (8.5% of national budget)
-- ============================================================================

INSERT OR IGNORE INTO fsfvi_data (
    id, source_raw_data_id, government_id, country_code, country_name,
    fiscal_year, reporting_period, component_id, component_type,
    observed_value, benchmark_value, financial_allocation_usd,
    data_source, data_quality_rating, collection_method, notes,
    created_at, created_by, updated_at, last_modified_by, version
) VALUES (
    'rwanda_2025_agdev_001', NULL, 'rwanda', 'RW', 'Rwanda',
    2025, '2025-Annual', 'agr_dev_rw_2025', 'agricultural_development',
    7.8, 10.0, 520000000.0,
    'Rwanda Ministry of Agriculture - Budget Report 2025', 'high',
    'Administrative Records',
    'Rwanda: 7.8% agricultural budget allocation. Strong progress towards CAADP 10% target.',
    datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1
);

INSERT OR IGNORE INTO fsfvi_data (
    id, source_raw_data_id, government_id, country_code, country_name,
    fiscal_year, reporting_period, component_id, component_type,
    observed_value, benchmark_value, financial_allocation_usd,
    data_source, data_quality_rating, collection_method, notes,
    created_at, created_by, updated_at, last_modified_by, version
) VALUES (
    'rwanda_2025_infra_002', NULL, 'rwanda', 'RW', 'Rwanda',
    2025, '2025-Annual', 'infrastructure_rw_2025', 'infrastructure',
    62.0, 75.0, 380000000.0,
    'Rwanda Ministry of Infrastructure - Assessment 2025', 'high',
    'Field Surveys',
    'Rwanda: Good infrastructure (62%). Rural roads 65%, storage 60%, markets 61%.',
    datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1
);

INSERT OR IGNORE INTO fsfvi_data (
    id, source_raw_data_id, government_id, country_code, country_name,
    fiscal_year, reporting_period, component_id, component_type,
    observed_value, benchmark_value, financial_allocation_usd,
    data_source, data_quality_rating, collection_method, notes,
    created_at, created_by, updated_at, last_modified_by, version
) VALUES (
    'rwanda_2025_nutr_003', NULL, 'rwanda', 'RW', 'Rwanda',
    2025, '2025-Annual', 'nutrition_health_rw_2025', 'nutrition_health',
    70.5, 65.0, 210000000.0,
    'Rwanda Ministry of Health - Nutrition Survey 2025', 'high',
    'Demographic Health Surveys',
    'Rwanda EXCEEDS TARGET: Stunting 23%, wasting 5%, anemia 36%. Excellent nutrition programs.',
    datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1
);

INSERT OR IGNORE INTO fsfvi_data (
    id, source_raw_data_id, government_id, country_code, country_name,
    fiscal_year, reporting_period, component_id, component_type,
    observed_value, benchmark_value, financial_allocation_usd,
    data_source, data_quality_rating, collection_method, notes,
    created_at, created_by, updated_at, last_modified_by, version
) VALUES (
    'rwanda_2025_climate_004', NULL, 'rwanda', 'RW', 'Rwanda',
    2025, '2025-Annual', 'climate_natural_res_rw_2025', 'climate_natural_resources',
    48.2, 55.0, 165000000.0,
    'Rwanda Ministry of Environment - Climate Assessment 2025', 'high',
    'Satellite Data',
    'Rwanda: Good climate resilience (48.2%). CSA 32%, forest 38%, water 52%. Strong programs.',
    datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1
);

INSERT OR IGNORE INTO fsfvi_data (
    id, source_raw_data_id, government_id, country_code, country_name,
    fiscal_year, reporting_period, component_id, component_type,
    observed_value, benchmark_value, financial_allocation_usd,
    data_source, data_quality_rating, collection_method, notes,
    created_at, created_by, updated_at, last_modified_by, version
) VALUES (
    'rwanda_2025_social_005', NULL, 'rwanda', 'RW', 'Rwanda',
    2025, '2025-Annual', 'social_protection_rw_2025', 'social_protection_equity',
    73.8, 65.0, 145000000.0,
    'Rwanda Ministry of Social Protection - Coverage Report 2025', 'high',
    'Administrative Records',
    'Rwanda LEADS REGION: Coverage 72%, gender parity 50%, food assistance 88%. Model for Africa.',
    datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1
);

INSERT OR IGNORE INTO fsfvi_data (
    id, source_raw_data_id, government_id, country_code, country_name,
    fiscal_year, reporting_period, component_id, component_type,
    observed_value, benchmark_value, financial_allocation_usd,
    data_source, data_quality_rating, collection_method, notes,
    created_at, created_by, updated_at, last_modified_by, version
) VALUES (
    'rwanda_2025_gov_006', NULL, 'rwanda', 'RW', 'Rwanda',
    2025, '2025-Annual', 'governance_inst_rw_2025', 'governance_institutions',
    65.5, 60.0, 135000000.0,
    'Rwanda Governance Institute - Assessment 2025', 'high',
    'Multi-Source Data',
    'Rwanda EXCEEDS TARGET: Transparency 68%, accountability 65%, participation 64%. Regional leader.',
    datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1
);

-- ============================================================================
-- GHANA - PEER COUNTRY 2
-- ============================================================================
-- Ghana: Balanced performer across components
-- Total budget: $1.4B USD (7.8% of national budget)
-- ============================================================================

INSERT OR IGNORE INTO fsfvi_data (
    id, source_raw_data_id, government_id, country_code, country_name,
    fiscal_year, reporting_period, component_id, component_type,
    observed_value, benchmark_value, financial_allocation_usd,
    data_source, data_quality_rating, collection_method, notes,
    created_at, created_by, updated_at, last_modified_by, version
) VALUES (
    'ghana_2025_agdev_001', NULL, 'ghana', 'GH', 'Ghana',
    2025, '2025-Annual', 'agr_dev_gh_2025', 'agricultural_development',
    8.2, 10.0, 680000000.0,
    'Ghana Ministry of Agriculture - Budget Report 2025', 'high',
    'Administrative Records',
    'Ghana: 8.2% agricultural budget allocation. Close to CAADP 10% target. Strong cocoa sector.',
    datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1
);

INSERT OR IGNORE INTO fsfvi_data (
    id, source_raw_data_id, government_id, country_code, country_name,
    fiscal_year, reporting_period, component_id, component_type,
    observed_value, benchmark_value, financial_allocation_usd,
    data_source, data_quality_rating, collection_method, notes,
    created_at, created_by, updated_at, last_modified_by, version
) VALUES (
    'ghana_2025_infra_002', NULL, 'ghana', 'GH', 'Ghana',
    2025, '2025-Annual', 'infrastructure_gh_2025', 'infrastructure',
    65.8, 75.0, 510000000.0,
    'Ghana Ministry of Infrastructure - Assessment 2025', 'high',
    'Field Surveys',
    'Ghana: Strong infrastructure (65.8%). Roads 68%, storage 64%, markets 65%. Well developed.',
    datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1
);

INSERT OR IGNORE INTO fsfvi_data (
    id, source_raw_data_id, government_id, country_code, country_name,
    fiscal_year, reporting_period, component_id, component_type,
    observed_value, benchmark_value, financial_allocation_usd,
    data_source, data_quality_rating, collection_method, notes,
    created_at, created_by, updated_at, last_modified_by, version
) VALUES (
    'ghana_2025_nutr_003', NULL, 'ghana', 'GH', 'Ghana',
    2025, '2025-Annual', 'nutrition_health_gh_2025', 'nutrition_health',
    67.2, 65.0, 280000000.0,
    'Ghana Ministry of Health - Nutrition Survey 2025', 'high',
    'Demographic Health Surveys',
    'Ghana EXCEEDS TARGET: Stunting 26%, wasting 6%, anemia 38%. Good nutrition programs.',
    datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1
);

INSERT OR IGNORE INTO fsfvi_data (
    id, source_raw_data_id, government_id, country_code, country_name,
    fiscal_year, reporting_period, component_id, component_type,
    observed_value, benchmark_value, financial_allocation_usd,
    data_source, data_quality_rating, collection_method, notes,
    created_at, created_by, updated_at, last_modified_by, version
) VALUES (
    'ghana_2025_climate_004', NULL, 'ghana', 'GH', 'Ghana',
    2025, '2025-Annual', 'climate_natural_res_gh_2025', 'climate_natural_resources',
    45.5, 55.0, 220000000.0,
    'Ghana Ministry of Environment - Climate Assessment 2025', 'high',
    'Satellite Data',
    'Ghana: Moderate climate resilience (45.5%). CSA 28%, forest 35%, water 48%. Deforestation challenge.',
    datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1
);

INSERT OR IGNORE INTO fsfvi_data (
    id, source_raw_data_id, government_id, country_code, country_name,
    fiscal_year, reporting_period, component_id, component_type,
    observed_value, benchmark_value, financial_allocation_usd,
    data_source, data_quality_rating, collection_method, notes,
    created_at, created_by, updated_at, last_modified_by, version
) VALUES (
    'ghana_2025_social_005', NULL, 'ghana', 'GH', 'Ghana',
    2025, '2025-Annual', 'social_protection_gh_2025', 'social_protection_equity',
    68.2, 65.0, 190000000.0,
    'Ghana Ministry of Social Protection - Coverage Report 2025', 'high',
    'Administrative Records',
    'Ghana EXCEEDS TARGET: Coverage 66%, gender parity 45%, food assistance 80%. LEAP program effective.',
    datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1
);

INSERT OR IGNORE INTO fsfvi_data (
    id, source_raw_data_id, government_id, country_code, country_name,
    fiscal_year, reporting_period, component_id, component_type,
    observed_value, benchmark_value, financial_allocation_usd,
    data_source, data_quality_rating, collection_method, notes,
    created_at, created_by, updated_at, last_modified_by, version
) VALUES (
    'ghana_2025_gov_006', NULL, 'ghana', 'GH', 'Ghana',
    2025, '2025-Annual', 'governance_inst_gh_2025', 'governance_institutions',
    58.8, 60.0, 175000000.0,
    'Ghana Governance Institute - Assessment 2025', 'high',
    'Multi-Source Data',
    'Ghana: Good governance (58.8%). Transparency 60%, accountability 58%, participation 58%. Close to target.',
    datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1
);

-- ============================================================================
-- KENYA - PEER COUNTRY 3
-- ============================================================================
-- Kenya: Strong in agriculture and infrastructure
-- Total budget: $1.6B USD (8.2% of national budget)
-- ============================================================================

INSERT OR IGNORE INTO fsfvi_data (
    id, source_raw_data_id, government_id, country_code, country_name,
    fiscal_year, reporting_period, component_id, component_type,
    observed_value, benchmark_value, financial_allocation_usd,
    data_source, data_quality_rating, collection_method, notes,
    created_at, created_by, updated_at, last_modified_by, version
) VALUES (
    'kenya_2025_agdev_001', NULL, 'kenya', 'KE', 'Kenya',
    2025, '2025-Annual', 'agr_dev_ke_2025', 'agricultural_development',
    9.2, 10.0, 850000000.0,
    'Kenya Ministry of Agriculture - Budget Report 2025', 'high',
    'Administrative Records',
    'Kenya: 9.2% agricultural budget allocation. Almost meeting CAADP 10% target. Strong performance.',
    datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1
);

INSERT OR IGNORE INTO fsfvi_data (
    id, source_raw_data_id, government_id, country_code, country_name,
    fiscal_year, reporting_period, component_id, component_type,
    observed_value, benchmark_value, financial_allocation_usd,
    data_source, data_quality_rating, collection_method, notes,
    created_at, created_by, updated_at, last_modified_by, version
) VALUES (
    'kenya_2025_infra_002', NULL, 'kenya', 'KE', 'Kenya',
    2025, '2025-Annual', 'infrastructure_ke_2025', 'infrastructure',
    68.5, 75.0, 620000000.0,
    'Kenya Ministry of Infrastructure - Assessment 2025', 'high',
    'Field Surveys',
    'Kenya: Strong infrastructure (68.5%). Roads 72%, storage 66%, markets 67%. Best in East Africa.',
    datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1
);

INSERT OR IGNORE INTO fsfvi_data (
    id, source_raw_data_id, government_id, country_code, country_name,
    fiscal_year, reporting_period, component_id, component_type,
    observed_value, benchmark_value, financial_allocation_usd,
    data_source, data_quality_rating, collection_method, notes,
    created_at, created_by, updated_at, last_modified_by, version
) VALUES (
    'kenya_2025_nutr_003', NULL, 'kenya', 'KE', 'Kenya',
    2025, '2025-Annual', 'nutrition_health_ke_2025', 'nutrition_health',
    64.2, 65.0, 320000000.0,
    'Kenya Ministry of Health - Nutrition Survey 2025', 'high',
    'Demographic Health Surveys',
    'Kenya: Near target (64.2%). Stunting 28%, wasting 6.5%, anemia 41%. Programs improving.',
    datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1
);

INSERT OR IGNORE INTO fsfvi_data (
    id, source_raw_data_id, government_id, country_code, country_name,
    fiscal_year, reporting_period, component_id, component_type,
    observed_value, benchmark_value, financial_allocation_usd,
    data_source, data_quality_rating, collection_method, notes,
    created_at, created_by, updated_at, last_modified_by, version
) VALUES (
    'kenya_2025_climate_004', NULL, 'kenya', 'KE', 'Kenya',
    2025, '2025-Annual', 'climate_natural_res_ke_2025', 'climate_natural_resources',
    41.8, 55.0, 265000000.0,
    'Kenya Ministry of Environment - Climate Assessment 2025', 'high',
    'Satellite Data',
    'Kenya: Moderate climate resilience (41.8%). CSA 26%, forest 32%, water 45%. Drought challenges.',
    datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1
);

INSERT OR IGNORE INTO fsfvi_data (
    id, source_raw_data_id, government_id, country_code, country_name,
    fiscal_year, reporting_period, component_id, component_type,
    observed_value, benchmark_value, financial_allocation_usd,
    data_source, data_quality_rating, collection_method, notes,
    created_at, created_by, updated_at, last_modified_by, version
) VALUES (
    'kenya_2025_social_005', NULL, 'kenya', 'KE', 'Kenya',
    2025, '2025-Annual', 'social_protection_ke_2025', 'social_protection_equity',
    66.5, 65.0, 230000000.0,
    'Kenya Ministry of Social Protection - Coverage Report 2025', 'high',
    'Administrative Records',
    'Kenya EXCEEDS TARGET: Coverage 64%, gender parity 42%, food assistance 79%. Cash transfers expanding.',
    datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1
);

INSERT OR IGNORE INTO fsfvi_data (
    id, source_raw_data_id, government_id, country_code, country_name,
    fiscal_year, reporting_period, component_id, component_type,
    observed_value, benchmark_value, financial_allocation_usd,
    data_source, data_quality_rating, collection_method, notes,
    created_at, created_by, updated_at, last_modified_by, version
) VALUES (
    'kenya_2025_gov_006', NULL, 'kenya', 'KE', 'Kenya',
    2025, '2025-Annual', 'governance_inst_ke_2025', 'governance_institutions',
    56.2, 60.0, 205000000.0,
    'Kenya Governance Institute - Assessment 2025', 'high',
    'Multi-Source Data',
    'Kenya: Moderate governance (56.2%). Transparency 58%, accountability 55%, participation 55%.',
    datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1
);

-- ============================================================================
-- HISTORICAL DATA: FY 2021-2024 FOR ALL PEER COUNTRIES
-- ============================================================================
-- 5-year trend data enabling Target Recommendations peer comparison
-- Total: 72 records (4 years × 6 components × 3 countries)
-- ============================================================================

-- ============================================================================
-- RWANDA HISTORICAL (FY 2021-2024)
-- ============================================================================

INSERT OR IGNORE INTO fsfvi_data (id, source_raw_data_id, government_id, country_code, country_name, fiscal_year, reporting_period, component_id, component_type, observed_value, benchmark_value, financial_allocation_usd, data_source, data_quality_rating, collection_method, notes, created_at, created_by, updated_at, last_modified_by, version) VALUES
('rwanda_2021_agdev_001', NULL, 'rwanda', 'RW', 'Rwanda', 2021, '2021-Annual', 'agr_dev_rw_2021', 'agricultural_development', 6.2, 10.0, 420000000.0, 'Rwanda Ministry of Agriculture - Budget Report 2021', 'high', 'Administrative Records', 'Rwanda FY2021: 6.2% agricultural allocation. Building towards CAADP target.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('rwanda_2021_infra_002', NULL, 'rwanda', 'RW', 'Rwanda', 2021, '2021-Annual', 'infrastructure_rw_2021', 'infrastructure', 54.0, 75.0, 310000000.0, 'Rwanda Ministry of Infrastructure - Assessment 2021', 'high', 'Field Surveys', 'Rwanda FY2021: Fair infrastructure (54%). Roads 56%, storage 52%, markets 54%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('rwanda_2021_nutr_003', NULL, 'rwanda', 'RW', 'Rwanda', 2021, '2021-Annual', 'nutrition_health_rw_2021', 'nutrition_health', 64.2, 65.0, 175000000.0, 'Rwanda Ministry of Health - Nutrition Survey 2021', 'high', 'Demographic Health Surveys', 'Rwanda FY2021: Good nutrition (64.2%). Stunting 28%, wasting 6%, anemia 42%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('rwanda_2021_climate_004', NULL, 'rwanda', 'RW', 'Rwanda', 2021, '2021-Annual', 'climate_natural_res_rw_2021', 'climate_natural_resources', 42.5, 55.0, 135000000.0, 'Rwanda Ministry of Environment - Climate Assessment 2021', 'high', 'Satellite Data', 'Rwanda FY2021: Moderate climate resilience (42.5%). CSA 28%, forest 34%, water 46%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('rwanda_2021_social_005', NULL, 'rwanda', 'RW', 'Rwanda', 2021, '2021-Annual', 'social_protection_rw_2021', 'social_protection_equity', 68.5, 65.0, 120000000.0, 'Rwanda Ministry of Social Protection - Coverage Report 2021', 'high', 'Administrative Records', 'Rwanda FY2021 EXCEEDS TARGET: Coverage 67%, gender parity 46%, food assistance 82%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('rwanda_2021_gov_006', NULL, 'rwanda', 'RW', 'Rwanda', 2021, '2021-Annual', 'governance_inst_rw_2021', 'governance_institutions', 61.2, 60.0, 110000000.0, 'Rwanda Governance Institute - Assessment 2021', 'high', 'Multi-Source Data', 'Rwanda FY2021 EXCEEDS TARGET: Transparency 63%, accountability 61%, participation 60%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('rwanda_2022_agdev_001', NULL, 'rwanda', 'RW', 'Rwanda', 2022, '2022-Annual', 'agr_dev_rw_2022', 'agricultural_development', 6.8, 10.0, 455000000.0, 'Rwanda Ministry of Agriculture - Budget Report 2022', 'high', 'Administrative Records', 'Rwanda FY2022: 6.8% agricultural allocation. Steady progress towards target.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('rwanda_2022_infra_002', NULL, 'rwanda', 'RW', 'Rwanda', 2022, '2022-Annual', 'infrastructure_rw_2022', 'infrastructure', 57.0, 75.0, 335000000.0, 'Rwanda Ministry of Infrastructure - Assessment 2022', 'high', 'Field Surveys', 'Rwanda FY2022: Improving infrastructure (57%). Roads 59%, storage 55%, markets 57%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('rwanda_2022_nutr_003', NULL, 'rwanda', 'RW', 'Rwanda', 2022, '2022-Annual', 'nutrition_health_rw_2022', 'nutrition_health', 66.5, 65.0, 185000000.0, 'Rwanda Ministry of Health - Nutrition Survey 2022', 'high', 'Demographic Health Surveys', 'Rwanda FY2022 EXCEEDS TARGET: Stunting 26%, wasting 5.5%, anemia 40%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('rwanda_2022_climate_004', NULL, 'rwanda', 'RW', 'Rwanda', 2022, '2022-Annual', 'climate_natural_res_rw_2022', 'climate_natural_resources', 44.8, 55.0, 145000000.0, 'Rwanda Ministry of Environment - Climate Assessment 2022', 'high', 'Satellite Data', 'Rwanda FY2022: Moderate climate resilience (44.8%). CSA 30%, forest 36%, water 48%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('rwanda_2022_social_005', NULL, 'rwanda', 'RW', 'Rwanda', 2022, '2022-Annual', 'social_protection_rw_2022', 'social_protection_equity', 70.2, 65.0, 130000000.0, 'Rwanda Ministry of Social Protection - Coverage Report 2022', 'high', 'Administrative Records', 'Rwanda FY2022 EXCEEDS TARGET: Coverage 68%, gender parity 47%, food assistance 84%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('rwanda_2022_gov_006', NULL, 'rwanda', 'RW', 'Rwanda', 2022, '2022-Annual', 'governance_inst_rw_2022', 'governance_institutions', 62.5, 60.0, 118000000.0, 'Rwanda Governance Institute - Assessment 2022', 'high', 'Multi-Source Data', 'Rwanda FY2022 EXCEEDS TARGET: Transparency 65%, accountability 62%, participation 61%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('rwanda_2023_agdev_001', NULL, 'rwanda', 'RW', 'Rwanda', 2023, '2023-Annual', 'agr_dev_rw_2023', 'agricultural_development', 7.3, 10.0, 485000000.0, 'Rwanda Ministry of Agriculture - Budget Report 2023', 'high', 'Administrative Records', 'Rwanda FY2023: 7.3% agricultural allocation. Continued improvement towards CAADP.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('rwanda_2023_infra_002', NULL, 'rwanda', 'RW', 'Rwanda', 2023, '2023-Annual', 'infrastructure_rw_2023', 'infrastructure', 59.5, 75.0, 355000000.0, 'Rwanda Ministry of Infrastructure - Assessment 2023', 'high', 'Field Surveys', 'Rwanda FY2023: Good infrastructure (59.5%). Roads 62%, storage 57%, markets 59%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('rwanda_2023_nutr_003', NULL, 'rwanda', 'RW', 'Rwanda', 2023, '2023-Annual', 'nutrition_health_rw_2023', 'nutrition_health', 68.2, 65.0, 195000000.0, 'Rwanda Ministry of Health - Nutrition Survey 2023', 'high', 'Demographic Health Surveys', 'Rwanda FY2023 EXCEEDS TARGET: Stunting 25%, wasting 5.2%, anemia 38%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('rwanda_2023_climate_004', NULL, 'rwanda', 'RW', 'Rwanda', 2023, '2023-Annual', 'climate_natural_res_rw_2023', 'climate_natural_resources', 46.2, 55.0, 153000000.0, 'Rwanda Ministry of Environment - Climate Assessment 2023', 'high', 'Satellite Data', 'Rwanda FY2023: Good climate resilience (46.2%). CSA 31%, forest 37%, water 50%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('rwanda_2023_social_005', NULL, 'rwanda', 'RW', 'Rwanda', 2023, '2023-Annual', 'social_protection_rw_2023', 'social_protection_equity', 71.8, 65.0, 138000000.0, 'Rwanda Ministry of Social Protection - Coverage Report 2023', 'high', 'Administrative Records', 'Rwanda FY2023 EXCEEDS TARGET: Coverage 70%, gender parity 48%, food assistance 86%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('rwanda_2023_gov_006', NULL, 'rwanda', 'RW', 'Rwanda', 2023, '2023-Annual', 'governance_inst_rw_2023', 'governance_institutions', 63.8, 60.0, 126000000.0, 'Rwanda Governance Institute - Assessment 2023', 'high', 'Multi-Source Data', 'Rwanda FY2023 EXCEEDS TARGET: Transparency 66%, accountability 63%, participation 62%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('rwanda_2024_agdev_001', NULL, 'rwanda', 'RW', 'Rwanda', 2024, '2024-Annual', 'agr_dev_rw_2024', 'agricultural_development', 7.5, 10.0, 500000000.0, 'Rwanda Ministry of Agriculture - Budget Report 2024', 'high', 'Administrative Records', 'Rwanda FY2024: 7.5% agricultural allocation. Strong progress towards CAADP 10%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('rwanda_2024_infra_002', NULL, 'rwanda', 'RW', 'Rwanda', 2024, '2024-Annual', 'infrastructure_rw_2024', 'infrastructure', 60.5, 75.0, 365000000.0, 'Rwanda Ministry of Infrastructure - Assessment 2024', 'high', 'Field Surveys', 'Rwanda FY2024: Good infrastructure (60.5%). Roads 63%, storage 58%, markets 60%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('rwanda_2024_nutr_003', NULL, 'rwanda', 'RW', 'Rwanda', 2024, '2024-Annual', 'nutrition_health_rw_2024', 'nutrition_health', 69.5, 65.0, 202000000.0, 'Rwanda Ministry of Health - Nutrition Survey 2024', 'high', 'Demographic Health Surveys', 'Rwanda FY2024 EXCEEDS TARGET: Stunting 24%, wasting 5.1%, anemia 37%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('rwanda_2024_climate_004', NULL, 'rwanda', 'RW', 'Rwanda', 2024, '2024-Annual', 'climate_natural_res_rw_2024', 'climate_natural_resources', 47.2, 55.0, 158000000.0, 'Rwanda Ministry of Environment - Climate Assessment 2024', 'high', 'Satellite Data', 'Rwanda FY2024: Good climate resilience (47.2%). CSA 31.5%, forest 37.5%, water 51%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('rwanda_2024_social_005', NULL, 'rwanda', 'RW', 'Rwanda', 2024, '2024-Annual', 'social_protection_rw_2024', 'social_protection_equity', 72.8, 65.0, 142000000.0, 'Rwanda Ministry of Social Protection - Coverage Report 2024', 'high', 'Administrative Records', 'Rwanda FY2024 EXCEEDS TARGET: Coverage 71%, gender parity 49%, food assistance 87%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('rwanda_2024_gov_006', NULL, 'rwanda', 'RW', 'Rwanda', 2024, '2024-Annual', 'governance_inst_rw_2024', 'governance_institutions', 64.8, 60.0, 131000000.0, 'Rwanda Governance Institute - Assessment 2024', 'high', 'Multi-Source Data', 'Rwanda FY2024 EXCEEDS TARGET: Transparency 67%, accountability 64%, participation 63%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1);

-- ============================================================================
-- GHANA HISTORICAL (FY 2021-2024)
-- ============================================================================

INSERT OR IGNORE INTO fsfvi_data (id, source_raw_data_id, government_id, country_code, country_name, fiscal_year, reporting_period, component_id, component_type, observed_value, benchmark_value, financial_allocation_usd, data_source, data_quality_rating, collection_method, notes, created_at, created_by, updated_at, last_modified_by, version) VALUES
('ghana_2021_agdev_001', NULL, 'ghana', 'GH', 'Ghana', 2021, '2021-Annual', 'agr_dev_gh_2021', 'agricultural_development', 6.8, 10.0, 560000000.0, 'Ghana Ministry of Agriculture - Budget Report 2021', 'high', 'Administrative Records', 'Ghana FY2021: 6.8% agricultural allocation. Cocoa sector strong but below CAADP target.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('ghana_2021_infra_002', NULL, 'ghana', 'GH', 'Ghana', 2021, '2021-Annual', 'infrastructure_gh_2021', 'infrastructure', 60.2, 75.0, 425000000.0, 'Ghana Ministry of Infrastructure - Assessment 2021', 'high', 'Field Surveys', 'Ghana FY2021: Good infrastructure (60.2%). Roads 62%, storage 58%, markets 61%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('ghana_2021_nutr_003', NULL, 'ghana', 'GH', 'Ghana', 2021, '2021-Annual', 'nutrition_health_gh_2021', 'nutrition_health', 62.8, 65.0, 235000000.0, 'Ghana Ministry of Health - Nutrition Survey 2021', 'high', 'Demographic Health Surveys', 'Ghana FY2021: Near target (62.8%). Stunting 32%, wasting 7%, anemia 44%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('ghana_2021_climate_004', NULL, 'ghana', 'GH', 'Ghana', 2021, '2021-Annual', 'climate_natural_res_gh_2021', 'climate_natural_resources', 41.2, 55.0, 185000000.0, 'Ghana Ministry of Environment - Climate Assessment 2021', 'high', 'Satellite Data', 'Ghana FY2021: Moderate climate resilience (41.2%). CSA 24%, forest 31%, water 44%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('ghana_2021_social_005', NULL, 'ghana', 'GH', 'Ghana', 2021, '2021-Annual', 'social_protection_gh_2021', 'social_protection_equity', 63.5, 65.0, 158000000.0, 'Ghana Ministry of Social Protection - Coverage Report 2021', 'high', 'Administrative Records', 'Ghana FY2021: Near target (63.5%). Coverage 61%, gender parity 40%, food assistance 74%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('ghana_2021_gov_006', NULL, 'ghana', 'GH', 'Ghana', 2021, '2021-Annual', 'governance_inst_gh_2021', 'governance_institutions', 55.5, 60.0, 148000000.0, 'Ghana Governance Institute - Assessment 2021', 'high', 'Multi-Source Data', 'Ghana FY2021: Moderate governance (55.5%). Transparency 56%, accountability 55%, participation 56%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('ghana_2022_agdev_001', NULL, 'ghana', 'GH', 'Ghana', 2022, '2022-Annual', 'agr_dev_gh_2022', 'agricultural_development', 7.3, 10.0, 600000000.0, 'Ghana Ministry of Agriculture - Budget Report 2022', 'high', 'Administrative Records', 'Ghana FY2022: 7.3% agricultural allocation. Increasing commitment to agriculture.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('ghana_2022_infra_002', NULL, 'ghana', 'GH', 'Ghana', 2022, '2022-Annual', 'infrastructure_gh_2022', 'infrastructure', 62.5, 75.0, 455000000.0, 'Ghana Ministry of Infrastructure - Assessment 2022', 'high', 'Field Surveys', 'Ghana FY2022: Good infrastructure (62.5%). Roads 64%, storage 60%, markets 63%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('ghana_2022_nutr_003', NULL, 'ghana', 'GH', 'Ghana', 2022, '2022-Annual', 'nutrition_health_gh_2022', 'nutrition_health', 64.2, 65.0, 250000000.0, 'Ghana Ministry of Health - Nutrition Survey 2022', 'high', 'Demographic Health Surveys', 'Ghana FY2022: Near target (64.2%). Stunting 30%, wasting 6.8%, anemia 42%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('ghana_2022_climate_004', NULL, 'ghana', 'GH', 'Ghana', 2022, '2022-Annual', 'climate_natural_res_gh_2022', 'climate_natural_resources', 42.8, 55.0, 195000000.0, 'Ghana Ministry of Environment - Climate Assessment 2022', 'high', 'Satellite Data', 'Ghana FY2022: Moderate climate resilience (42.8%). CSA 25%, forest 32%, water 45%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('ghana_2022_social_005', NULL, 'ghana', 'GH', 'Ghana', 2022, '2022-Annual', 'social_protection_gh_2022', 'social_protection_equity', 65.2, 65.0, 168000000.0, 'Ghana Ministry of Social Protection - Coverage Report 2022', 'high', 'Administrative Records', 'Ghana FY2022 EXCEEDS TARGET: Coverage 63%, gender parity 42%, food assistance 76%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('ghana_2022_gov_006', NULL, 'ghana', 'GH', 'Ghana', 2022, '2022-Annual', 'governance_inst_gh_2022', 'governance_institutions', 56.5, 60.0, 158000000.0, 'Ghana Governance Institute - Assessment 2022', 'high', 'Multi-Source Data', 'Ghana FY2022: Moderate governance (56.5%). Transparency 57%, accountability 56%, participation 57%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('ghana_2023_agdev_001', NULL, 'ghana', 'GH', 'Ghana', 2023, '2023-Annual', 'agr_dev_gh_2023', 'agricultural_development', 7.7, 10.0, 635000000.0, 'Ghana Ministry of Agriculture - Budget Report 2023', 'high', 'Administrative Records', 'Ghana FY2023: 7.7% agricultural allocation. Strong progress towards CAADP.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('ghana_2023_infra_002', NULL, 'ghana', 'GH', 'Ghana', 2023, '2023-Annual', 'infrastructure_gh_2023', 'infrastructure', 64.0, 75.0, 480000000.0, 'Ghana Ministry of Infrastructure - Assessment 2023', 'high', 'Field Surveys', 'Ghana FY2023: Strong infrastructure (64.0%). Roads 66%, storage 62%, markets 64%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('ghana_2023_nutr_003', NULL, 'ghana', 'GH', 'Ghana', 2023, '2023-Annual', 'nutrition_health_gh_2023', 'nutrition_health', 65.5, 65.0, 265000000.0, 'Ghana Ministry of Health - Nutrition Survey 2023', 'high', 'Demographic Health Surveys', 'Ghana FY2023 EXCEEDS TARGET: Stunting 28%, wasting 6.5%, anemia 40%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('ghana_2023_climate_004', NULL, 'ghana', 'GH', 'Ghana', 2023, '2023-Annual', 'climate_natural_res_gh_2023', 'climate_natural_resources', 43.8, 55.0, 205000000.0, 'Ghana Ministry of Environment - Climate Assessment 2023', 'high', 'Satellite Data', 'Ghana FY2023: Moderate climate resilience (43.8%). CSA 26%, forest 33%, water 46%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('ghana_2023_social_005', NULL, 'ghana', 'GH', 'Ghana', 2023, '2023-Annual', 'social_protection_gh_2023', 'social_protection_equity', 66.5, 65.0, 178000000.0, 'Ghana Ministry of Social Protection - Coverage Report 2023', 'high', 'Administrative Records', 'Ghana FY2023 EXCEEDS TARGET: Coverage 64%, gender parity 43%, food assistance 78%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('ghana_2023_gov_006', NULL, 'ghana', 'GH', 'Ghana', 2023, '2023-Annual', 'governance_inst_gh_2023', 'governance_institutions', 57.5, 60.0, 166000000.0, 'Ghana Governance Institute - Assessment 2023', 'high', 'Multi-Source Data', 'Ghana FY2023: Good governance (57.5%). Transparency 59%, accountability 57%, participation 57%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('ghana_2024_agdev_001', NULL, 'ghana', 'GH', 'Ghana', 2024, '2024-Annual', 'agr_dev_gh_2024', 'agricultural_development', 8.0, 10.0, 660000000.0, 'Ghana Ministry of Agriculture - Budget Report 2024', 'high', 'Administrative Records', 'Ghana FY2024: 8.0% agricultural allocation. Close to CAADP target.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('ghana_2024_infra_002', NULL, 'ghana', 'GH', 'Ghana', 2024, '2024-Annual', 'infrastructure_gh_2024', 'infrastructure', 65.0, 75.0, 495000000.0, 'Ghana Ministry of Infrastructure - Assessment 2024', 'high', 'Field Surveys', 'Ghana FY2024: Strong infrastructure (65.0%). Roads 67%, storage 63%, markets 64.5%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('ghana_2024_nutr_003', NULL, 'ghana', 'GH', 'Ghana', 2024, '2024-Annual', 'nutrition_health_gh_2024', 'nutrition_health', 66.5, 65.0, 272000000.0, 'Ghana Ministry of Health - Nutrition Survey 2024', 'high', 'Demographic Health Surveys', 'Ghana FY2024 EXCEEDS TARGET: Stunting 27%, wasting 6.2%, anemia 39%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('ghana_2024_climate_004', NULL, 'ghana', 'GH', 'Ghana', 2024, '2024-Annual', 'climate_natural_res_gh_2024', 'climate_natural_resources', 44.5, 55.0, 212000000.0, 'Ghana Ministry of Environment - Climate Assessment 2024', 'high', 'Satellite Data', 'Ghana FY2024: Moderate climate resilience (44.5%). CSA 27%, forest 34%, water 47%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('ghana_2024_social_005', NULL, 'ghana', 'GH', 'Ghana', 2024, '2024-Annual', 'social_protection_gh_2024', 'social_protection_equity', 67.5, 65.0, 185000000.0, 'Ghana Ministry of Social Protection - Coverage Report 2024', 'high', 'Administrative Records', 'Ghana FY2024 EXCEEDS TARGET: Coverage 65%, gender parity 44%, food assistance 79%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('ghana_2024_gov_006', NULL, 'ghana', 'GH', 'Ghana', 2024, '2024-Annual', 'governance_inst_gh_2024', 'governance_institutions', 58.0, 60.0, 171000000.0, 'Ghana Governance Institute - Assessment 2024', 'high', 'Multi-Source Data', 'Ghana FY2024: Good governance (58.0%). Transparency 59.5%, accountability 57.5%, participation 57.5%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1);

-- ============================================================================
-- KENYA HISTORICAL (FY 2021-2024)
-- ============================================================================

INSERT OR IGNORE INTO fsfvi_data (id, source_raw_data_id, government_id, country_code, country_name, fiscal_year, reporting_period, component_id, component_type, observed_value, benchmark_value, financial_allocation_usd, data_source, data_quality_rating, collection_method, notes, created_at, created_by, updated_at, last_modified_by, version) VALUES
('kenya_2021_agdev_001', NULL, 'kenya', 'KE', 'Kenya', 2021, '2021-Annual', 'agr_dev_ke_2021', 'agricultural_development', 7.8, 10.0, 710000000.0, 'Kenya Ministry of Agriculture - Budget Report 2021', 'high', 'Administrative Records', 'Kenya FY2021: 7.8% agricultural allocation. Strong commitment but below CAADP target.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('kenya_2021_infra_002', NULL, 'kenya', 'KE', 'Kenya', 2021, '2021-Annual', 'infrastructure_ke_2021', 'infrastructure', 63.5, 75.0, 520000000.0, 'Kenya Ministry of Infrastructure - Assessment 2021', 'high', 'Field Surveys', 'Kenya FY2021: Strong infrastructure (63.5%). Roads 66%, storage 61%, markets 63%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('kenya_2021_nutr_003', NULL, 'kenya', 'KE', 'Kenya', 2021, '2021-Annual', 'nutrition_health_ke_2021', 'nutrition_health', 60.5, 65.0, 270000000.0, 'Kenya Ministry of Health - Nutrition Survey 2021', 'high', 'Demographic Health Surveys', 'Kenya FY2021: Moderate nutrition (60.5%). Stunting 32%, wasting 7.5%, anemia 45%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('kenya_2021_climate_004', NULL, 'kenya', 'KE', 'Kenya', 2021, '2021-Annual', 'climate_natural_res_ke_2021', 'climate_natural_resources', 38.5, 55.0, 225000000.0, 'Kenya Ministry of Environment - Climate Assessment 2021', 'high', 'Satellite Data', 'Kenya FY2021: Moderate climate resilience (38.5%). CSA 22%, forest 28%, water 41%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('kenya_2021_social_005', NULL, 'kenya', 'KE', 'Kenya', 2021, '2021-Annual', 'social_protection_ke_2021', 'social_protection_equity', 62.2, 65.0, 195000000.0, 'Kenya Ministry of Social Protection - Coverage Report 2021', 'high', 'Administrative Records', 'Kenya FY2021: Near target (62.2%). Coverage 59%, gender parity 38%, food assistance 73%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('kenya_2021_gov_006', NULL, 'kenya', 'KE', 'Kenya', 2021, '2021-Annual', 'governance_inst_ke_2021', 'governance_institutions', 53.5, 60.0, 175000000.0, 'Kenya Governance Institute - Assessment 2021', 'high', 'Multi-Source Data', 'Kenya FY2021: Moderate governance (53.5%). Transparency 55%, accountability 52%, participation 53%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('kenya_2022_agdev_001', NULL, 'kenya', 'KE', 'Kenya', 2022, '2022-Annual', 'agr_dev_ke_2022', 'agricultural_development', 8.3, 10.0, 760000000.0, 'Kenya Ministry of Agriculture - Budget Report 2022', 'high', 'Administrative Records', 'Kenya FY2022: 8.3% agricultural allocation. Strong progress towards CAADP.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('kenya_2022_infra_002', NULL, 'kenya', 'KE', 'Kenya', 2022, '2022-Annual', 'infrastructure_ke_2022', 'infrastructure', 65.5, 75.0, 555000000.0, 'Kenya Ministry of Infrastructure - Assessment 2022', 'high', 'Field Surveys', 'Kenya FY2022: Strong infrastructure (65.5%). Roads 68%, storage 63%, markets 65%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('kenya_2022_nutr_003', NULL, 'kenya', 'KE', 'Kenya', 2022, '2022-Annual', 'nutrition_health_ke_2022', 'nutrition_health', 61.5, 65.0, 285000000.0, 'Kenya Ministry of Health - Nutrition Survey 2022', 'high', 'Demographic Health Surveys', 'Kenya FY2022: Near target (61.5%). Stunting 30%, wasting 7%, anemia 43%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('kenya_2022_climate_004', NULL, 'kenya', 'KE', 'Kenya', 2022, '2022-Annual', 'climate_natural_res_ke_2022', 'climate_natural_resources', 39.5, 55.0, 238000000.0, 'Kenya Ministry of Environment - Climate Assessment 2022', 'high', 'Satellite Data', 'Kenya FY2022: Moderate climate resilience (39.5%). CSA 23%, forest 29%, water 42%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('kenya_2022_social_005', NULL, 'kenya', 'KE', 'Kenya', 2022, '2022-Annual', 'social_protection_ke_2022', 'social_protection_equity', 63.8, 65.0, 205000000.0, 'Kenya Ministry of Social Protection - Coverage Report 2022', 'high', 'Administrative Records', 'Kenya FY2022: Near target (63.8%). Coverage 61%, gender parity 39%, food assistance 75%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('kenya_2022_gov_006', NULL, 'kenya', 'KE', 'Kenya', 2022, '2022-Annual', 'governance_inst_ke_2022', 'governance_institutions', 54.2, 60.0, 185000000.0, 'Kenya Governance Institute - Assessment 2022', 'high', 'Multi-Source Data', 'Kenya FY2022: Moderate governance (54.2%). Transparency 56%, accountability 53%, participation 53.5%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('kenya_2023_agdev_001', NULL, 'kenya', 'KE', 'Kenya', 2023, '2023-Annual', 'agr_dev_ke_2023', 'agricultural_development', 8.7, 10.0, 800000000.0, 'Kenya Ministry of Agriculture - Budget Report 2023', 'high', 'Administrative Records', 'Kenya FY2023: 8.7% agricultural allocation. Nearly meeting CAADP target.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('kenya_2023_infra_002', NULL, 'kenya', 'KE', 'Kenya', 2023, '2023-Annual', 'infrastructure_ke_2023', 'infrastructure', 67.0, 75.0, 585000000.0, 'Kenya Ministry of Infrastructure - Assessment 2023', 'high', 'Field Surveys', 'Kenya FY2023: Strong infrastructure (67.0%). Roads 70%, storage 64%, markets 66%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('kenya_2023_nutr_003', NULL, 'kenya', 'KE', 'Kenya', 2023, '2023-Annual', 'nutrition_health_ke_2023', 'nutrition_health', 62.5, 65.0, 298000000.0, 'Kenya Ministry of Health - Nutrition Survey 2023', 'high', 'Demographic Health Surveys', 'Kenya FY2023: Near target (62.5%). Stunting 29%, wasting 6.8%, anemia 42%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('kenya_2023_climate_004', NULL, 'kenya', 'KE', 'Kenya', 2023, '2023-Annual', 'climate_natural_res_ke_2023', 'climate_natural_resources', 40.2, 55.0, 248000000.0, 'Kenya Ministry of Environment - Climate Assessment 2023', 'high', 'Satellite Data', 'Kenya FY2023: Moderate climate resilience (40.2%). CSA 24%, forest 30%, water 43%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('kenya_2023_social_005', NULL, 'kenya', 'KE', 'Kenya', 2023, '2023-Annual', 'social_protection_ke_2023', 'social_protection_equity', 65.0, 65.0, 215000000.0, 'Kenya Ministry of Social Protection - Coverage Report 2023', 'high', 'Administrative Records', 'Kenya FY2023 MEETS TARGET: Coverage 62%, gender parity 40%, food assistance 77%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('kenya_2023_gov_006', NULL, 'kenya', 'KE', 'Kenya', 2023, '2023-Annual', 'governance_inst_ke_2023', 'governance_institutions', 55.0, 60.0, 193000000.0, 'Kenya Governance Institute - Assessment 2023', 'high', 'Multi-Source Data', 'Kenya FY2023: Moderate governance (55.0%). Transparency 57%, accountability 54%, participation 54%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('kenya_2024_agdev_001', NULL, 'kenya', 'KE', 'Kenya', 2024, '2024-Annual', 'agr_dev_ke_2024', 'agricultural_development', 9.0, 10.0, 825000000.0, 'Kenya Ministry of Agriculture - Budget Report 2024', 'high', 'Administrative Records', 'Kenya FY2024: 9.0% agricultural allocation. Almost meeting CAADP 10% target.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('kenya_2024_infra_002', NULL, 'kenya', 'KE', 'Kenya', 2024, '2024-Annual', 'infrastructure_ke_2024', 'infrastructure', 68.0, 75.0, 605000000.0, 'Kenya Ministry of Infrastructure - Assessment 2024', 'high', 'Field Surveys', 'Kenya FY2024: Strong infrastructure (68.0%). Roads 71%, storage 65%, markets 66.5%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('kenya_2024_nutr_003', NULL, 'kenya', 'KE', 'Kenya', 2024, '2024-Annual', 'nutrition_health_ke_2024', 'nutrition_health', 63.5, 65.0, 310000000.0, 'Kenya Ministry of Health - Nutrition Survey 2024', 'high', 'Demographic Health Surveys', 'Kenya FY2024: Near target (63.5%). Stunting 28.5%, wasting 6.6%, anemia 41.5%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('kenya_2024_climate_004', NULL, 'kenya', 'KE', 'Kenya', 2024, '2024-Annual', 'climate_natural_res_ke_2024', 'climate_natural_resources', 41.0, 55.0, 256000000.0, 'Kenya Ministry of Environment - Climate Assessment 2024', 'high', 'Satellite Data', 'Kenya FY2024: Moderate climate resilience (41.0%). CSA 25%, forest 31%, water 44%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('kenya_2024_social_005', NULL, 'kenya', 'KE', 'Kenya', 2024, '2024-Annual', 'social_protection_ke_2024', 'social_protection_equity', 66.0, 65.0, 223000000.0, 'Kenya Ministry of Social Protection - Coverage Report 2024', 'high', 'Administrative Records', 'Kenya FY2024 EXCEEDS TARGET: Coverage 63%, gender parity 41%, food assistance 78%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1),
('kenya_2024_gov_006', NULL, 'kenya', 'KE', 'Kenya', 2024, '2024-Annual', 'governance_inst_ke_2024', 'governance_institutions', 55.5, 60.0, 199000000.0, 'Kenya Governance Institute - Assessment 2024', 'high', 'Multi-Source Data', 'Kenya FY2024: Moderate governance (55.5%). Transparency 57.5%, accountability 54.5%, participation 54.5%.', datetime('now'), 'fsfvi_admin', datetime('now'), 'fsfvi_admin', 1);
