use chrono::Utc;
use serde_json::json;
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::models::auth::AuditLogEntry;

/// Audit service for comprehensive security logging
pub struct AuditService {
    db_pool: SqlitePool,
}

impl AuditService {
    pub fn new(db_pool: SqlitePool) -> Self {
        Self { db_pool }
    }

    /// Log a security event
    pub async fn log_security_event(
        &self,
        user_id: Option<Uuid>,
        event_type: &str,
        description: &str,
        ip_address: Option<&str>,
        user_agent: Option<&str>,
        success: bool,
        details: Option<serde_json::Value>,
    ) -> Result<(), sqlx::Error> {
        let event_id = Uuid::new_v4();
        let now = Utc::now();
        let metadata = details.map(|d| serde_json::to_string(&d).unwrap_or_default());

        sqlx::query!(
            r#"
            INSERT INTO security_events (id, user_id, event_type, description,
                                       ip_address, user_agent, success, timestamp, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
            event_id,
            user_id,
            event_type,
            description,
            ip_address,
            user_agent,
            success,
            now,
            metadata
        )
        .execute(&self.db_pool)
        .await?;

        // Also log to application logs for real-time monitoring
        if success {
            log::info!(
                "SECURITY EVENT: {} - {} (User: {:?}, IP: {:?})",
                event_type,
                description,
                user_id,
                ip_address.unwrap_or("unknown")
            );
        } else {
            log::warn!(
                "SECURITY ALERT: {} - {} (User: {:?}, IP: {:?})",
                event_type,
                description,
                user_id,
                ip_address.unwrap_or("unknown")
            );
        }

        Ok(())
    }

    /// Log login attempt
    pub async fn log_login_attempt(
        &self,
        user_id: Option<Uuid>,
        username: &str,
        ip_address: &str,
        user_agent: Option<&str>,
        success: bool,
        failure_reason: Option<&str>,
    ) -> Result<(), sqlx::Error> {
        let details = json!({
            "username": username,
            "failure_reason": failure_reason,
            "timestamp": Utc::now().to_rfc3339()
        });

        self.log_security_event(
            user_id,
            "LOGIN_ATTEMPT",
            &format!("Login attempt for user: {}", username),
            Some(ip_address),
            user_agent,
            success,
            Some(details),
        )
        .await
    }

    /// Log password change
    pub async fn log_password_change(
        &self,
        user_id: Uuid,
        username: &str,
        ip_address: &str,
        user_agent: Option<&str>,
        success: bool,
        was_temporary: bool,
    ) -> Result<(), sqlx::Error> {
        let details = json!({
            "username": username,
            "was_temporary_password": was_temporary,
            "timestamp": Utc::now().to_rfc3339()
        });

        self.log_security_event(
            Some(user_id),
            "PASSWORD_CHANGE",
            &format!("Password change for user: {}", username),
            Some(ip_address),
            user_agent,
            success,
            Some(details),
        )
        .await
    }

    /// Log token validation
    pub async fn log_token_validation(
        &self,
        user_id: Option<Uuid>,
        ip_address: &str,
        user_agent: Option<&str>,
        success: bool,
        failure_reason: Option<&str>,
    ) -> Result<(), sqlx::Error> {
        let details = json!({
            "failure_reason": failure_reason,
            "timestamp": Utc::now().to_rfc3339()
        });

        self.log_security_event(
            user_id,
            "TOKEN_VALIDATION",
            "Token validation attempt",
            Some(ip_address),
            user_agent,
            success,
            Some(details),
        )
        .await
    }

    /// Log logout
    pub async fn log_logout(
        &self,
        user_id: Uuid,
        username: &str,
        ip_address: &str,
        user_agent: Option<&str>,
    ) -> Result<(), sqlx::Error> {
        let details = json!({
            "username": username,
            "timestamp": Utc::now().to_rfc3339()
        });

        self.log_security_event(
            Some(user_id),
            "LOGOUT",
            &format!("User logout: {}", username),
            Some(ip_address),
            user_agent,
            true,
            Some(details),
        )
        .await
    }

    /// Get recent security events for monitoring
    pub async fn get_recent_events(&self, limit: i32) -> Result<Vec<AuditLogEntry>, sqlx::Error> {
        let events = sqlx::query_as::<_, AuditLogEntry>(
            r#"
            SELECT id, user_id, event_type, description, ip_address,
                   user_agent, success, timestamp, metadata as details
            FROM security_events
            ORDER BY timestamp DESC
            LIMIT ?
            "#
        )
        .bind(limit)
        .fetch_all(&self.db_pool)
        .await?;

        Ok(events)
    }

    /// Get security events for a specific user
    pub async fn get_user_events(
        &self,
        user_id: Uuid,
        limit: i32,
    ) -> Result<Vec<AuditLogEntry>, sqlx::Error> {
        let events = sqlx::query_as::<_, AuditLogEntry>(
            r#"
            SELECT id, user_id, event_type, description, ip_address,
                   user_agent, success, timestamp, metadata as details
            FROM security_events
            WHERE user_id = ?
            ORDER BY timestamp DESC
            LIMIT ?
            "#
        )
        .bind(user_id)
        .bind(limit)
        .fetch_all(&self.db_pool)
        .await?;

        Ok(events)
    }

    /// Get failed login attempts in the last hour
    pub async fn get_recent_failed_logins(&self) -> Result<i64, sqlx::Error> {
        let count: i32 = sqlx::query_scalar!(
            r#"
            SELECT COUNT(*) as count
            FROM security_events
            WHERE event_type = 'LOGIN_ATTEMPT'
            AND success = false
            AND timestamp > datetime('now', '-1 hour')
            "#
        )
        .fetch_one(&self.db_pool)
        .await?;

        Ok(count as i64)
    }
}