// Authentication service
// This file contains helper functions for authentication logic

use sqlx::PgPool;
use uuid::Uuid;

use crate::models::user::{User, UserStatus};

pub struct AuthService;

impl AuthService {
    /// Check if a user has permission for a specific action
    pub async fn has_permission(
        user_id: Uuid,
        permission: &str,
        db_pool: &PgPool,
    ) -> Result<bool, sqlx::Error> {
        let user = sqlx::query_as!(
            User,
            r#"
            SELECT
                id,
                government_id,
                email,
                password_hash,
                full_name,
                title,
                role as "role: crate::models::user::UserRole",
                status as "status: UserStatus",
                mfa_enabled,
                mfa_secret,
                last_login,
                failed_login_attempts,
                locked_until,
                api_key_expiry_days,
                created_at,
                updated_at
            FROM users
            WHERE id = $1
            "#,
            user_id
        )
        .fetch_one(db_pool)
        .await?;

        // Check user status
        if !matches!(user.status, UserStatus::Active) {
            return Ok(false);
        }

        // Role-based permission checking
        let has_perm = match permission {
            "manage:api_keys" => matches!(
                user.role,
                crate::models::user::UserRole::Admin
                    | crate::models::user::UserRole::Developer
            ),
            "view:analytics" => true, // All roles can view
            "export:data" => matches!(
                user.role,
                crate::models::user::UserRole::Admin
                    | crate::models::user::UserRole::Developer
            ),
            "manage:users" => matches!(user.role, crate::models::user::UserRole::Admin),
            _ => false,
        };

        Ok(has_perm)
    }
}
