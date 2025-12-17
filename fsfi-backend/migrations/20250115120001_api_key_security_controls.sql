-- ============================================================================
-- API KEY SECURITY CONTROLS MIGRATION
-- ============================================================================
-- This migration adds critical security controls for government-level API key management:
-- 1. One-key-per-user enforcement
-- 2. Maximum active keys per government
-- 3. Mandatory rotation periods
-- ============================================================================

-- Add security control fields to governments table
ALTER TABLE governments
ADD COLUMN max_active_api_keys INTEGER NOT NULL DEFAULT 5,  -- Default: max 5 active keys per government
ADD COLUMN mandatory_rotation_days INTEGER,  -- NULL = no mandatory rotation, otherwise force rotation every N days
ADD CONSTRAINT valid_max_keys CHECK (max_active_api_keys >= 1 AND max_active_api_keys <= 50),
ADD CONSTRAINT valid_rotation_days CHECK (mandatory_rotation_days IS NULL OR (mandatory_rotation_days >= 1 AND mandatory_rotation_days <= 365));

-- Add rotation tracking to API keys
ALTER TABLE api_keys
ADD COLUMN must_rotate_by TIMESTAMPTZ,  -- Calculated deadline for mandatory rotation
ADD COLUMN rotation_reminder_sent BOOLEAN NOT NULL DEFAULT false;  -- Track if reminder was sent

-- Create index for rotation monitoring
CREATE INDEX idx_api_keys_rotation ON api_keys(must_rotate_by) WHERE status = 'active' AND must_rotate_by IS NOT NULL;

-- Create index for counting active keys per government
CREATE INDEX idx_api_keys_government_status ON api_keys(government_id, status);

-- Create index for counting active keys per user
CREATE INDEX idx_api_keys_user_status ON api_keys(created_by_user_id, status);

COMMENT ON COLUMN governments.max_active_api_keys IS 'Maximum number of active API keys allowed for this government (1-50)';
COMMENT ON COLUMN governments.mandatory_rotation_days IS 'If set, API keys must be rotated every N days (1-365). NULL = no mandatory rotation';
COMMENT ON COLUMN api_keys.must_rotate_by IS 'Deadline for mandatory key rotation. If past this date, key should be auto-revoked';
COMMENT ON COLUMN api_keys.rotation_reminder_sent IS 'Whether rotation reminder notification has been sent to user';
