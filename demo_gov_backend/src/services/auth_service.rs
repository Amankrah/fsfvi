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
use crate::services::security_event_service::SecurityEventService;
use crate::services::token_service::{TokenService, TokenBlacklist};
use crate::services::two_fa_service::TwoFAService;
use std::sync::{Arc, Mutex};

/// Main authentication service
pub struct AuthService {
    db_pool: SqlitePool,
    password_service: PasswordService,
    token_service: TokenService,
    audit_service: AuditService,
    two_fa_service: TwoFAService,
    security_event_service: SecurityEventService,
    security_config: crate::models::auth::SecurityConfig,
    /// CRITICAL: Token blacklist for revoked tokens (government security requirement)
    token_blacklist: Arc<Mutex<TokenBlacklist>>,
}

impl AuthService {
    pub fn new(
        db_pool: SqlitePool,
        password_service: PasswordService,
        token_service: TokenService,
        security_config: crate::models::auth::SecurityConfig,
    ) -> Self {
        let audit_service = AuditService::new(db_pool.clone());
        let two_fa_service = TwoFAService::new("Demo Government FSFVI Platform".to_string());
        let security_event_service = SecurityEventService::new(db_pool.clone());
        let token_blacklist = Arc::new(Mutex::new(TokenBlacklist::new()));

        Self {
            db_pool,
            password_service,
            token_service,
            audit_service,
            two_fa_service,
            security_event_service,
            security_config,
            token_blacklist,
        }
    }

    /// Authenticate user with credentials
    pub async fn authenticate(&mut self, request: LoginRequest, ip_address: &str) -> AuthResult<LoginResponse> {
        // Check rate limiting first (CRITICAL: Prevents brute force attacks)
        self.check_rate_limit(&request.username, ip_address).await?;

        // Get user from database
        let mut user = self.get_user_by_username(&request.username).await?;

        // Check if account is locked
        if user.is_locked && user.lockout_expiry.map(|exp| exp > Utc::now()).unwrap_or(false) {
            return Err(AuthError::AccountLocked);
        }

        // Verify password
        log::debug!("Login: Verifying password for user: {}", user.username);
        log::debug!("Login: Password length: {}", request.password.len());
        let password_valid = self.password_service.verify_password(&request.password, &user.password_hash).unwrap_or(false);

        if !password_valid {
            // Record failed attempt
            self.record_login_attempt(&user, ip_address, false, Some("Invalid password")).await?;

            // Log to audit service
            self.audit_service.log_login_attempt(
                Some(&user.id),
                &user.username,
                ip_address,
                request.user_agent.as_deref(),
                false,
                Some("Invalid password"),
            ).await.unwrap_or_else(|e| log::error!("Failed to log failed login: {}", e));

            // CRITICAL SECURITY: Log failed login to security events for monitoring
            self.security_event_service.log_failed_login(
                &user.username,
                ip_address,
                request.user_agent.as_deref(),
                "Invalid password",
            ).await.unwrap_or_else(|e| log::error!("Failed to log security event: {}", e));

            // Increment failed attempts
            user.login_attempts += 1;

            // Lock account if too many attempts
            // CRITICAL: Use configured lockout duration from SecurityConfig for government compliance
            // Different governments may have different security policies (e.g., 5 min, 15 min, 30 min)
            if user.login_attempts >= self.security_config.rate_limit.max_attempts as i32 {
                user.is_locked = true;
                let lockout_duration_secs = self.security_config.rate_limit.lockout_duration_seconds as i64;
                user.lockout_expiry = Some(Utc::now() + Duration::seconds(lockout_duration_secs));
                log::warn!(
                    "SECURITY: Account locked for user {} after {} failed attempts. Lockout duration: {} seconds",
                    user.username, user.login_attempts, lockout_duration_secs
                );
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
        // SECURITY: Use configured session timeout from SecurityConfig
        let session_expires_at = Utc::now() + Duration::minutes(self.security_config.session_timeout_minutes);
        log::debug!("Session created with {} minute timeout", self.security_config.session_timeout_minutes);

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
                            self.update_user_backup_codes(&user.id, &updated_codes).await?;
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
                let temp_token = self.two_fa_service.generate_temp_token_with_username(&user.username);

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
    pub async fn change_password(&mut self, user_id: &str, request: ChangePasswordRequest) -> AuthResult<()> {
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
        let current_password_valid = self.password_service.verify_password(&request.current_password, &user.password_hash).unwrap_or(false);
        log::debug!("Password change: Password verification result: {}", current_password_valid);

        if !current_password_valid {
            log::warn!("Current password verification failed for user: {}", user.username);
            return Err(AuthError::InvalidCredentials);
        }

        // Validate new password strength (includes common password & entropy checks)
        self.password_service.validate_password_strength(&request.new_password)?;

        // SECURITY ENHANCEMENT: Rate password strength for audit logging
        let strength = self.password_service.rate_password_strength(&request.new_password);
        let entropy = self.password_service.calculate_entropy(&request.new_password);
        log::info!("Password change for user {}: strength={}, entropy={:.1} bits",
                   user.username, strength, entropy);

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

        // CRITICAL SECURITY: Log password change to security events
        self.security_event_service.log_password_change(
            user_id,
            &user.username,
            user.is_temporary_password,
        ).await.unwrap_or_else(|e| log::error!("Failed to log security event: {}", e));

        log::info!("Password changed successfully for user: {}", user.username);

        Ok(())
    }

    /// Validate session token
    pub async fn validate_session(&self, token: &str) -> AuthResult<UserResponse> {
        // CRITICAL SECURITY: Check if token is blacklisted first
        // This prevents use of tokens from logged-out sessions or compromised accounts
        let is_blacklisted = match self.token_blacklist.lock() {
            Ok(blacklist) => blacklist.is_blacklisted(token),
            Err(e) => {
                log::error!("Failed to acquire blacklist lock: {}", e);
                false // Fail open for availability, but log the error
            }
        };

        if is_blacklisted {
            log::warn!("SECURITY ALERT: Attempt to use blacklisted token detected");

            // Try to extract user_id for security logging even from blacklisted token
            if let Some(user_id) = self.token_service.extract_user_id(token) {
                log::warn!("Blacklisted token belongs to user_id: {}", user_id);

                // Log this security event
                if let Err(e) = self.security_event_service.log_event(
                    Some(&user_id),
                    "blacklisted_token_use_attempt",
                    "Attempt to use blacklisted token",
                    None,
                    None,
                    false,
                    None,
                ).await {
                    log::error!("Failed to log blacklisted token use attempt: {}", e);
                }
            }

            return Err(AuthError::InvalidToken);
        }

        // Validate JWT token
        let token_validation = self.token_service.validate_token(token)?;

        // SECURITY: Log token validation details for audit trail
        log::debug!(
            "Token validated: user_id={}, username={}, role={}, session_id={}, is_temp_password={}, expires_at={}",
            token_validation.user_id,
            token_validation.username,
            token_validation.role,
            token_validation.session_id,
            token_validation.is_temp_password,
            token_validation.expires_at.to_rfc3339()
        );

        // Get user from database to check session
        let user = self.get_user_by_id(&token_validation.user_id).await?;

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

    /// Get detailed session information
    /// CRITICAL: Returns enhanced session details including IP address, user agent, and expiration
    /// Used for session monitoring, security audits, and user session management
    pub async fn get_session_info(&self, token: &str, ip_address: Option<String>, user_agent: Option<String>) -> AuthResult<crate::models::user::SessionInfo> {
        // CRITICAL SECURITY: Check if token is blacklisted first
        let is_blacklisted = match self.token_blacklist.lock() {
            Ok(blacklist) => blacklist.is_blacklisted(token),
            Err(e) => {
                log::error!("Failed to acquire blacklist lock: {}", e);
                false
            }
        };

        if is_blacklisted {
            log::warn!("Attempt to get session info for blacklisted token");
            return Err(AuthError::InvalidToken);
        }

        // Validate JWT token
        let token_validation = self.token_service.validate_token(token)?;

        // SECURITY: Log token validation details for audit trail
        log::debug!(
            "Session info request - Token validated: user_id={}, username={}, role={}, session_id={}, is_temp_password={}, expires_at={}",
            token_validation.user_id,
            token_validation.username,
            token_validation.role,
            token_validation.session_id,
            token_validation.is_temp_password,
            token_validation.expires_at.to_rfc3339()
        );

        // Get user from database to check session
        let user = self.get_user_by_id(&token_validation.user_id).await?;

        // Check if session is still valid
        if let (Some(session_token), Some(session_expires_at)) = (&user.session_token, user.session_expires_at) {
            if session_token == &token_validation.session_id && session_expires_at > Utc::now() {
                // Build SessionInfo with all details
                let session_info = crate::models::user::SessionInfo {
                    user_id: user.id.clone(),
                    username: user.username.clone(),
                    role: user.role.clone(),
                    is_temporary_password: user.is_temporary_password,
                    expires_at: session_expires_at,
                    ip_address,
                    user_agent,
                };

                log::debug!(
                    "Session info retrieved for user: {} (expires at: {})",
                    user.username,
                    session_expires_at.to_rfc3339()
                );

                Ok(session_info)
            } else {
                Err(AuthError::SessionExpired)
            }
        } else {
            Err(AuthError::SessionExpired)
        }
    }

    /// Logout user (invalidate session)
    /// SECURITY: Accepts the JWT token to blacklist it, preventing reuse after logout
    pub async fn logout(&mut self, user_id: &str, token: Option<&str>) -> AuthResult<()> {
        // Get user info for audit logging
        let user = self.get_user_by_id(user_id).await?;

        // CRITICAL SECURITY: Blacklist the token to prevent reuse
        // Even though we clear the session, the JWT itself remains valid until expiry
        // Blacklisting ensures a logged-out token cannot be used
        if let Some(jwt_token) = token {
            // Add token to blacklist
            match self.token_blacklist.lock() {
                Ok(mut blacklist) => {
                    blacklist.blacklist_token(jwt_token.to_string());
                    log::info!("Token successfully blacklisted for user: {}", user.username);

                    // Log blacklisting event for audit trail
                    if let Err(e) = self.security_event_service.log_token_blacklisted(
                        user_id,
                        &user.username,
                        "User logout"
                    ).await {
                        log::error!("Failed to log token blacklist event: {}", e);
                    }
                }
                Err(e) => {
                    log::error!("Failed to acquire blacklist lock during logout: {}", e);
                    // Continue with logout even if blacklisting fails
                }
            }
        } else {
            log::warn!("Logout called without token - session cleared but token not blacklisted");
        }

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

        // CRITICAL SECURITY: Log logout to security events
        self.security_event_service.log_logout(
            user_id,
            &user.username,
        ).await.unwrap_or_else(|e| log::error!("Failed to log security event: {}", e));

        Ok(())
    }

    /// Get audit logs for security monitoring
    /// CRITICAL: Provides access to immutable audit trail for compliance and security analysis
    /// Only accessible to authenticated users - filters by user_id for privacy
    pub async fn get_audit_logs(&self, user_id: &str, limit: i32) -> AuthResult<Vec<crate::models::auth::AuditLogEntry>> {
        self.audit_service
            .get_user_events(user_id, limit)
            .await
            .map_err(|e| AuthError::InternalError(format!("Failed to retrieve audit logs: {}", e)))
    }

    /// Get recent security events (admin only in production)
    /// CRITICAL: Provides system-wide security monitoring capabilities
    pub async fn get_recent_audit_logs(&self, limit: i32) -> AuthResult<Vec<crate::models::auth::AuditLogEntry>> {
        self.audit_service
            .get_recent_events(limit)
            .await
            .map_err(|e| AuthError::InternalError(format!("Failed to retrieve audit logs: {}", e)))
    }

    /// Get count of recent failed login attempts
    /// CRITICAL: Security monitoring to detect brute force attacks
    pub async fn get_failed_login_count(&self) -> AuthResult<i64> {
        self.audit_service
            .get_recent_failed_logins()
            .await
            .map_err(|e| AuthError::InternalError(format!("Failed to retrieve failed login count: {}", e)))
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
                "demo_government",
                password_hash,
                "demo_government",
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

    async fn get_user_by_id(&self, user_id: &str) -> AuthResult<User> {
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

    async fn update_user_password(&self, user_id: &str, password_hash: &str) -> AuthResult<()> {
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

    /// Check rate limiting for login attempts
    /// CRITICAL: Prevents brute force attacks by limiting login attempts per IP
    /// Uses SecurityConfig.rate_limit to configure max attempts and lockout duration
    async fn check_rate_limit(&self, username: &str, ip_address: &str) -> AuthResult<()> {
        // SECURITY: Use configured rate limit parameters from security_config
        let rate_config = &self.security_config.rate_limit;

        log::debug!(
            "Rate limit check for username={}, ip={}: max_attempts={}, window_seconds={}",
            username,
            ip_address,
            rate_config.max_attempts,
            rate_config.window_seconds
        );

        // CRITICAL: Calculate time window for rate limiting based on government security policy
        let window_start = Utc::now() - chrono::Duration::seconds(rate_config.window_seconds as i64);

        // Query login_attempts table for failed attempts in the configured time window
        let attempt_count = sqlx::query_scalar!(
            r#"
            SELECT COUNT(*) as count
            FROM login_attempts
            WHERE ip_address = ?
              AND success = 0
              AND timestamp > ?
            "#,
            ip_address,
            window_start
        )
        .fetch_one(&self.db_pool)
        .await
        .map_err(|e| AuthError::InternalError(format!("Rate limit check failed: {}", e)))?;

        // CRITICAL: Block if exceeding max_attempts within the configured window
        // This protects government systems from brute force attacks
        if attempt_count >= rate_config.max_attempts as i32 {
            log::warn!(
                "SECURITY ALERT: Too many failed login attempts from IP: {} (count: {}, limit: {})",
                ip_address,
                attempt_count,
                rate_config.max_attempts
            );
            return Err(AuthError::TooManyAttempts);
        }

        log::debug!(
            "Rate limit check passed for IP {}: {}/{} attempts in {}s window",
            ip_address,
            attempt_count,
            rate_config.max_attempts,
            rate_config.window_seconds
        );

        Ok(())
    }

    /// Complete the login process (generate token and log)
    async fn complete_login(&mut self, mut user: User, session_id: String, ip_address: &str, request: &LoginRequest) -> AuthResult<LoginResponse> {
        // CRITICAL SECURITY: Check if password change is required for temporary passwords
        // Government policy enforces password changes for temporary credentials
        if self.security_config.require_password_change && user.is_temporary_password {
            log::warn!(
                "User {} logging in with temporary password - password change required per security policy",
                user.username
            );
            // Frontend should check user.is_temporary_password and enforce password change flow
        }

        // CRITICAL: Set session information before generating token
        let session_expires_at = Utc::now() + Duration::minutes(self.security_config.session_timeout_minutes);
        user.session_token = Some(session_id.clone());
        user.session_expires_at = Some(session_expires_at);

        // Update session in database
        self.update_user_security_info(&user).await?;

        // Generate JWT token
        let token = self.token_service.generate_token(&user, &session_id)?;

        // Record successful login
        self.record_login_attempt(&user, ip_address, true, None).await?;

        // Log to audit service
        self.audit_service.log_login_attempt(
            Some(&user.id),
            &user.username,
            ip_address,
            request.user_agent.as_deref(),
            true,
            None,
        ).await.unwrap_or_else(|e| log::error!("Failed to log successful login: {}", e));

        // CRITICAL SECURITY: Log successful login to security events
        self.security_event_service.log_successful_login(
            &user.id,
            &user.username,
            ip_address,
            request.user_agent.as_deref(),
        ).await.unwrap_or_else(|e| log::error!("Failed to log security event: {}", e));

        Ok(LoginResponse {
            token,
            user: UserResponse::from(user),
            expires_in: 28800, // 8 hours in seconds
            requires_two_fa: false,
            two_fa_temp_token: None,
        })
    }

    /// Update user backup codes
    async fn update_user_backup_codes(&self, user_id: &str, backup_codes: &str) -> AuthResult<()> {
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
    pub async fn prepare_two_fa_setup(&mut self, user_id: &str) -> AuthResult<TwoFASetupResponse> {
        let user = self.get_user_by_id(user_id).await?;

        // Generate secret and backup codes
        let secret = self.two_fa_service.generate_secret();
        let backup_codes = self.two_fa_service.generate_backup_codes(10);

        // Generate QR code and otpauth URL
        let qr_code = self.two_fa_service.generate_qr_code(&user.username, &secret)?;
        let otpauth_url = self.two_fa_service.generate_otpauth_url(&user.username, &secret);

        Ok(TwoFASetupResponse {
            secret,
            qr_code,
            otpauth_url,
            backup_codes,
            enabled: false, // Not enabled yet, just prepared
        })
    }

    /// Set up 2FA for user - verifies TOTP and enables 2FA
    pub async fn setup_two_fa(&mut self, user_id: &str, request: TwoFASetupRequest) -> AuthResult<TwoFASetupResponse> {
        let user = self.get_user_by_id(user_id).await?;

        // Use the secret and backup codes provided from the prepare phase
        let secret = request.secret.clone();
        let backup_codes = request.backup_codes.clone();

        // Verify the provided TOTP code against the secret from prepare phase
        let is_valid = self.two_fa_service.verify_totp(&secret, &request.totp_code)?;
        if !is_valid {
            return Err(AuthError::InvalidCredentials);
        }

        // Generate QR code and otpauth URL (for response consistency)
        let qr_code = self.two_fa_service.generate_qr_code(&user.username, &secret)?;
        let otpauth_url = self.two_fa_service.generate_otpauth_url(&user.username, &secret);

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
            otpauth_url,
            backup_codes,
            enabled: true,
        })
    }

    /// Verify 2FA code during login
    pub async fn verify_two_fa(&mut self, request: TwoFAVerifyRequest) -> AuthResult<LoginResponse> {
        log::info!("=== 2FA Verification Debug ===");
        log::info!("Temp token: {}", request.temp_token);
        log::info!("TOTP code length: {}", request.totp_code.len());

        // Validate temp token format (should be "2FA_<username>_<uuid>")
        if !self.two_fa_service.validate_temp_token_with_username(&request.temp_token) {
            log::error!("Temp token validation failed");
            return Err(AuthError::InvalidToken);
        }

        // Extract username from temp token (format: "2FA||username||uuid")
        let parts: Vec<&str> = request.temp_token.split("||").collect();
        if parts.len() != 3 || parts[0] != "2FA" {
            log::error!("Temp token format invalid: parts count = {}", parts.len());
            return Err(AuthError::InvalidToken);
        }
        let username = parts[1];
        log::info!("Extracted username: {}", username);

        // Get user from database
        let user = self.get_user_by_username(username).await?;
        log::info!("User found: {}, 2FA enabled: {}", user.username, user.two_fa_enabled);

        // Verify user has 2FA enabled
        if !user.two_fa_enabled {
            log::error!("2FA not enabled for user: {}", user.username);
            return Err(AuthError::InternalError("2FA not enabled for this user".to_string()));
        }

        // Check if user has a secret
        if user.two_fa_secret.is_none() {
            log::error!("User {} has 2FA enabled but no secret stored", user.username);
            return Err(AuthError::InternalError("2FA secret missing".to_string()));
        }

        let secret = user.two_fa_secret.as_ref().unwrap();
        log::info!("Secret length: {}, starts with: {}...", secret.len(), &secret[..secret.len().min(4)]);

        // Verify the TOTP code
        let is_valid = if request.totp_code.len() == 6 && request.totp_code.chars().all(|c| c.is_ascii_digit()) {
            log::info!("Attempting TOTP verification with 6-digit code");
            // Verify TOTP code
            match self.two_fa_service.verify_totp(secret, &request.totp_code) {
                Ok(valid) => {
                    log::info!("TOTP verification result: {}", valid);
                    valid
                }
                Err(e) => {
                    log::error!("TOTP verification error: {:?}", e);
                    return Err(e);
                }
            }
        } else if request.totp_code.len() == 8 && request.totp_code.chars().all(|c| c.is_ascii_alphanumeric()) {
            log::info!("Attempting backup code verification");
            // Verify backup code
            if let Some(ref backup_codes) = user.two_fa_backup_codes {
                let (is_valid, updated_codes) = self.two_fa_service.verify_backup_code(backup_codes, &request.totp_code)?;
                if is_valid {
                    log::info!("Backup code valid, updating codes in database");
                    // Update backup codes in database (remove used code)
                    self.update_user_backup_codes(&user.id, &updated_codes).await?;
                }
                is_valid
            } else {
                log::warn!("User has no backup codes");
                false
            }
        } else {
            log::warn!("Invalid code format - length: {}, is_digit: {}",
                request.totp_code.len(),
                request.totp_code.chars().all(|c| c.is_ascii_digit())
            );
            false
        };

        if !is_valid {
            log::warn!("2FA verification failed - invalid code");
            return Err(AuthError::InvalidCredentials);
        }

        log::info!("2FA verification successful, proceeding with login");

        // 2FA verified, complete login
        let session_id = TokenService::generate_session_id();

        // Create a dummy login request for complete_login
        let dummy_request = LoginRequest {
            username: user.username.clone(),
            password: String::new(), // Not used in complete_login
            user_agent: None,
            ip_address: None,
            two_fa_code: Some(request.totp_code),
        };

        self.complete_login(user, session_id, "unknown", &dummy_request).await
    }

    /// Disable 2FA for user
    pub async fn disable_two_fa(&mut self, user_id: &str, request: TwoFADisableRequest) -> AuthResult<()> {
        let user = self.get_user_by_id(user_id).await?;
        
        // Verify password
        let password_valid = self.password_service.verify_password(&request.password, &user.password_hash).unwrap_or(false);
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::user::{LoginRequest, UserRole};
    use sqlx::SqlitePool;

    /// Helper: Create in-memory test database with migrations
    async fn setup_test_db() -> SqlitePool {
        let pool = SqlitePool::connect("sqlite::memory:")
            .await
            .expect("Failed to create in-memory database");

        // Run migrations
        sqlx::migrate!("./migrations")
            .run(&pool)
            .await
            .expect("Failed to run migrations");

        pool
    }

    /// Helper: Create test auth service with default configuration
    async fn create_test_auth_service(pool: SqlitePool) -> AuthService {
        let password_service = PasswordService::new();
        let security_config = crate::models::auth::SecurityConfig::default();
        let token_service = TokenService::new(security_config.clone());

        AuthService::new(pool, password_service, token_service, security_config)
    }

    /// Helper: Create test user in database
    async fn create_test_user(
        pool: &SqlitePool,
        username: &str,
        password_hash: &str,
        is_temporary: bool,
    ) -> Uuid {
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
            username,
            password_hash,
            "demo_government",
            is_temporary,
            now,
            now,
            0,
            false,
            false,
            Option::<String>::None,
            Option::<String>::None,
            Option::<chrono::DateTime<chrono::Utc>>::None
        )
        .execute(pool)
        .await
        .expect("Failed to create test user");

        user_id
    }

    #[tokio::test]
    async fn test_login_success_with_correct_credentials() {
        let pool = setup_test_db().await;
        let mut service = create_test_auth_service(pool.clone()).await;

        // Create test user with known password
        let password = "SecurePhrase@2025!Valid";
        let password_hash = service.password_service.hash_password(password).unwrap();
        create_test_user(&pool, "test_user", &password_hash, false).await;

        // Attempt login
        let request = LoginRequest {
            username: "test_user".to_string(),
            password: password.to_string(),
            two_fa_code: None,
            user_agent: Some("Test Agent".to_string()),
            ip_address: None,
        };

        let result = service.authenticate(request, "127.0.0.1").await;
        assert!(result.is_ok());

        let response = result.unwrap();
        assert!(!response.token.is_empty());
        assert_eq!(response.user.username, "test_user");
        assert!(!response.requires_two_fa);
    }

    #[tokio::test]
    async fn test_login_invalid_credentials_wrong_password() {
        let pool = setup_test_db().await;
        let mut service = create_test_auth_service(pool.clone()).await;

        // Create test user with known password
        let password = "SecurePhrase@2025!Valid";
        let password_hash = service.password_service.hash_password(password).unwrap();
        create_test_user(&pool, "test_user", &password_hash, false).await;

        // Attempt login with wrong password
        let request = LoginRequest {
            username: "test_user".to_string(),
            password: "WrongPhrase@2025!Wrong".to_string(),
            two_fa_code: None,
            user_agent: Some("Test Agent".to_string()),
            ip_address: None,
        };

        let result = service.authenticate(request, "127.0.0.1").await;
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), AuthError::InvalidCredentials));
    }

    #[tokio::test]
    async fn test_login_invalid_credentials_nonexistent_user() {
        let pool = setup_test_db().await;
        let mut service = create_test_auth_service(pool.clone()).await;

        // Attempt login with non-existent user
        let request = LoginRequest {
            username: "nonexistent_user".to_string(),
            password: "AnyPhrase@2025!Any".to_string(),
            two_fa_code: None,
            user_agent: Some("Test Agent".to_string()),
            ip_address: None,
        };

        let result = service.authenticate(request, "127.0.0.1").await;
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), AuthError::InvalidCredentials));
    }

    #[tokio::test]
    async fn test_account_lockout_after_failed_attempts() {
        let pool = setup_test_db().await;
        let mut service = create_test_auth_service(pool.clone()).await;

        // Get max attempts from config (default is 5)
        let max_attempts = service.security_config.rate_limit.max_attempts;

        // Create test user
        let password = "SecurePhrase@2025!Valid";
        let password_hash = service.password_service.hash_password(password).unwrap();
        let user_id = create_test_user(&pool, "test_user", &password_hash, false).await;

        // Attempt login with wrong password max_attempts times
        for _i in 0..max_attempts {
            let request = LoginRequest {
                username: "test_user".to_string(),
                password: "WrongPhrase@2025!Wrong".to_string(),
                two_fa_code: None,
                user_agent: Some("Test Agent".to_string()),
                ip_address: None,
            };

            let result = service.authenticate(request, "127.0.0.1").await;
            assert!(result.is_err());

            // After max_attempts, the error should be InvalidCredentials
            // (Account is locked, but still returns InvalidCredentials for security)
            assert!(matches!(result.unwrap_err(), AuthError::InvalidCredentials));
        }

        // Verify user is now locked
        let user = service.get_user_by_id(user_id).await.unwrap();
        assert!(user.is_locked);
        assert!(user.lockout_expiry.is_some());
        assert!(user.login_attempts >= max_attempts as i32);

        // Attempt login with correct password should still fail
        // Note: This will fail with TooManyAttempts (rate limiting) before checking account lockout
        // since both are triggered after max_attempts (5) and rate limiting is checked first
        let request = LoginRequest {
            username: "test_user".to_string(),
            password: password.to_string(),
            two_fa_code: None,
            user_agent: Some("Test Agent".to_string()),
            ip_address: None,
        };

        let result = service.authenticate(request, "127.0.0.1").await;
        assert!(result.is_err());
        // Rate limiting check happens before account lockout check, so we get TooManyAttempts
        match result.unwrap_err() {
            AuthError::TooManyAttempts | AuthError::AccountLocked => {}, // Both are acceptable
            other => panic!("Expected TooManyAttempts or AccountLocked, got: {:?}", other),
        }
    }

    #[tokio::test]
    async fn test_failed_login_increments_attempt_counter() {
        let pool = setup_test_db().await;
        let mut service = create_test_auth_service(pool.clone()).await;

        // Create test user
        let password = "SecurePhrase@2025!Valid";
        let password_hash = service.password_service.hash_password(password).unwrap();
        let user_id = create_test_user(&pool, "test_user", &password_hash, false).await;

        // Verify initial login_attempts is 0
        let user = service.get_user_by_id(user_id).await.unwrap();
        assert_eq!(user.login_attempts, 0);

        // Attempt login with wrong password
        let request = LoginRequest {
            username: "test_user".to_string(),
            password: "WrongPhrase@2025!Wrong".to_string(),
            two_fa_code: None,
            user_agent: Some("Test Agent".to_string()),
            ip_address: None,
        };

        let _ = service.authenticate(request, "127.0.0.1").await;

        // Verify login_attempts incremented
        let user = service.get_user_by_id(user_id).await.unwrap();
        assert_eq!(user.login_attempts, 1);
    }

    #[tokio::test]
    async fn test_successful_login_resets_attempt_counter() {
        let pool = setup_test_db().await;
        let mut service = create_test_auth_service(pool.clone()).await;

        // Create test user
        let password = "SecurePhrase@2025!Valid";
        let password_hash = service.password_service.hash_password(password).unwrap();
        let user_id = create_test_user(&pool, "test_user", &password_hash, false).await;

        // Simulate 2 failed login attempts
        for _ in 0..2 {
            let request = LoginRequest {
                username: "test_user".to_string(),
                password: "WrongPhrase@2025!Wrong".to_string(),
                two_fa_code: None,
                user_agent: Some("Test Agent".to_string()),
                ip_address: None,
            };
            let _ = service.authenticate(request, "127.0.0.1").await;
        }

        // Verify login_attempts is 2
        let user = service.get_user_by_id(user_id).await.unwrap();
        assert_eq!(user.login_attempts, 2);

        // Successful login
        let request = LoginRequest {
            username: "test_user".to_string(),
            password: password.to_string(),
            two_fa_code: None,
            user_agent: Some("Test Agent".to_string()),
            ip_address: None,
        };

        let result = service.authenticate(request, "127.0.0.1").await;
        assert!(result.is_ok());

        // Verify login_attempts reset to 0
        let user = service.get_user_by_id(user_id).await.unwrap();
        assert_eq!(user.login_attempts, 0);
        assert!(!user.is_locked);
        assert!(user.lockout_expiry.is_none());
    }

    #[tokio::test]
    async fn test_password_change_success() {
        let pool = setup_test_db().await;
        let mut service = create_test_auth_service(pool.clone()).await;

        // Create test user with known password
        let current_password = "CurrentPhrase@2025!Old";
        let password_hash = service.password_service.hash_password(current_password).unwrap();
        let user_id = create_test_user(&pool, "test_user", &password_hash, false).await;

        // Change password
        let request = ChangePasswordRequest {
            current_password: current_password.to_string(),
            new_password: "NewPhrase@2025!Changed".to_string(),
            confirm_password: "NewPhrase@2025!Changed".to_string(),
        };

        let result = service.change_password(user_id, request).await;
        assert!(result.is_ok());

        // Verify new password works
        let user = service.get_user_by_id(user_id).await.unwrap();
        assert!(service.password_service.verify_password("NewPhrase@2025!Changed", &user.password_hash).unwrap());
        assert!(!user.is_temporary_password); // Should be set to false after password change
    }

    #[tokio::test]
    async fn test_password_change_wrong_current_password() {
        let pool = setup_test_db().await;
        let mut service = create_test_auth_service(pool.clone()).await;

        // Create test user
        let current_password = "CurrentPhrase@2025!Old";
        let password_hash = service.password_service.hash_password(current_password).unwrap();
        let user_id = create_test_user(&pool, "test_user", &password_hash, false).await;

        // Attempt password change with wrong current password
        let request = ChangePasswordRequest {
            current_password: "WrongPhrase@2025!Wrong".to_string(),
            new_password: "NewPhrase@2025!Changed".to_string(),
            confirm_password: "NewPhrase@2025!Changed".to_string(),
        };

        let result = service.change_password(user_id, request).await;
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), AuthError::InvalidCredentials));
    }

    #[tokio::test]
    async fn test_password_change_mismatch_confirmation() {
        let pool = setup_test_db().await;
        let mut service = create_test_auth_service(pool.clone()).await;

        // Create test user
        let current_password = "CurrentPhrase@2025!Old";
        let password_hash = service.password_service.hash_password(current_password).unwrap();
        let user_id = create_test_user(&pool, "test_user", &password_hash, false).await;

        // Attempt password change with mismatched confirmation
        let request = ChangePasswordRequest {
            current_password: current_password.to_string(),
            new_password: "NewPhrase@2025!Changed".to_string(),
            confirm_password: "DifferentPhrase@2025!Wrong".to_string(),
        };

        let result = service.change_password(user_id, request).await;
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), AuthError::PasswordMismatch));
    }

    #[tokio::test]
    async fn test_password_change_weak_password() {
        let pool = setup_test_db().await;
        let mut service = create_test_auth_service(pool.clone()).await;

        // Create test user
        let current_password = "CurrentPhrase@2025!Old";
        let password_hash = service.password_service.hash_password(current_password).unwrap();
        let user_id = create_test_user(&pool, "test_user", &password_hash, false).await;

        // Attempt password change with weak password (too short, no special chars)
        let request = ChangePasswordRequest {
            current_password: current_password.to_string(),
            new_password: "weak".to_string(),
            confirm_password: "weak".to_string(),
        };

        let result = service.change_password(user_id, request).await;
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), AuthError::PasswordTooWeak));
    }

    #[tokio::test]
    async fn test_password_change_same_as_current() {
        let pool = setup_test_db().await;
        let mut service = create_test_auth_service(pool.clone()).await;

        // Create test user
        let current_password = "CurrentPhrase@2025!Old";
        let password_hash = service.password_service.hash_password(current_password).unwrap();
        let user_id = create_test_user(&pool, "test_user", &password_hash, false).await;

        // Attempt password change with same password as current
        let request = ChangePasswordRequest {
            current_password: current_password.to_string(),
            new_password: current_password.to_string(),
            confirm_password: current_password.to_string(),
        };

        let result = service.change_password(user_id, request).await;
        assert!(result.is_err());
        match result.unwrap_err() {
            AuthError::InternalError(msg) => {
                assert!(msg.contains("must be different from current password"));
            }
            _ => panic!("Expected InternalError"),
        }
    }

    #[tokio::test]
    async fn test_temporary_password_flag() {
        let pool = setup_test_db().await;
        let mut service = create_test_auth_service(pool.clone()).await;

        // Create test user with temporary password
        let password = "TempPhrase@2025!Temp";
        let password_hash = service.password_service.hash_password(password).unwrap();
        let user_id = create_test_user(&pool, "test_user", &password_hash, true).await;

        // Login with temporary password
        let request = LoginRequest {
            username: "test_user".to_string(),
            password: password.to_string(),
            two_fa_code: None,
            user_agent: Some("Test Agent".to_string()),
            ip_address: None,
        };

        let result = service.authenticate(request, "127.0.0.1").await;
        assert!(result.is_ok());

        // Verify user has is_temporary_password flag
        let user = service.get_user_by_id(user_id).await.unwrap();
        assert!(user.is_temporary_password);

        // Change password
        let request = ChangePasswordRequest {
            current_password: password.to_string(),
            new_password: "NewPhrase@2025!Changed".to_string(),
            confirm_password: "NewPhrase@2025!Changed".to_string(),
        };

        let result = service.change_password(user_id, request).await;
        assert!(result.is_ok());

        // Verify is_temporary_password is now false
        let user = service.get_user_by_id(user_id).await.unwrap();
        assert!(!user.is_temporary_password);
    }

    #[tokio::test]
    async fn test_session_validation_success() {
        let pool = setup_test_db().await;
        let mut service = create_test_auth_service(pool.clone()).await;

        // Create test user
        let password = "SecurePhrase@2025!Valid";
        let password_hash = service.password_service.hash_password(password).unwrap();
        create_test_user(&pool, "test_user", &password_hash, false).await;

        // Login to get token
        let request = LoginRequest {
            username: "test_user".to_string(),
            password: password.to_string(),
            two_fa_code: None,
            user_agent: Some("Test Agent".to_string()),
            ip_address: None,
        };

        let login_response = service.authenticate(request, "127.0.0.1").await.unwrap();
        let token = login_response.token;

        // Validate session
        let result = service.validate_session(&token).await;
        assert!(result.is_ok());

        let user_response = result.unwrap();
        assert_eq!(user_response.username, "test_user");
    }

    #[tokio::test]
    async fn test_session_validation_invalid_token() {
        let pool = setup_test_db().await;
        let service = create_test_auth_service(pool.clone()).await;

        // Attempt to validate invalid token
        let result = service.validate_session("invalid_token").await;
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), AuthError::InvalidToken));
    }

    #[tokio::test]
    async fn test_logout_clears_session() {
        let pool = setup_test_db().await;
        let mut service = create_test_auth_service(pool.clone()).await;

        // Create test user
        let password = "SecurePhrase@2025!Valid";
        let password_hash = service.password_service.hash_password(password).unwrap();
        create_test_user(&pool, "test_user", &password_hash, false).await;

        // Login to create session
        let request = LoginRequest {
            username: "test_user".to_string(),
            password: password.to_string(),
            two_fa_code: None,
            user_agent: Some("Test Agent".to_string()),
            ip_address: None,
        };

        let login_response = service.authenticate(request, "127.0.0.1").await.unwrap();
        let user_id = Uuid::parse_str(&login_response.user.id).unwrap();
        let token = login_response.token.clone();

        // Verify session exists
        let user = service.get_user_by_id(user_id).await.unwrap();
        assert!(user.session_token.is_some());

        // Logout
        let result = service.logout(user_id, Some(&token)).await;
        assert!(result.is_ok());

        // Verify session cleared
        let user = service.get_user_by_id(user_id).await.unwrap();
        assert!(user.session_token.is_none());
        assert!(user.session_expires_at.is_none());
    }

    #[tokio::test]
    async fn test_logout_blacklists_token() {
        let pool = setup_test_db().await;
        let mut service = create_test_auth_service(pool.clone()).await;

        // Create test user
        let password = "SecurePhrase@2025!Valid";
        let password_hash = service.password_service.hash_password(password).unwrap();
        create_test_user(&pool, "test_user", &password_hash, false).await;

        // Login
        let request = LoginRequest {
            username: "test_user".to_string(),
            password: password.to_string(),
            two_fa_code: None,
            user_agent: Some("Test Agent".to_string()),
            ip_address: None,
        };

        let login_response = service.authenticate(request, "127.0.0.1").await.unwrap();
        let user_id = Uuid::parse_str(&login_response.user.id).unwrap();
        let token = login_response.token.clone();

        // Token should work before logout
        let result = service.validate_session(&token).await;
        assert!(result.is_ok());

        // Logout with token
        let result = service.logout(user_id, Some(&token)).await;
        assert!(result.is_ok());

        // Token should be blacklisted and fail validation
        let result = service.validate_session(&token).await;
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), AuthError::InvalidToken));
    }

    #[tokio::test]
    async fn test_rate_limiting_ip_based() {
        let pool = setup_test_db().await;
        let mut service = create_test_auth_service(pool.clone()).await;

        // Get max attempts from config (default is 5)
        let max_attempts = service.security_config.rate_limit.max_attempts;

        // Create test user (but we won't use correct password)
        let password_hash = service.password_service.hash_password("DummyPhrase@2025!Dummy").unwrap();
        create_test_user(&pool, "test_user", &password_hash, false).await;

        // Make (max_attempts - 2) failed login attempts from the first IP
        // This will trigger IP-based rate limiting without triggering account lockout
        for _i in 0..(max_attempts - 2) {
            let request = LoginRequest {
                username: "test_user".to_string(),
                password: "WrongPhrase@2025!Wrong".to_string(),
                two_fa_code: None,
                user_agent: Some("Test Agent".to_string()),
                ip_address: None,
            };

            let _ = service.authenticate(request, "192.168.1.100").await;
        }

        // Make 2 more attempts from the same IP to exceed rate limit
        for _i in 0..2 {
            let request = LoginRequest {
                username: "test_user".to_string(),
                password: "WrongPhrase@2025!Wrong".to_string(),
                two_fa_code: None,
                user_agent: Some("Test Agent".to_string()),
                ip_address: None,
            };

            let _ = service.authenticate(request, "192.168.1.100").await;
        }

        // Next attempt from same IP should fail with TooManyAttempts (rate limited)
        let request = LoginRequest {
            username: "test_user".to_string(),
            password: "WrongPhrase@2025!Wrong".to_string(),
            two_fa_code: None,
            user_agent: Some("Test Agent".to_string()),
            ip_address: None,
        };

        let result = service.authenticate(request, "192.168.1.100").await;
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), AuthError::TooManyAttempts));

        // Attempt from different IP should still work (rate limit is per IP, not per user)
        // But user account may also be locked if we hit max_attempts
        let request = LoginRequest {
            username: "test_user".to_string(),
            password: "WrongPhrase@2025!Wrong".to_string(),
            two_fa_code: None,
            user_agent: Some("Test Agent".to_string()),
            ip_address: None,
        };

        let result = service.authenticate(request, "192.168.1.200").await;
        assert!(result.is_err());
        // Could be InvalidCredentials (password wrong) or AccountLocked (user locked after max attempts)
        match result.unwrap_err() {
            AuthError::InvalidCredentials | AuthError::AccountLocked => {}, // Both acceptable
            AuthError::TooManyAttempts => panic!("Should not be rate-limited for different IP"),
            other => panic!("Unexpected error: {:?}", other),
        }
    }

    #[tokio::test]
    async fn test_initialize_default_user() {
        let pool = setup_test_db().await;
        let service = create_test_auth_service(pool.clone()).await;

        // Verify no users exist initially
        let user_count: i32 = sqlx::query_scalar!("SELECT COUNT(*) as count FROM users")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(user_count, 0);

        // Initialize default user
        let result = service.initialize_default_user().await;
        assert!(result.is_ok());

        // Verify user was created
        let user_count: i32 = sqlx::query_scalar!("SELECT COUNT(*) as count FROM users")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(user_count, 1);

        // Verify user has correct properties
        let user: User = sqlx::query_as("SELECT * FROM users WHERE username = ?")
            .bind("demo_government")
            .fetch_one(&pool)
            .await
            .unwrap();

        assert_eq!(user.username, "demo_government");
        assert_eq!(user.role, UserRole::DemoGovernment);
        assert!(user.is_temporary_password);
    }

    #[tokio::test]
    async fn test_initialize_default_user_idempotent() {
        let pool = setup_test_db().await;
        let service = create_test_auth_service(pool.clone()).await;

        // Initialize default user twice
        service.initialize_default_user().await.unwrap();
        service.initialize_default_user().await.unwrap();

        // Verify only one user exists
        let user_count: i32 = sqlx::query_scalar!("SELECT COUNT(*) as count FROM users")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(user_count, 1);
    }
}
