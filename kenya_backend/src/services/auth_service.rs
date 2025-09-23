use chrono::{Duration, Utc};
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::models::auth::{AuthError, AuthResult};
use crate::models::user::{
    ChangePasswordRequest, LoginRequest, LoginResponse, User, UserResponse,
    TwoFASetupRequest, TwoFASetupResponse, TwoFAVerifyRequest, TwoFADisableRequest,
};
use crate::services::audit_service::AuditService;
use crate::services::password_service::PasswordService;
use crate::services::token_service::TokenService;
use crate::services::two_fa_service::TwoFAService;

/// Main authentication service
pub struct AuthService {
    db_pool: SqlitePool,
    password_service: PasswordService,
    token_service: TokenService,
    audit_service: AuditService,
    two_fa_service: TwoFAService,
}

impl AuthService {
    pub fn new(
        db_pool: SqlitePool,
        password_service: PasswordService,
        token_service: TokenService,
    ) -> Self {
        let audit_service = AuditService::new(db_pool.clone());
        let two_fa_service = TwoFAService::new("Kenya FSFVI Platform".to_string());
        Self {
            db_pool,
            password_service,
            token_service,
            audit_service,
            two_fa_service,
        }
    }

    /// Authenticate user with credentials
    pub async fn authenticate(&mut self, request: LoginRequest, ip_address: &str) -> AuthResult<LoginResponse> {
        // Check rate limiting first
        self.check_rate_limit(&request.username, ip_address)?;

        // Get user from database
        let mut user = self.get_user_by_username(&request.username).await?;

        // Check if account is locked
        if user.is_locked && user.lockout_expiry.map(|exp| exp > Utc::now()).unwrap_or(false) {
            return Err(AuthError::AccountLocked);
        }

        // Verify password
        log::debug!("Login: Verifying password for user: {}", user.username);
        log::debug!("Login: Password length: {}", request.password.len());
        let password_valid = self.password_service.verify_password(&request.password, &user.password_hash)?;

        if !password_valid {
            // Record failed attempt
            self.record_login_attempt(&user, ip_address, false, Some("Invalid password")).await?;

            // Log to audit service
            self.audit_service.log_login_attempt(
                Some(user.id),
                &user.username,
                ip_address,
                request.user_agent.as_deref(),
                false,
                Some("Invalid password"),
            ).await.unwrap_or_else(|e| log::error!("Failed to log failed login: {}", e));

            // Increment failed attempts
            user.login_attempts += 1;

            // Lock account if too many attempts
            if user.login_attempts >= 5 {
                user.is_locked = true;
                user.lockout_expiry = Some(Utc::now() + Duration::minutes(5));
            }

            self.update_user_security_info(&user).await?;
            return Err(AuthError::InvalidCredentials);
        }

        // Reset login attempts on successful authentication
        user.login_attempts = 0;
        user.is_locked = false;
        user.lockout_expiry = None;
        user.last_login = Some(Utc::now());

        // Generate session ID and token
        let session_id = TokenService::generate_session_id();
        let session_expires_at = Utc::now() + Duration::minutes(30); // 30-minute sessions

        user.session_token = Some(session_id.clone());
        user.session_expires_at = Some(session_expires_at);

        // Update user in database
        self.update_user_security_info(&user).await?;

        // Check if 2FA is enabled and handle accordingly
        if user.two_fa_enabled {
            if let Some(two_fa_code) = &request.two_fa_code {
                // Second step: Verify 2FA code
                let is_valid = if two_fa_code.len() == 6 && two_fa_code.chars().all(|c| c.is_ascii_digit()) {
                    // Verify TOTP code
                    if let Some(ref secret) = user.two_fa_secret {
                        self.two_fa_service.verify_totp(secret, two_fa_code)?
                    } else {
                        false
                    }
                } else if two_fa_code.len() == 8 && two_fa_code.chars().all(|c| c.is_ascii_alphanumeric()) {
                    // Verify backup code
                    if let Some(ref backup_codes) = user.two_fa_backup_codes {
                        let (is_valid, updated_codes) = self.two_fa_service.verify_backup_code(backup_codes, two_fa_code)?;
                        if is_valid {
                            // Update backup codes in database (remove used code)
                            self.update_user_backup_codes(user.id, &updated_codes).await?;
                        }
                        is_valid
                    } else {
                        false
                    }
                } else {
                    false
                };

                if !is_valid {
                    // Record failed 2FA attempt
                    self.record_login_attempt(&user, ip_address, false, Some("Invalid 2FA code")).await?;
                    return Err(AuthError::InvalidCredentials);
                }

                // 2FA verified, proceed with login
                self.complete_login(user, session_id, ip_address, &request).await
            } else {
                // First step: Password verified, 2FA required
                let temp_token = self.two_fa_service.generate_temp_token();
                
                // Store temp token temporarily (you might want to store this in Redis or database)
                // For now, we'll return it and validate it on the next request
                
                Ok(LoginResponse {
                    token: String::new(), // No full token yet
                    user: UserResponse::from(user),
                    expires_in: 0,
                    requires_two_fa: true,
                    two_fa_temp_token: Some(temp_token),
                })
            }
        } else {
            // No 2FA, complete login normally
            self.complete_login(user, session_id, ip_address, &request).await
        }
    }

    /// Change user password
    pub async fn change_password(&mut self, user_id: Uuid, request: ChangePasswordRequest) -> AuthResult<()> {
        log::debug!("Password change attempt for user ID: {}", user_id);
        log::debug!("Current password length: {}", request.current_password.len());
        log::debug!("New password length: {}", request.new_password.len());

        // Validate new password matches confirmation
        if request.new_password != request.confirm_password {
            log::debug!("Password confirmation mismatch");
            return Err(AuthError::PasswordMismatch);
        }

        // Get current user
        let user = self.get_user_by_id(user_id).await?;
        log::debug!("Retrieved user: {} (temporary: {})", user.username, user.is_temporary_password);
        log::debug!("Stored password hash prefix: {}", user.password_hash.chars().take(20).collect::<String>());

        // Verify current password
        log::debug!("Password change: Attempting to verify current password for user: {}", user.username);
        log::debug!("Password change: Current password length: {}", request.current_password.len());
        let current_password_valid = self.password_service.verify_password(&request.current_password, &user.password_hash)?;
        log::debug!("Password change: Password verification result: {}", current_password_valid);

        if !current_password_valid {
            log::warn!("Current password verification failed for user: {}", user.username);
            return Err(AuthError::InvalidCredentials);
        }

        // Validate new password strength
        self.password_service.validate_password_strength(&request.new_password)?;

        // Check that new password is different from current
        log::info!("Checking if new password is different from current password");
        let same_password = self.password_service.passwords_are_same(&request.new_password, &user.password_hash);
        if same_password {
            log::warn!("User attempted to set the same password as current");
            return Err(AuthError::InternalError("New password must be different from current password".to_string()));
        }
        log::info!("New password is different from current password - proceeding with change");

        // Hash new password
        let new_password_hash = self.password_service.hash_password(&request.new_password)?;

        // Update password in database
        self.update_user_password(user_id, &new_password_hash).await?;

        // Log password change to audit service
        self.audit_service.log_password_change(
            user_id,
            &user.username,
            "localhost", // TODO: Get actual IP address
            None,
            true,
            user.is_temporary_password,
        ).await.unwrap_or_else(|e| log::error!("Failed to log password change: {}", e));

        log::info!("Password changed successfully for user: {}", user.username);

        Ok(())
    }

    /// Validate session token
    pub async fn validate_session(&self, token: &str) -> AuthResult<UserResponse> {
        // Validate JWT token
        let token_validation = self.token_service.validate_token(token)?;

        // Get user from database to check session
        let user = self.get_user_by_id(token_validation.user_id).await?;

        // Check if session is still valid
        if let (Some(session_token), Some(session_expires_at)) = (&user.session_token, user.session_expires_at) {
            if session_token == &token_validation.session_id && session_expires_at > Utc::now() {
                Ok(UserResponse::from(user))
            } else {
                Err(AuthError::SessionExpired)
            }
        } else {
            Err(AuthError::SessionExpired)
        }
    }

    /// Logout user (invalidate session)
    pub async fn logout(&mut self, user_id: Uuid) -> AuthResult<()> {
        // Get user info for audit logging
        let user = self.get_user_by_id(user_id).await?;

        // Clear session information
        sqlx::query!(
            "UPDATE users SET session_token = NULL, session_expires_at = NULL WHERE id = ?",
            user_id
        )
        .execute(&self.db_pool)
        .await
        .map_err(|e| AuthError::InternalError(format!("Database error: {}", e)))?;

        // Log logout to audit service
        self.audit_service.log_logout(
            user_id,
            &user.username,
            "localhost", // TODO: Get actual IP address
            None,
        ).await.unwrap_or_else(|e| log::error!("Failed to log logout: {}", e));

        Ok(())
    }

    /// Initialize default government user (run once at startup)
    pub async fn initialize_default_user(&self) -> AuthResult<()> {
        // Check if any users exist
        let user_count: i32 = sqlx::query_scalar!("SELECT COUNT(*) as count FROM users")
            .fetch_one(&self.db_pool)
            .await
            .map_err(|e| AuthError::InternalError(format!("Database error: {}", e)))?;

        if user_count == 0 {
            // Create default government user with temporary password
            let temp_password = self.password_service.generate_temporary_password();
            let password_hash = self.password_service.hash_password(&temp_password)?;
            let user_id = Uuid::new_v4();
            let now = Utc::now();

            sqlx::query!(
                r#"
                INSERT INTO users (id, username, password_hash, role, is_temporary_password,
                                 created_at, updated_at, login_attempts, is_locked,
                                 two_fa_enabled, two_fa_secret, two_fa_backup_codes, two_fa_enabled_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                "#,
                user_id,
                "kenya_government",
                password_hash,
                "kenya_government",
                true,
                now,
                now,
                0,
                false,
                false,
                Option::<String>::None,
                Option::<String>::None,
                Option::<chrono::DateTime<chrono::Utc>>::None
            )
            .execute(&self.db_pool)
            .await
            .map_err(|e| AuthError::InternalError(format!("Database error: {}", e)))?;

            log::warn!("Default user created with temporary password: {}", temp_password);
            log::warn!("IMPORTANT: Change this password immediately after first login!");
        }

        Ok(())
    }

    // Private helper methods

    async fn get_user_by_username(&self, username: &str) -> AuthResult<User> {
        sqlx::query_as::<_, User>(
            r#"
            SELECT id, username, password_hash,
                   role,
                   is_temporary_password,
                   created_at,
                   updated_at,
                   last_login,
                   login_attempts, is_locked,
                   lockout_expiry,
                   password_changed_at,
                   session_token,
                   session_expires_at,
                   two_fa_enabled,
                   two_fa_secret,
                   two_fa_backup_codes,
                   two_fa_enabled_at
            FROM users WHERE username = ?
            "#
        )
        .bind(username)
        .fetch_optional(&self.db_pool)
        .await
        .map_err(|e| AuthError::InternalError(format!("Database error: {}", e)))?
        .ok_or(AuthError::InvalidCredentials)
    }

    async fn get_user_by_id(&self, user_id: Uuid) -> AuthResult<User> {
        sqlx::query_as::<_, User>(
            r#"
            SELECT id, username, password_hash,
                   role,
                   is_temporary_password,
                   created_at,
                   updated_at,
                   last_login,
                   login_attempts, is_locked,
                   lockout_expiry,
                   password_changed_at,
                   session_token,
                   session_expires_at,
                   two_fa_enabled,
                   two_fa_secret,
                   two_fa_backup_codes,
                   two_fa_enabled_at
            FROM users WHERE id = ?
            "#
        )
        .bind(user_id)
        .fetch_optional(&self.db_pool)
        .await
        .map_err(|e| AuthError::InternalError(format!("Database error: {}", e)))?
        .ok_or(AuthError::InvalidCredentials)
    }

    async fn update_user_security_info(&self, user: &User) -> AuthResult<()> {
        let now = Utc::now();
        sqlx::query!(
            r#"
            UPDATE users
            SET login_attempts = ?, is_locked = ?, lockout_expiry = ?,
                last_login = ?, session_token = ?, session_expires_at = ?,
                updated_at = ?
            WHERE id = ?
            "#,
            user.login_attempts,
            user.is_locked,
            user.lockout_expiry,
            user.last_login,
            user.session_token,
            user.session_expires_at,
            now,
            user.id
        )
        .execute(&self.db_pool)
        .await
        .map_err(|e| AuthError::InternalError(format!("Database error: {}", e)))?;

        Ok(())
    }

    async fn update_user_password(&self, user_id: Uuid, password_hash: &str) -> AuthResult<()> {
        let now = Utc::now();
        sqlx::query!(
            r#"
            UPDATE users
            SET password_hash = ?, is_temporary_password = ?,
                password_changed_at = ?, updated_at = ?
            WHERE id = ?
            "#,
            password_hash,
            false,
            now,
            now,
            user_id
        )
        .execute(&self.db_pool)
        .await
        .map_err(|e| AuthError::InternalError(format!("Database error: {}", e)))?;

        Ok(())
    }

    async fn record_login_attempt(&self, user: &User, ip_address: &str, success: bool, failure_reason: Option<&str>) -> AuthResult<()> {
        let attempt_id = Uuid::new_v4();
        let now = Utc::now();

        sqlx::query!(
            r#"
            INSERT INTO login_attempts (id, user_id, username, ip_address, success,
                                      failure_reason, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            "#,
            attempt_id,
            user.id,
            user.username,
            ip_address,
            success,
            failure_reason,
            now
        )
        .execute(&self.db_pool)
        .await
        .map_err(|e| AuthError::InternalError(format!("Database error: {}", e)))?;

        Ok(())
    }

    fn check_rate_limit(&self, _username: &str, _ip_address: &str) -> AuthResult<()> {
        // Simple in-memory rate limiting
        // In production, use Redis or a proper rate limiting service

        let now = Utc::now();
        let _window_start = now - Duration::minutes(5);

        // This is a simplified implementation
        // TODO: Implement proper rate limiting with Redis or database

        Ok(())
    }

    /// Complete the login process (generate token and log)
    async fn complete_login(&mut self, user: User, session_id: String, ip_address: &str, request: &LoginRequest) -> AuthResult<LoginResponse> {
        // Generate JWT token
        let token = self.token_service.generate_token(&user, &session_id)?;

        // Record successful login
        self.record_login_attempt(&user, ip_address, true, None).await?;

        // Log to audit service
        self.audit_service.log_login_attempt(
            Some(user.id),
            &user.username,
            ip_address,
            request.user_agent.as_deref(),
            true,
            None,
        ).await.unwrap_or_else(|e| log::error!("Failed to log successful login: {}", e));

        Ok(LoginResponse {
            token,
            user: UserResponse::from(user),
            expires_in: 28800, // 8 hours in seconds
            requires_two_fa: false,
            two_fa_temp_token: None,
        })
    }

    /// Update user backup codes
    async fn update_user_backup_codes(&self, user_id: Uuid, backup_codes: &str) -> AuthResult<()> {
        let now = Utc::now();
        sqlx::query!(
            "UPDATE users SET two_fa_backup_codes = ?, updated_at = ? WHERE id = ?",
            backup_codes,
            now,
            user_id
        )
        .execute(&self.db_pool)
        .await
        .map_err(|e| AuthError::InternalError(format!("Database error: {}", e)))?;

        Ok(())
    }

    /// Prepare 2FA setup - generates secret and QR code
    pub async fn prepare_two_fa_setup(&mut self, user_id: Uuid) -> AuthResult<TwoFASetupResponse> {
        let user = self.get_user_by_id(user_id).await?;
        
        // Generate secret and backup codes
        let secret = self.two_fa_service.generate_secret();
        let backup_codes = self.two_fa_service.generate_backup_codes(10);
        
        // Generate QR code
        let qr_code = self.two_fa_service.generate_qr_code(&user.username, &secret)?;
        
        Ok(TwoFASetupResponse {
            secret,
            qr_code,
            backup_codes,
            enabled: false, // Not enabled yet, just prepared
        })
    }

    /// Set up 2FA for user - verifies TOTP and enables 2FA
    pub async fn setup_two_fa(&mut self, user_id: Uuid, request: TwoFASetupRequest) -> AuthResult<TwoFASetupResponse> {
        let user = self.get_user_by_id(user_id).await?;
        
        // Generate secret and backup codes (same as prepare, but we'll verify the code)
        let secret = self.two_fa_service.generate_secret();
        let backup_codes = self.two_fa_service.generate_backup_codes(10);
        
        // Verify the provided TOTP code against the generated secret
        let is_valid = self.two_fa_service.verify_totp(&secret, &request.totp_code)?;
        if !is_valid {
            return Err(AuthError::InvalidCredentials);
        }

        // Generate QR code
        let qr_code = self.two_fa_service.generate_qr_code(&user.username, &secret)?;
        
        // Hash backup codes for storage
        let backup_codes_json = self.two_fa_service.hash_backup_codes(&backup_codes)?;
        
        // Update user in database
        let now = Utc::now();
        sqlx::query!(
            r#"
            UPDATE users 
            SET two_fa_enabled = ?, two_fa_secret = ?, two_fa_backup_codes = ?, 
                two_fa_enabled_at = ?, updated_at = ?
            WHERE id = ?
            "#,
            true,
            secret,
            backup_codes_json,
            now,
            now,
            user_id
        )
        .execute(&self.db_pool)
        .await
        .map_err(|e| AuthError::InternalError(format!("Database error: {}", e)))?;

        Ok(TwoFASetupResponse {
            secret,
            qr_code,
            backup_codes,
            enabled: true,
        })
    }

    /// Verify 2FA code during login
    pub async fn verify_two_fa(&mut self, request: TwoFAVerifyRequest) -> AuthResult<LoginResponse> {
        // Validate temp token format
        if !self.two_fa_service.validate_temp_token(&request.temp_token) {
            return Err(AuthError::InvalidToken);
        }

        // In a real implementation, you would validate the temp token against a store (Redis/database)
        // For this example, we'll assume it's valid if it has the right format
        
        // This is a simplified implementation - in production, you'd need to:
        // 1. Store temp tokens with user association and expiry
        // 2. Validate the temp token and get associated user
        // 3. Complete the login process
        
        Err(AuthError::InternalError("2FA verification not fully implemented for temp tokens".to_string()))
    }

    /// Disable 2FA for user
    pub async fn disable_two_fa(&mut self, user_id: Uuid, request: TwoFADisableRequest) -> AuthResult<()> {
        let user = self.get_user_by_id(user_id).await?;
        
        // Verify password
        let password_valid = self.password_service.verify_password(&request.password, &user.password_hash)?;
        if !password_valid {
            return Err(AuthError::InvalidCredentials);
        }

        // Verify either TOTP code or backup code if provided
        if let Some(totp_code) = &request.totp_code {
            if let Some(ref secret) = user.two_fa_secret {
                let is_valid = self.two_fa_service.verify_totp(secret, totp_code)?;
                if !is_valid {
                    return Err(AuthError::InvalidCredentials);
                }
            }
        } else if let Some(backup_code) = &request.backup_code {
            if let Some(ref backup_codes) = user.two_fa_backup_codes {
                let (is_valid, _) = self.two_fa_service.verify_backup_code(backup_codes, backup_code)?;
                if !is_valid {
                    return Err(AuthError::InvalidCredentials);
                }
            }
        } else {
            return Err(AuthError::InternalError("Either TOTP code or backup code required".to_string()));
        }

        // Disable 2FA in database
        let now = Utc::now();
        sqlx::query!(
            r#"
            UPDATE users 
            SET two_fa_enabled = ?, two_fa_secret = NULL, two_fa_backup_codes = NULL,
                two_fa_enabled_at = NULL, updated_at = ?
            WHERE id = ?
            "#,
            false,
            now,
            user_id
        )
        .execute(&self.db_pool)
        .await
        .map_err(|e| AuthError::InternalError(format!("Database error: {}", e)))?;

        Ok(())
    }
}