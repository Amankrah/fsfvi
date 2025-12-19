/// Security Event Service
/// ========================
/// CRITICAL: Logs all security-relevant events for audit trails
/// Government systems must maintain comprehensive logs for accountability

use sqlx::SqlitePool;
use uuid::Uuid;

pub struct SecurityEventService {
    db_pool: SqlitePool,
}

impl SecurityEventService {
    pub fn new(db_pool: SqlitePool) -> Self {
        Self { db_pool }
    }

    /// Log a security event to the database
    /// CRITICAL: This creates an immutable audit trail
    pub async fn log_event(
        &self,
        user_id: Option<Uuid>,
        event_type: &str,
        description: &str,
        ip_address: Option<&str>,
        user_agent: Option<&str>,
        success: bool,
        metadata: Option<serde_json::Value>,
    ) -> Result<(), sqlx::Error> {
        // CRITICAL: Use SecurityEvent constructor for government audit trail
        let event = crate::models::user::SecurityEvent::new(
            user_id,
            event_type.to_string(),
            description.to_string(),
            ip_address.map(|s| s.to_string()),
            user_agent.map(|s| s.to_string()),
            success,
            metadata,
        );

        sqlx::query!(
            r#"
            INSERT INTO security_events (
                id, user_id, event_type, description, ip_address,
                user_agent, success, timestamp, metadata
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
            event.id,
            event.user_id,
            event.event_type,
            event.description,
            event.ip_address,
            event.user_agent,
            event.success,
            event.timestamp,
            event.metadata
        )
        .execute(&self.db_pool)
        .await?;

        log::info!(
            "Security event logged: type={}, user_id={:?}, success={}",
            event.event_type,
            event.user_id,
            event.success
        );

        Ok(())
    }

    /// Log failed login attempt
    pub async fn log_failed_login(
        &self,
        username: &str,
        ip_address: &str,
        user_agent: Option<&str>,
        reason: &str,
    ) -> Result<(), sqlx::Error> {
        self.log_event(
            None,
            "failed_login",
            &format!("Failed login attempt for user: {} - {}", username, reason),
            Some(ip_address),
            user_agent,
            false,
            Some(serde_json::json!({"username": username, "reason": reason})),
        )
        .await
    }

    /// Log successful login
    pub async fn log_successful_login(
        &self,
        user_id: Uuid,
        username: &str,
        ip_address: &str,
        user_agent: Option<&str>,
    ) -> Result<(), sqlx::Error> {
        self.log_event(
            Some(user_id),
            "successful_login",
            &format!("Successful login for user: {}", username),
            Some(ip_address),
            user_agent,
            true,
            Some(serde_json::json!({"username": username})),
        )
        .await
    }

    /// Log password change
    pub async fn log_password_change(
        &self,
        user_id: Uuid,
        username: &str,
        was_temporary: bool,
    ) -> Result<(), sqlx::Error> {
        self.log_event(
            Some(user_id),
            "password_change",
            &format!("Password changed for user: {}", username),
            None,
            None,
            true,
            Some(serde_json::json!({"username": username, "was_temporary_password": was_temporary})),
        )
        .await
    }

    /// Log logout
    pub async fn log_logout(
        &self,
        user_id: Uuid,
        username: &str,
    ) -> Result<(), sqlx::Error> {
        self.log_event(
            Some(user_id),
            "logout",
            &format!("User logged out: {}", username),
            None,
            None,
            true,
            Some(serde_json::json!({"username": username})),
        )
        .await
    }

    /// Log token blacklisted (security-critical event)
    pub async fn log_token_blacklisted(
        &self,
        user_id: Uuid,
        username: &str,
        reason: &str,
    ) -> Result<(), sqlx::Error> {
        self.log_event(
            Some(user_id),
            "token_blacklisted",
            &format!("Token blacklisted for user: {} - {}", username, reason),
            None,
            None,
            true,
            Some(serde_json::json!({"username": username, "reason": reason})),
        )
        .await
    }
}
