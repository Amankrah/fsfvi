use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use validator::Validate;

/// API Key for government access
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ApiKey {
    pub id: Uuid,
    pub government_id: Uuid,
    pub created_by_user_id: Uuid,
    pub name: String,
    pub key_hash: String,           // Hashed API key
    pub key_prefix: String,         // First 8 chars for identification
    pub status: ApiKeyStatus,
    pub scopes: Vec<String>,        // Allowed operations
    pub rate_limit_override: Option<i32>,
    pub last_used: Option<DateTime<Utc>>,
    pub usage_count: i64,
    pub created_at: DateTime<Utc>,
    pub expires_at: Option<DateTime<Utc>>,
    pub revoked_at: Option<DateTime<Utc>>,
    pub revoked_by_user_id: Option<Uuid>,
    pub revocation_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "api_key_status", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum ApiKeyStatus {
    Active,
    Expired,
    Revoked,
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateApiKeyRequest {
    #[validate(length(min = 3, max = 100))]
    pub name: String,
    // Note: scopes automatically inherited from government's allowed_endpoints (set by admin)
    // Note: expires_in_days automatically set from government's api_key_expiry_days (set by admin)
}

#[derive(Debug, Serialize)]
pub struct CreateApiKeyResponse {
    pub id: Uuid,
    pub name: String,
    pub api_key: String,  // Only returned once during creation
    pub key_prefix: String,
    pub scopes: Vec<String>,
    pub expires_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct RevokeApiKeyRequest {
    pub reason: String,
}

/// Response DTO for API key list
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiKeyListItem {
    pub id: Uuid,
    pub name: String,
    pub key_prefix: String,
    pub status: ApiKeyStatus,
    pub scopes: serde_json::Value,
    pub last_used: Option<DateTime<Utc>>,
    pub usage_count: i64,
    pub created_at: DateTime<Utc>,
    pub expires_at: Option<DateTime<Utc>>,
    pub revoked_at: Option<DateTime<Utc>>,
}

// ============================================================================
// ADMIN-ONLY REQUEST/RESPONSE TYPES
// These are for FSFI admin actions on developer-created API keys
// Admins can MANAGE but NEVER CREATE API keys
// ============================================================================

/// Admin request to revoke an API key (emergency action)
/// Only FSFI admins can use this - includes admin user ID for audit trail
#[derive(Debug, Deserialize, Validate)]
pub struct AdminRevokeApiKeyRequest {
    #[validate(length(min = 10, max = 500))]
    pub reason: String,
    pub admin_note: Option<String>, // Internal admin note (not shown to developer)
}

/// Admin response with detailed API key info including creator details
#[derive(Debug, Serialize)]
pub struct AdminApiKeyDetail {
    pub id: Uuid,
    pub government_id: Uuid,
    pub government_name: String,
    pub created_by_user_id: Uuid,
    pub created_by_email: String,
    pub created_by_name: String,
    pub name: String,
    pub key_prefix: String,
    pub status: ApiKeyStatus,
    pub scopes: Vec<String>,
    pub last_used: Option<DateTime<Utc>>,
    pub usage_count: i64,
    pub created_at: DateTime<Utc>,
    pub expires_at: Option<DateTime<Utc>>,
    pub revoked_at: Option<DateTime<Utc>>,
    pub revoked_by_user_id: Option<Uuid>,
    pub revocation_reason: Option<String>,
    pub must_rotate_by: Option<DateTime<Utc>>,
}
