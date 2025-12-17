-- Add MFA backup codes table
-- This table stores hashed backup recovery codes for MFA

CREATE TABLE IF NOT EXISTS mfa_backup_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash VARCHAR(64) NOT NULL,
    code_number INTEGER NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_code_number UNIQUE (user_id, code_number)
);

CREATE INDEX idx_mfa_backup_codes_user_id ON mfa_backup_codes(user_id);
CREATE INDEX idx_mfa_backup_codes_used_at ON mfa_backup_codes(used_at) WHERE used_at IS NULL;

COMMENT ON TABLE mfa_backup_codes IS 'One-time backup codes for MFA recovery';
COMMENT ON COLUMN mfa_backup_codes.code_hash IS 'SHA-256 hash of the backup code';
COMMENT ON COLUMN mfa_backup_codes.code_number IS 'Code number (0-9) for ordering';
COMMENT ON COLUMN mfa_backup_codes.used_at IS 'Timestamp when code was used (NULL = unused)';
