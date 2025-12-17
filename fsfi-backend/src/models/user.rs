use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use validator::Validate;

/// Government user with role-based access control
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct User {
    pub id: Uuid,
    pub government_id: Uuid,
    pub email: String,
    pub password_hash: String,
    pub full_name: String,
    pub title: String,
    pub role: UserRole,
    pub status: UserStatus,
    pub mfa_enabled: bool,
    pub mfa_secret: Option<String>,
    pub last_login: Option<DateTime<Utc>>,
    pub failed_login_attempts: i32,
    pub locked_until: Option<DateTime<Utc>>,
    pub api_key_expiry_days: Option<i32>,  // Default API key expiration in days (set by admin)
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq, utoipa::ToSchema)]
#[sqlx(type_name = "user_role", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum UserRole {
    /// FSFI company admin - full system control
    Admin,
    /// Government user - API access, can manage API keys
    Developer,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "user_status", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum UserStatus {
    Active,
    Inactive,
    Locked,
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateUserRequest {
    pub government_id: Uuid,
    #[validate(email)]
    pub email: String,
    #[validate(length(min = 8, max = 100))]  // ALWAYS validate - prevents empty/short passwords
    pub password: String,  // REQUIRED - admin provides this (either manually or from /users/generate-password endpoint)
    #[validate(length(min = 2, max = 100))]
    pub full_name: String,
    #[validate(length(min = 2, max = 100))]
    pub title: String,
    pub role: UserRole,
    #[validate(range(min = 1, max = 730))]  // Min 1 day, max 2 years
    pub api_key_expiry_days: Option<i32>,   // Admin sets this during user creation
}

#[derive(Debug, Deserialize, Validate)]
pub struct LoginRequest {
    #[validate(email)]
    pub email: String,
    #[validate(length(min = 1))]
    pub password: String,
    pub mfa_code: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: i64,
    pub user: UserInfo,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserInfo {
    pub id: Uuid,
    pub government_id: Uuid,
    pub email: String,
    pub full_name: String,
    pub role: UserRole,
    pub mfa_enabled: bool,  // Added to allow frontend to determine MFA status immediately after login
}

/// Response when creating a user - includes plain-text password for admin to share
#[derive(Debug, Serialize)]
pub struct CreateUserResponse {
    pub user: User,
    pub plain_password: String,  // Only returned during user creation
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateUserRequest {
    #[validate(length(min = 2, max = 100))]
    pub full_name: Option<String>,
    #[validate(length(min = 2, max = 100))]
    pub title: Option<String>,
    pub status: Option<UserStatus>,
    #[validate(range(min = 1, max = 730))]
    pub api_key_expiry_days: Option<i32>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct ResetPasswordRequest {
    #[validate(length(min = 8, max = 100))]
    pub new_password: String,  // Admin provides new password (from generate-password or manual)
}

#[derive(Debug, Serialize)]
pub struct ResetPasswordResponse {
    pub plain_password: String,  // Return the new password for admin to share
    pub message: String,
}

#[derive(Debug, Deserialize)]
pub struct RefreshTokenRequest {
    pub refresh_token: String,
}
