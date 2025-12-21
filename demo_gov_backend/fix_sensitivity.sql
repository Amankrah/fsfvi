-- Fix sensitivity_parameter values
-- Set all 0 values to NULL so the FSFVI algorithm can calculate them
UPDATE fsfvi_data 
SET sensitivity_parameter = NULL 
WHERE sensitivity_parameter IS NOT NULL AND sensitivity_parameter = 0.0;

UPDATE fsfvi_data 
SET weight = NULL 
WHERE weight IS NOT NULL AND weight = 0.0;

-- Verify the fix
SELECT component_type, sensitivity_parameter, weight 
FROM fsfvi_data 
WHERE government_id = 'demo_government';
