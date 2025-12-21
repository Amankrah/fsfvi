-- ============================================================================
-- FIX OPTIONAL FIELDS IN FSFVI_DATA
-- ============================================================================
-- CRITICAL: weight and sensitivity_parameter should be NULL when not provided
-- The FSFVI algorithm will calculate these values automatically
-- Setting them to 0 causes validation errors
-- ============================================================================

-- Fix sensitivity_parameter: Convert 0 values to NULL
UPDATE fsfvi_data
SET sensitivity_parameter = NULL
WHERE sensitivity_parameter IS NOT NULL AND sensitivity_parameter = 0.0;

-- Fix weight: Convert 0 values to NULL
UPDATE fsfvi_data
SET weight = NULL
WHERE weight IS NOT NULL AND weight = 0.0;

-- Log the changes
SELECT
    'Updated ' || COUNT(*) || ' components with NULL sensitivity_parameter and weight' as migration_result
FROM fsfvi_data
WHERE government_id = 'demo_government';
