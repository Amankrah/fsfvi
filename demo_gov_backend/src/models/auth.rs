use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fmt;
use uuid::Uuid;

/// JWT Claims structure
#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,          // Subject (user ID)
    pub username: String,     // Username
    pub role: String,         // User role
    pub exp: usize,           // Expiration time
    pub iat: usize,           // Issued at
    pub iss: String,          // Issuer
    pub aud: String,          // Audience
    pub jti: String,          // JWT ID
    pub session_id: String,   // Session identifier
    pub is_temp_password: bool, // Temporary password flag
}

/// Authentication error types
#[derive(Debug)]
pub enum AuthError {
    InvalidCredentials,
    AccountLocked,
    TokenExpired,
    InvalidToken,
    PasswordTooWeak,
    PasswordMismatch,
    TooManyAttempts,
    SessionExpired,
    Unauthorized,
    InternalError(String),
}

impl fmt::Display for AuthError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AuthError::InvalidCredentials => write!(f, "Invalid username or password"),
            AuthError::AccountLocked => write!(f, "Account is temporarily locked"),
            AuthError::TokenExpired => write!(f, "Authentication token has expired"),
            AuthError::InvalidToken => write!(f, "Invalid authentication token"),
            AuthError::PasswordTooWeak => write!(f, "Password does not meet security requirements"),
            AuthError::PasswordMismatch => write!(f, "Passwords do not match"),
            AuthError::TooManyAttempts => write!(f, "Too many failed login attempts"),
            AuthError::SessionExpired => write!(f, "Session has expired"),
            AuthError::Unauthorized => write!(f, "Unauthorized access"),
            AuthError::InternalError(msg) => write!(f, "Internal error: {}", msg),
        }
    }
}

impl std::error::Error for AuthError {}

/// Authentication result wrapper
pub type AuthResult<T> = Result<T, AuthError>;

/// Token validation result
#[derive(Debug)]
pub struct TokenValidation {
    pub user_id: Uuid,
    pub username: String,
    pub role: String,
    pub session_id: String,
    pub is_temp_password: bool,
    pub expires_at: DateTime<Utc>,
}

/// Rate limiting configuration
#[derive(Debug, Clone)]
pub struct RateLimitConfig {
    pub max_attempts: u32,
    pub window_seconds: u64,
    pub lockout_duration_seconds: u64,
}

impl Default for RateLimitConfig {
    fn default() -> Self {
        RateLimitConfig {
            max_attempts: 5,
            window_seconds: 300, // 5 minutes
            lockout_duration_seconds: 300, // 5 minutes
        }
    }
}

/// Security configuration
#[derive(Debug, Clone)]
pub struct SecurityConfig {
    pub jwt_secret: String,
    pub jwt_expiration_hours: i64,
    pub password_salt_rounds: u32,
    pub rate_limit: RateLimitConfig,
    pub session_timeout_minutes: i64,
    pub require_password_change: bool,
}

impl Default for SecurityConfig {
    fn default() -> Self {
        SecurityConfig {
            jwt_secret: "your-super-secret-jwt-key-change-this-in-production".to_string(),
            jwt_expiration_hours: 8, // 8 hours
            password_salt_rounds: 12,
            rate_limit: RateLimitConfig::default(),
            session_timeout_minutes: 30,
            require_password_change: true,
        }
    }
}

/// Audit log entry
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct AuditLogEntry {
    pub id: Uuid,
    pub user_id: Option<Uuid>,
    pub event_type: String,
    pub description: String,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub timestamp: DateTime<Utc>,
    pub success: bool,
    pub details: Option<serde_json::Value>,
}

/// Login attempt tracking
#[derive(Debug)]
#[allow(dead_code)] // Used by database and future features
pub struct LoginAttempt {
    pub user_id: Option<Uuid>,
    pub username: String,
    pub ip_address: String,
    pub user_agent: Option<String>,
    pub success: bool,
    pub timestamp: DateTime<Utc>,
    pub failure_reason: Option<String>,
}

/// Password policy configuration
#[derive(Debug, Clone)]
pub struct PasswordPolicy {
    pub min_length: usize,
    pub require_uppercase: bool,
    pub require_lowercase: bool,
    pub require_numbers: bool,
    pub require_special_chars: bool,
    pub max_repeating_chars: usize,
    pub forbidden_patterns: Vec<String>,
}

impl Default for PasswordPolicy {
    fn default() -> Self {
        PasswordPolicy {
            min_length: 12,
            require_uppercase: true,
            require_lowercase: true,
            require_numbers: true,
            require_special_chars: true,
            max_repeating_chars: 3,
            forbidden_patterns: vec![
                "123".to_string(),
                "abc".to_string(),
                "password".to_string(),
                "qwerty".to_string(),
                "kenya".to_string(),
                "government".to_string(),
            ],
        }
    }
}