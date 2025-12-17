use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Comprehensive audit logging for security and compliance
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AuditLog {
    pub id: Uuid,
    pub timestamp: DateTime<Utc>,
    pub government_id: Option<Uuid>,
    pub user_id: Option<Uuid>,
    pub api_key_id: Option<Uuid>,
    pub action: AuditAction,
    pub resource_type: String,
    pub resource_id: Option<Uuid>,
    pub ip_address: String,
    pub user_agent: Option<String>,
    pub request_method: String,
    pub request_path: String,
    pub request_body: Option<serde_json::Value>,
    pub response_status: i32,
    pub response_time_ms: i64,
    pub error_message: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "audit_action", rename_all = "lowercase")]
pub enum AuditAction {
    Login,
    Logout,
    LoginFailed,
    ApiKeyCreated,
    ApiKeyRevoked,
    ApiRequest,
    DataAccess,
    DataExport,
    ConfigChange,
    UserCreated,
    UserUpdated,
    UserDeleted,
    PermissionChanged,
    RateLimitExceeded,
    UnauthorizedAccess,
}

impl AuditLog {
    pub fn new(
        government_id: Option<Uuid>,
        user_id: Option<Uuid>,
        api_key_id: Option<Uuid>,
        action: AuditAction,
        resource_type: String,
        ip_address: String,
        request_method: String,
        request_path: String,
        response_status: i32,
        response_time_ms: i64,
    ) -> Self {
        Self {
            id: Uuid::new_v4(),
            timestamp: Utc::now(),
            government_id,
            user_id,
            api_key_id,
            action,
            resource_type,
            resource_id: None,
            ip_address,
            user_agent: None,
            request_method,
            request_path,
            request_body: None,
            response_status,
            response_time_ms,
            error_message: None,
            metadata: None,
        }
    }
}
