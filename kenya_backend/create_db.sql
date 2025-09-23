-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'kenya_government',
    is_temporary_password BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_login TEXT,
    login_attempts INTEGER NOT NULL DEFAULT 0,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    lockout_expiry TEXT,
    password_changed_at TEXT,
    session_token TEXT,
    session_expires_at TEXT
);

-- Login attempts table for audit logging
CREATE TABLE IF NOT EXISTS login_attempts (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT,
    username TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    failure_reason TEXT,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Security events table for comprehensive audit logging
CREATE TABLE IF NOT EXISTS security_events (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT,
    event_type TEXT NOT NULL,
    description TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    timestamp TEXT NOT NULL,
    metadata TEXT, -- JSON data
    FOREIGN KEY (user_id) REFERENCES users (id)
);
