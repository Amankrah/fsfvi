use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "government_type", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum GovernmentType {
    Federal,
    State,
    Regional,
    Local,
    Agency,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "access_tier", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum AccessTier {
    Basic,      // Limited access to core algorithms
    Standard,   // Full access to core algorithms
    Premium,    // Full access + advanced analytics
    Enterprise, // Full access + custom integrations
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "government_status", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum GovernmentStatus {
    Pending,    // Awaiting approval
    Active,     // Active and authorized
    Suspended,  // Temporarily suspended
    Revoked,    // Access permanently revoked
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateGovernmentRequest {
    #[validate(length(min = 2, max = 2))]
    pub country_code: String,
    #[validate(length(min = 2, max = 100))]
    pub country_name: String,
    #[validate(length(min = 2, max = 200))]
    pub government_name: String,
    pub government_type: GovernmentType,
    pub tier: AccessTier,
    #[validate(email)]
    pub contact_email: String,
    pub contact_phone: Option<String>,
    #[validate(length(min = 2, max = 100))]
    pub primary_contact_name: String,
    #[validate(length(min = 2, max = 100))]
    pub primary_contact_title: String,
    pub api_quota_daily: i32,
    pub api_quota_monthly: i32,
    pub allowed_endpoints: Vec<String>,
    pub ip_whitelist: Option<Vec<String>>,
    // API Key Security Controls
    #[validate(range(min = 1, max = 50))]
    pub max_active_api_keys: Option<i32>,  // Default: 5 if not specified
    #[validate(range(min = 1, max = 365))]
    pub mandatory_rotation_days: Option<i32>,  // NULL = no mandatory rotation
    #[validate(range(min = 1, max = 730))]
    pub api_key_expiry_days: Option<i32>,  // Default API key expiration for all users under this government
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateGovernmentRequest {
    pub status: Option<GovernmentStatus>,
    pub tier: Option<AccessTier>,
    #[validate(email)]
    pub contact_email: Option<String>,
    pub api_quota_daily: Option<i32>,
    pub api_quota_monthly: Option<i32>,
    pub allowed_endpoints: Option<Vec<String>>,
    pub ip_whitelist: Option<Vec<String>>,
    // API Key Security Controls
    #[validate(range(min = 1, max = 50))]
    pub max_active_api_keys: Option<i32>,
    #[validate(range(min = 1, max = 365))]
    pub mandatory_rotation_days: Option<i32>,
    #[validate(range(min = 1, max = 730))]
    pub api_key_expiry_days: Option<i32>,
}

/// Response DTO for government list
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GovernmentListItem {
    pub id: Uuid,
    pub country_code: String,
    pub country_name: String,
    pub government_name: String,
    pub government_type: GovernmentType,
    pub tier: AccessTier,
    pub status: GovernmentStatus,
    pub contact_email: String,
    pub primary_contact_name: String,
    pub primary_contact_title: String,
    pub created_at: DateTime<Utc>,
    pub activated_at: Option<DateTime<Utc>>,
}

/// Response DTO for government detail
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GovernmentDetail {
    pub id: Uuid,
    pub country_code: String,
    pub country_name: String,
    pub government_name: String,
    pub government_type: GovernmentType,
    pub tier: AccessTier,
    pub status: GovernmentStatus,
    pub contact_email: String,
    pub contact_phone: Option<String>,
    pub primary_contact_name: String,
    pub primary_contact_title: String,
    pub api_quota_daily: i32,
    pub api_quota_monthly: i32,
    pub allowed_endpoints: Vec<String>,
    pub ip_whitelist: Option<Vec<String>>,
    pub created_at: DateTime<Utc>,
    pub activated_at: Option<DateTime<Utc>>,
    pub expires_at: Option<DateTime<Utc>>,
    // API Key Security Controls
    pub max_active_api_keys: i32,  // Always has value (default 5)
    pub mandatory_rotation_days: Option<i32>,  // NULL = no mandatory rotation
    pub api_key_expiry_days: Option<i32>,  // Default API key expiration for all users (1-730 days, NULL = no expiration)
}
