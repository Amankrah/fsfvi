-- Security Events Table
-- CRITICAL: Immutable audit log for all security-relevant events
-- This table supports government accountability and compliance

CREATE TABLE IF NOT EXISTS security_events (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT,
    event_type TEXT NOT NULL,
    description TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    success BOOLEAN NOT NULL DEFAULT 0,
    timestamp DATETIME NOT NULL,
    metadata TEXT,  -- JSON data for additional context
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indices for fast audit log queries
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_success ON security_events(success);

-- Index for finding failed login attempts (security monitoring)
CREATE INDEX IF NOT EXISTS idx_security_events_failed_logins
ON security_events(event_type, success, timestamp)
WHERE event_type = 'failed_login' AND success = 0;
