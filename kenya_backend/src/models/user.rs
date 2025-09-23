use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use validator::Validate;

/// User role enum - only Kenya Government allowed  
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "user_role", rename_all = "snake_case")]
pub enum UserRole {
    KenyaGovernment,
}

impl Default for UserRole {
    fn default() -> Self {
        UserRole::KenyaGovernment
    }
}

/// User model for database
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct User {
    pub id: Uuid,
    pub username: String,
    pub password_hash: String,
    pub role: UserRole,
    pub is_temporary_password: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub last_login: Option<DateTime<Utc>>,
    pub login_attempts: i32,
    pub is_locked: bool,
    pub lockout_expiry: Option<DateTime<Utc>>,
    pub password_changed_at: Option<DateTime<Utc>>,
    pub session_token: Option<String>,
    pub session_expires_at: Option<DateTime<Utc>>,
    // 2FA fields
    pub two_fa_enabled: bool,
    pub two_fa_secret: Option<String>,
    pub two_fa_backup_codes: Option<String>, // JSON array of backup codes
    pub two_fa_enabled_at: Option<DateTime<Utc>>,
}

/// User response model (without sensitive data)
#[derive(Debug, Serialize, Deserialize)]
pub struct UserResponse {
    pub id: String,
    pub username: String,
    pub role: UserRole,
    pub is_temporary_password: bool,
    pub last_login: Option<String>,
    pub login_attempts: i32,
    pub is_locked: bool,
    pub lockout_expiry: Option<String>,
    // 2FA fields (excluding sensitive data)
    pub two_fa_enabled: bool,
    pub two_fa_enabled_at: Option<String>,
}

impl From<User> for UserResponse {
    fn from(user: User) -> Self {
        UserResponse {
            id: user.id.to_string(),
            username: user.username,
            role: user.role,
            is_temporary_password: user.is_temporary_password,
            last_login: user.last_login.map(|dt| dt.to_rfc3339()),
            login_attempts: user.login_attempts,
            is_locked: user.is_locked,
            lockout_expiry: user.lockout_expiry.map(|dt| dt.to_rfc3339()),
            two_fa_enabled: user.two_fa_enabled,
            two_fa_enabled_at: user.two_fa_enabled_at.map(|dt| dt.to_rfc3339()),
        }
    }
}

/// Login request model
#[derive(Debug, Deserialize, Validate)]
pub struct LoginRequest {
    #[validate(length(min = 3, max = 50, message = "Username must be between 3 and 50 characters"))]
    pub username: String,

    #[validate(length(min = 8, message = "Password must be at least 8 characters"))]
    pub password: String,

    pub user_agent: Option<String>,
    pub ip_address: Option<String>,
    // 2FA code (optional for first step)
    pub two_fa_code: Option<String>,
}

/// Login response model
#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub token: String,
    pub user: UserResponse,
    pub expires_in: i64,
    // 2FA status
    pub requires_two_fa: bool,
    pub two_fa_temp_token: Option<String>, // Temporary token for 2FA completion
}

/// 2FA Setup Request
#[derive(Debug, Deserialize, Validate)]
pub struct TwoFASetupRequest {
    #[validate(length(min = 6, max = 6, message = "TOTP code must be 6 digits"))]
    pub totp_code: String,
}

/// 2FA Setup Response
#[derive(Debug, Serialize)]
pub struct TwoFASetupResponse {
    pub secret: String,
    pub qr_code: String, // Base64 encoded QR code image
    pub backup_codes: Vec<String>,
    pub enabled: bool,
}

/// 2FA Verification Request
#[derive(Debug, Deserialize, Validate)]
pub struct TwoFAVerifyRequest {
    pub temp_token: String,
    #[validate(length(min = 6, max = 6, message = "TOTP code must be 6 digits"))]
    pub totp_code: String,
}

/// 2FA Disable Request
#[derive(Debug, Deserialize, Validate)]
pub struct TwoFADisableRequest {
    #[validate(length(min = 8, message = "Password must be at least 8 characters"))]
    pub password: String,
    pub totp_code: Option<String>,
    pub backup_code: Option<String>,
}

/// Change password request model
#[derive(Debug, Deserialize, Validate)]
pub struct ChangePasswordRequest {
    #[validate(length(min = 8, message = "Current password must be at least 8 characters"))]
    pub current_password: String,

    #[validate(length(min = 12, message = "New password must be at least 12 characters"))]
    #[validate(custom(function = "validate_password_strength"))]
    pub new_password: String,

    pub confirm_password: String,
}

/// Password strength validation
fn validate_password_strength(password: &str) -> Result<(), validator::ValidationError> {
    let mut errors = Vec::new();

    // Check length
    if password.len() < 12 {
        errors.push("Password must be at least 12 characters long");
    }

    // Check for uppercase
    if !password.chars().any(|c| c.is_uppercase()) {
        errors.push("Password must contain at least one uppercase letter");
    }

    // Check for lowercase
    if !password.chars().any(|c| c.is_lowercase()) {
        errors.push("Password must contain at least one lowercase letter");
    }

    // Check for numbers
    if !password.chars().any(|c| c.is_numeric()) {
        errors.push("Password must contain at least one number");
    }

    // Check for special characters
    if !password.chars().any(|c| "!@#$%^&*()_+-=[]{}|;:,.<>?".contains(c)) {
        errors.push("Password must contain at least one special character");
    }

    // Check for repeating characters
    let mut chars: Vec<char> = password.chars().collect();
    chars.dedup();
    if chars.len() < password.len() * 3 / 4 {
        errors.push("Password contains too many repeating characters");
    }

    // Check for common patterns
    let lowercase = password.to_lowercase();
    if lowercase.contains("123") || lowercase.contains("abc") ||
       lowercase.contains("password") || lowercase.contains("qwerty") {
        errors.push("Password contains common patterns");
    }

    if errors.is_empty() {
        Ok(())
    } else {
        Err(validator::ValidationError::new("password_strength"))
    }
}

/// Security event for logging
#[derive(Debug, Serialize, Deserialize)]
pub struct SecurityEvent {
    pub id: Uuid,
    pub user_id: Option<Uuid>,
    pub event_type: String,
    pub description: String,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub success: bool,
    pub timestamp: DateTime<Utc>,
    pub metadata: Option<serde_json::Value>,
}

/// Session information
#[derive(Debug, Serialize, Deserialize)]
pub struct SessionInfo {
    pub user_id: Uuid,
    pub username: String,
    pub role: UserRole,
    pub is_temporary_password: bool,
    pub expires_at: DateTime<Utc>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
}