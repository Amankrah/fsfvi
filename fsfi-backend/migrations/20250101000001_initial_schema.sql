-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Custom types
CREATE TYPE government_type AS ENUM ('federal', 'state', 'regional', 'local', 'agency');
CREATE TYPE access_tier AS ENUM ('basic', 'standard', 'premium', 'enterprise');
CREATE TYPE government_status AS ENUM ('pending', 'active', 'suspended', 'revoked');
CREATE TYPE user_role AS ENUM ('admin', 'developer', 'analyst', 'viewer');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'locked');
CREATE TYPE api_key_status AS ENUM ('active', 'expired', 'revoked');
CREATE TYPE audit_action AS ENUM (
    'login', 'logout', 'login_failed', 'api_key_created', 'api_key_revoked',
    'api_request', 'data_access', 'data_export', 'config_change',
    'user_created', 'user_updated', 'user_deleted', 'permission_changed',
    'rate_limit_exceeded', 'unauthorized_access'
);

-- Governments table
CREATE TABLE governments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_code VARCHAR(2) NOT NULL UNIQUE,
    country_name VARCHAR(100) NOT NULL,
    government_name VARCHAR(200) NOT NULL,
    government_type government_type NOT NULL,
    tier access_tier NOT NULL DEFAULT 'basic',
    status government_status NOT NULL DEFAULT 'pending',
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),
    primary_contact_name VARCHAR(100) NOT NULL,
    primary_contact_title VARCHAR(100) NOT NULL,
    api_quota_daily INTEGER NOT NULL DEFAULT 1000,
    api_quota_monthly INTEGER NOT NULL DEFAULT 30000,
    allowed_endpoints JSONB NOT NULL DEFAULT '[]'::jsonb,
    ip_whitelist JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    activated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    CONSTRAINT valid_quota CHECK (api_quota_daily > 0 AND api_quota_monthly > 0)
);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    government_id UUID NOT NULL REFERENCES governments(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    title VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'viewer',
    status user_status NOT NULL DEFAULT 'active',
    mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    last_login TIMESTAMPTZ,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_failed_attempts CHECK (failed_login_attempts >= 0)
);

-- API Keys table
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    government_id UUID NOT NULL REFERENCES governments(id) ON DELETE CASCADE,
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    key_prefix VARCHAR(8) NOT NULL,
    status api_key_status NOT NULL DEFAULT 'active',
    scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
    rate_limit_override INTEGER,
    last_used TIMESTAMPTZ,
    usage_count BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revoked_by_user_id UUID REFERENCES users(id),
    revocation_reason TEXT,
    CONSTRAINT valid_usage_count CHECK (usage_count >= 0)
);

-- Refresh Tokens table
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- Audit Logs table (partitioned by month for performance)
CREATE TABLE audit_logs (
    id UUID DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    government_id UUID REFERENCES governments(id),
    user_id UUID REFERENCES users(id),
    api_key_id UUID REFERENCES api_keys(id),
    action audit_action NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    request_method VARCHAR(10) NOT NULL,
    request_path VARCHAR(500) NOT NULL,
    request_body JSONB,
    response_status INTEGER NOT NULL,
    response_time_ms BIGINT NOT NULL,
    error_message TEXT,
    metadata JSONB,
    PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Create initial partition for audit logs
CREATE TABLE audit_logs_2025_12 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

-- API Usage Tracking table
CREATE TABLE api_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    government_id UUID NOT NULL REFERENCES governments(id) ON DELETE CASCADE,
    api_key_id UUID REFERENCES api_keys(id),
    date DATE NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    total_response_time_ms BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(government_id, api_key_id, date, endpoint)
);

-- Indexes for performance
CREATE INDEX idx_governments_status ON governments(status);
CREATE INDEX idx_governments_country_code ON governments(country_code);
CREATE INDEX idx_users_government_id ON users(government_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_api_keys_government_id ON api_keys(government_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_status ON api_keys(status);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX idx_audit_logs_government_id ON audit_logs(government_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_api_usage_government_id_date ON api_usage(government_id, date);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_governments_updated_at BEFORE UPDATE ON governments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_usage_updated_at BEFORE UPDATE ON api_usage
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
