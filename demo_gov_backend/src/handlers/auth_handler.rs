use actix_web::{web, HttpRequest, HttpResponse, Result};
use serde_json::json;
use std::sync::Mutex;
use uuid::Uuid;

use crate::models::auth::AuthError;
use crate::models::user::{ChangePasswordRequest, LoginRequest, TwoFASetupRequest, TwoFAVerifyRequest, TwoFADisableRequest, PasswordStrengthRequest, PasswordStrengthResponse};
use crate::services::auth_service::AuthService;
use crate::services::password_service::PasswordService;

/// Application state containing shared services
pub struct AppState {
    pub auth_service: Mutex<AuthService>,
}

/// Extract IP address from request
fn get_client_ip(req: &HttpRequest) -> String {
    // Check X-Forwarded-For header first (for proxy/load balancer setups)
    if let Some(forwarded_for) = req.headers().get("X-Forwarded-For") {
        if let Ok(forwarded_str) = forwarded_for.to_str() {
            return forwarded_str.split(',').next().unwrap_or("unknown").trim().to_string();
        }
    }

    // Check X-Real-IP header
    if let Some(real_ip) = req.headers().get("X-Real-IP") {
        if let Ok(real_ip_str) = real_ip.to_str() {
            return real_ip_str.to_string();
        }
    }

    // Fallback to connection info
    req.connection_info()
        .peer_addr()
        .unwrap_or("unknown")
        .to_string()
}

/// Extract user agent from request
fn get_user_agent(req: &HttpRequest) -> Option<String> {
    req.headers()
        .get("User-Agent")
        .and_then(|ua| ua.to_str().ok())
        .map(|s| s.to_string())
}

/// Extract JWT token from Authorization header
fn extract_token(req: &HttpRequest) -> Result<String, AuthError> {
    let auth_header = req.headers()
        .get("Authorization")
        .ok_or(AuthError::Unauthorized)?
        .to_str()
        .map_err(|_| AuthError::InvalidToken)?;

    if !auth_header.starts_with("Bearer ") {
        return Err(AuthError::InvalidToken);
    }

    Ok(auth_header.trim_start_matches("Bearer ").to_string())
}

/// Login endpoint
pub async fn login(
    req: HttpRequest,
    login_request: web::Json<LoginRequest>,
    data: web::Data<AppState>,
) -> Result<HttpResponse> {
    let ip_address = get_client_ip(&req);
    let user_agent = get_user_agent(&req);

    log::info!(
        "Login attempt for user: {} from IP: {}",
        login_request.username,
        ip_address
    );
    log::debug!("Login request - password length: {}", login_request.password.len());

    // Create a modified login request with client info
    let mut login_req = login_request.into_inner();
    login_req.ip_address = Some(ip_address.clone());
    login_req.user_agent = user_agent;

    // Authenticate user
    match data.auth_service.lock() {
        Ok(mut auth_service) => {
            match auth_service.authenticate(login_req, &ip_address).await {
                Ok(login_response) => {
                    log::info!(
                        "Successful login for user: {} from IP: {}",
                        login_response.user.username,
                        ip_address
                    );

                    Ok(HttpResponse::Ok().json(json!({
                        "success": true,
                        "message": "Login successful",
                        "data": login_response
                    })))
                }
                Err(auth_error) => {
                    log::warn!(
                        "Failed login attempt from IP: {} - Error: {}",
                        ip_address,
                        auth_error
                    );

                    let (status_code, message) = match auth_error {
                        AuthError::InvalidCredentials => (401, "Invalid username or password"),
                        AuthError::AccountLocked => (423, "Account is temporarily locked due to too many failed attempts"),
                        AuthError::TooManyAttempts => (429, "Too many login attempts. Please try again later"),
                        _ => (500, "Internal server error"),
                    };

                    Ok(HttpResponse::build(actix_web::http::StatusCode::from_u16(status_code).unwrap())
                        .json(json!({
                            "success": false,
                            "message": message,
                            "error_type": format!("{:?}", auth_error)
                        })))
                }
            }
        }
        Err(_) => {
            log::error!("Failed to acquire auth service lock");
            Ok(HttpResponse::InternalServerError().json(json!({
                "success": false,
                "message": "Internal server error"
            })))
        }
    }
}

/// Change password endpoint
pub async fn change_password(
    req: HttpRequest,
    password_request: web::Json<ChangePasswordRequest>,
    data: web::Data<AppState>,
) -> Result<HttpResponse> {
    let ip_address = get_client_ip(&req);
    log::debug!("Password change request received from IP: {}", ip_address);
    log::debug!("Request data - current_password length: {}", password_request.current_password.len());
    log::debug!("Request data - new_password length: {}", password_request.new_password.len());

    // Extract and validate token
    let token = match extract_token(&req) {
        Ok(token) => token,
        Err(_) => {
            return Ok(HttpResponse::Unauthorized().json(json!({
                "success": false,
                "message": "Authorization token required"
            })));
        }
    };

    // Validate session and get user ID
    let user_id = match data.auth_service.lock() {
        Ok(auth_service) => {
            match auth_service.validate_session(&token).await {
                Ok(user_response) => {
                    match Uuid::parse_str(&user_response.id) {
                        Ok(id) => id,
                        Err(_) => {
                            return Ok(HttpResponse::InternalServerError().json(json!({
                                "success": false,
                                "message": "Invalid user ID format"
                            })));
                        }
                    }
                }
                Err(auth_error) => {
                    let (status_code, message) = match auth_error {
                        AuthError::TokenExpired => (401, "Token has expired"),
                        AuthError::SessionExpired => (401, "Session has expired"),
                        AuthError::InvalidToken => (401, "Invalid token"),
                        _ => (500, "Internal server error"),
                    };

                    return Ok(HttpResponse::build(actix_web::http::StatusCode::from_u16(status_code).unwrap())
                        .json(json!({
                            "success": false,
                            "message": message
                        })));
                }
            }
        }
        Err(_) => {
            return Ok(HttpResponse::InternalServerError().json(json!({
                "success": false,
                "message": "Internal server error"
            })));
        }
    };

    log::info!("Password change request for user ID: {} from IP: {}", user_id, ip_address);

    // Change password
    match data.auth_service.lock() {
        Ok(mut auth_service) => {
            match auth_service.change_password(user_id, password_request.into_inner()).await {
                Ok(_) => {
                    log::info!("Password changed successfully for user ID: {}", user_id);

                    Ok(HttpResponse::Ok().json(json!({
                        "success": true,
                        "message": "Password changed successfully"
                    })))
                }
                Err(auth_error) => {
                    log::warn!("Failed password change for user ID: {} - Error: {}", user_id, auth_error);

                    let (status_code, message) = match &auth_error {
                        AuthError::InvalidCredentials => (400, "Current password is incorrect"),
                        AuthError::PasswordMismatch => (400, "New passwords do not match"),
                        AuthError::PasswordTooWeak => (400, "Password does not meet security requirements"),
                        AuthError::InternalError(msg) if msg.contains("same password") => {
                            (400, "New password must be different from your current password")
                        }
                        _ => (500, "Internal server error"),
                    };

                    Ok(HttpResponse::build(actix_web::http::StatusCode::from_u16(status_code).unwrap())
                        .json(json!({
                            "success": false,
                            "message": message
                        })))
                }
            }
        }
        Err(_) => {
            Ok(HttpResponse::InternalServerError().json(json!({
                "success": false,
                "message": "Internal server error"
            })))
        }
    }
}

/// Verify token endpoint
pub async fn verify_token(
    req: HttpRequest,
    data: web::Data<AppState>,
) -> Result<HttpResponse> {
    // Extract token
    let token = match extract_token(&req) {
        Ok(token) => token,
        Err(_) => {
            return Ok(HttpResponse::Unauthorized().json(json!({
                "success": false,
                "message": "Authorization token required"
            })));
        }
    };

    // Validate session
    match data.auth_service.lock() {
        Ok(auth_service) => {
            match auth_service.validate_session(&token).await {
                Ok(user_response) => {
                    Ok(HttpResponse::Ok().json(json!({
                        "success": true,
                        "message": "Token is valid",
                        "data": {
                            "user": user_response,
                            "expires_in": 28800  // 8 hours in seconds (same as login)
                        }
                    })))
                }
                Err(auth_error) => {
                    let (status_code, message) = match auth_error {
                        AuthError::TokenExpired => (401, "Token has expired"),
                        AuthError::SessionExpired => (401, "Session has expired"),
                        AuthError::InvalidToken => (401, "Invalid token"),
                        _ => (500, "Internal server error"),
                    };

                    Ok(HttpResponse::build(actix_web::http::StatusCode::from_u16(status_code).unwrap())
                        .json(json!({
                            "success": false,
                            "message": message
                        })))
                }
            }
        }
        Err(_) => {
            Ok(HttpResponse::InternalServerError().json(json!({
                "success": false,
                "message": "Internal server error"
            })))
        }
    }
}

/// Logout endpoint
pub async fn logout(
    req: HttpRequest,
    data: web::Data<AppState>,
) -> Result<HttpResponse> {
    let ip_address = get_client_ip(&req);

    // Extract token
    let token = match extract_token(&req) {
        Ok(token) => token,
        Err(_) => {
            return Ok(HttpResponse::Unauthorized().json(json!({
                "success": false,
                "message": "Authorization token required"
            })));
        }
    };

    // Get user ID from token and logout
    match data.auth_service.lock() {
        Ok(mut auth_service) => {
            match auth_service.validate_session(&token).await {
                Ok(user_response) => {
                    if let Ok(user_id) = Uuid::parse_str(&user_response.id) {
                        // Pass the token to blacklist it during logout
                        match auth_service.logout(user_id, Some(&token)).await {
                            Ok(_) => {
                                log::info!("User {} logged out from IP: {}", user_response.username, ip_address);

                                Ok(HttpResponse::Ok().json(json!({
                                    "success": true,
                                    "message": "Logged out successfully"
                                })))
                            }
                            Err(_) => {
                                Ok(HttpResponse::InternalServerError().json(json!({
                                    "success": false,
                                    "message": "Failed to logout"
                                })))
                            }
                        }
                    } else {
                        Ok(HttpResponse::BadRequest().json(json!({
                            "success": false,
                            "message": "Invalid user ID"
                        })))
                    }
                }
                Err(_) => {
                    // Even if token validation fails, consider logout successful
                    Ok(HttpResponse::Ok().json(json!({
                        "success": true,
                        "message": "Logged out successfully"
                    })))
                }
            }
        }
        Err(_) => {
            Ok(HttpResponse::InternalServerError().json(json!({
                "success": false,
                "message": "Internal server error"
            })))
        }
    }
}

/// Prepare 2FA setup endpoint - generates QR code and secret
pub async fn prepare_two_fa_setup(
    req: HttpRequest,
    data: web::Data<AppState>,
) -> Result<HttpResponse> {
    let _ip_address = get_client_ip(&req);
    
    // Extract and validate token
    let token = match extract_token(&req) {
        Ok(token) => token,
        Err(_) => {
            return Ok(HttpResponse::Unauthorized().json(json!({
                "success": false,
                "message": "Authorization token required"
            })));
        }
    };

    // Validate session and get user ID
    let user_id = match data.auth_service.lock() {
        Ok(auth_service) => {
            match auth_service.validate_session(&token).await {
                Ok(user_response) => {
                    match Uuid::parse_str(&user_response.id) {
                        Ok(id) => id,
                        Err(_) => {
                            return Ok(HttpResponse::InternalServerError().json(json!({
                                "success": false,
                                "message": "Invalid user ID format"
                            })));
                        }
                    }
                }
                Err(auth_error) => {
                    let (status_code, message) = match auth_error {
                        AuthError::TokenExpired => (401, "Token has expired"),
                        AuthError::SessionExpired => (401, "Session has expired"),
                        AuthError::InvalidToken => (401, "Invalid token"),
                        _ => (500, "Internal server error"),
                    };

                    return Ok(HttpResponse::build(actix_web::http::StatusCode::from_u16(status_code).unwrap())
                        .json(json!({
                            "success": false,
                            "message": message
                        })));
                }
            }
        }
        Err(_) => {
            return Ok(HttpResponse::InternalServerError().json(json!({
                "success": false,
                "message": "Internal server error"
            })));
        }
    };

    // Prepare 2FA setup
    match data.auth_service.lock() {
        Ok(mut auth_service) => {
            match auth_service.prepare_two_fa_setup(user_id).await {
                Ok(setup_response) => {
                    log::info!("2FA preparation successful for user ID: {}", user_id);

                    Ok(HttpResponse::Ok().json(json!({
                        "success": true,
                        "message": "2FA preparation successful",
                        "data": setup_response
                    })))
                }
                Err(auth_error) => {
                    log::warn!("Failed 2FA preparation for user ID: {} - Error: {}", user_id, auth_error);

                    Ok(HttpResponse::InternalServerError().json(json!({
                        "success": false,
                        "message": "Internal server error"
                    })))
                }
            }
        }
        Err(_) => {
            Ok(HttpResponse::InternalServerError().json(json!({
                "success": false,
                "message": "Internal server error"
            })))
        }
    }
}

/// Setup 2FA endpoint
pub async fn setup_two_fa(
    req: HttpRequest,
    setup_request: web::Json<TwoFASetupRequest>,
    data: web::Data<AppState>,
) -> Result<HttpResponse> {
    let ip_address = get_client_ip(&req);
    
    // Extract and validate token
    let token = match extract_token(&req) {
        Ok(token) => token,
        Err(_) => {
            return Ok(HttpResponse::Unauthorized().json(json!({
                "success": false,
                "message": "Authorization token required"
            })));
        }
    };

    // Validate session and get user ID
    let user_id = match data.auth_service.lock() {
        Ok(auth_service) => {
            match auth_service.validate_session(&token).await {
                Ok(user_response) => {
                    match Uuid::parse_str(&user_response.id) {
                        Ok(id) => id,
                        Err(_) => {
                            return Ok(HttpResponse::InternalServerError().json(json!({
                                "success": false,
                                "message": "Invalid user ID format"
                            })));
                        }
                    }
                }
                Err(auth_error) => {
                    let (status_code, message) = match auth_error {
                        AuthError::TokenExpired => (401, "Token has expired"),
                        AuthError::SessionExpired => (401, "Session has expired"),
                        AuthError::InvalidToken => (401, "Invalid token"),
                        _ => (500, "Internal server error"),
                    };

                    return Ok(HttpResponse::build(actix_web::http::StatusCode::from_u16(status_code).unwrap())
                        .json(json!({
                            "success": false,
                            "message": message
                        })));
                }
            }
        }
        Err(_) => {
            return Ok(HttpResponse::InternalServerError().json(json!({
                "success": false,
                "message": "Internal server error"
            })));
        }
    };

    log::info!("2FA setup request for user ID: {} from IP: {}", user_id, ip_address);

    // Setup 2FA
    match data.auth_service.lock() {
        Ok(mut auth_service) => {
            match auth_service.setup_two_fa(user_id, setup_request.into_inner()).await {
                Ok(setup_response) => {
                    log::info!("2FA setup successful for user ID: {}", user_id);

                    Ok(HttpResponse::Ok().json(json!({
                        "success": true,
                        "message": "2FA setup successful",
                        "data": setup_response
                    })))
                }
                Err(auth_error) => {
                    log::warn!("Failed 2FA setup for user ID: {} - Error: {}", user_id, auth_error);

                    let (status_code, message) = match auth_error {
                        AuthError::InvalidCredentials => (400, "Invalid TOTP code"),
                        _ => (500, "Internal server error"),
                    };

                    Ok(HttpResponse::build(actix_web::http::StatusCode::from_u16(status_code).unwrap())
                        .json(json!({
                            "success": false,
                            "message": message
                        })))
                }
            }
        }
        Err(_) => {
            Ok(HttpResponse::InternalServerError().json(json!({
                "success": false,
                "message": "Internal server error"
            })))
        }
    }
}

/// Verify 2FA during login endpoint
pub async fn verify_two_fa(
    req: HttpRequest,
    verify_request: web::Json<TwoFAVerifyRequest>,
    data: web::Data<AppState>,
) -> Result<HttpResponse> {
    let ip_address = get_client_ip(&req);
    
    log::info!("2FA verification request from IP: {}", ip_address);

    // Verify 2FA
    match data.auth_service.lock() {
        Ok(mut auth_service) => {
            match auth_service.verify_two_fa(verify_request.into_inner()).await {
                Ok(login_response) => {
                    log::info!("2FA verification successful from IP: {}", ip_address);

                    Ok(HttpResponse::Ok().json(json!({
                        "success": true,
                        "message": "2FA verification successful",
                        "data": login_response
                    })))
                }
                Err(auth_error) => {
                    log::warn!("Failed 2FA verification from IP: {} - Error: {}", ip_address, auth_error);

                    let (status_code, message) = match auth_error {
                        AuthError::InvalidCredentials => (400, "Invalid 2FA code"),
                        AuthError::InvalidToken => (400, "Invalid temporary token"),
                        _ => (500, "Internal server error"),
                    };

                    Ok(HttpResponse::build(actix_web::http::StatusCode::from_u16(status_code).unwrap())
                        .json(json!({
                            "success": false,
                            "message": message
                        })))
                }
            }
        }
        Err(_) => {
            Ok(HttpResponse::InternalServerError().json(json!({
                "success": false,
                "message": "Internal server error"
            })))
        }
    }
}

/// Disable 2FA endpoint
pub async fn disable_two_fa(
    req: HttpRequest,
    disable_request: web::Json<TwoFADisableRequest>,
    data: web::Data<AppState>,
) -> Result<HttpResponse> {
    let ip_address = get_client_ip(&req);
    
    // Extract and validate token
    let token = match extract_token(&req) {
        Ok(token) => token,
        Err(_) => {
            return Ok(HttpResponse::Unauthorized().json(json!({
                "success": false,
                "message": "Authorization token required"
            })));
        }
    };

    // Validate session and get user ID
    let user_id = match data.auth_service.lock() {
        Ok(auth_service) => {
            match auth_service.validate_session(&token).await {
                Ok(user_response) => {
                    match Uuid::parse_str(&user_response.id) {
                        Ok(id) => id,
                        Err(_) => {
                            return Ok(HttpResponse::InternalServerError().json(json!({
                                "success": false,
                                "message": "Invalid user ID format"
                            })));
                        }
                    }
                }
                Err(auth_error) => {
                    let (status_code, message) = match auth_error {
                        AuthError::TokenExpired => (401, "Token has expired"),
                        AuthError::SessionExpired => (401, "Session has expired"),
                        AuthError::InvalidToken => (401, "Invalid token"),
                        _ => (500, "Internal server error"),
                    };

                    return Ok(HttpResponse::build(actix_web::http::StatusCode::from_u16(status_code).unwrap())
                        .json(json!({
                            "success": false,
                            "message": message
                        })));
                }
            }
        }
        Err(_) => {
            return Ok(HttpResponse::InternalServerError().json(json!({
                "success": false,
                "message": "Internal server error"
            })));
        }
    };

    log::info!("2FA disable request for user ID: {} from IP: {}", user_id, ip_address);

    // Disable 2FA
    match data.auth_service.lock() {
        Ok(mut auth_service) => {
            match auth_service.disable_two_fa(user_id, disable_request.into_inner()).await {
                Ok(_) => {
                    log::info!("2FA disabled successfully for user ID: {}", user_id);

                    Ok(HttpResponse::Ok().json(json!({
                        "success": true,
                        "message": "2FA disabled successfully"
                    })))
                }
                Err(auth_error) => {
                    log::warn!("Failed to disable 2FA for user ID: {} - Error: {}", user_id, auth_error);

                    let (status_code, message) = match auth_error {
                        AuthError::InvalidCredentials => (400, "Invalid password or 2FA code"),
                        _ => (500, "Internal server error"),
                    };

                    Ok(HttpResponse::build(actix_web::http::StatusCode::from_u16(status_code).unwrap())
                        .json(json!({
                            "success": false,
                            "message": message
                        })))
                }
            }
        }
        Err(_) => {
            Ok(HttpResponse::InternalServerError().json(json!({
                "success": false,
                "message": "Internal server error"
            })))
        }
    }
}

/// Password strength check endpoint
/// POST /api/auth/password-strength
/// Provides real-time feedback on password strength without requiring authentication
pub async fn check_password_strength(
    password_request: web::Json<PasswordStrengthRequest>,
) -> Result<HttpResponse> {
    let password = &password_request.password;

    // Create password service for validation
    let password_service = PasswordService::new();

    // Calculate metrics
    let entropy = password_service.calculate_entropy(password);
    let is_common = password_service.is_common_password(password);
    let strength = password_service.rate_password_strength(password);

    // Attempt validation to get specific errors
    let validation_result = password_service.validate_password_strength(password);
    let is_valid = validation_result.is_ok();

    // Extract error messages if validation failed
    let errors = if let Err(AuthError::PasswordTooWeak) = validation_result {
        // Try to get detailed errors by re-running validation logic
        let mut error_messages = Vec::new();

        if password.len() < 12 {
            error_messages.push("Password must be at least 12 characters long".to_string());
        }
        if !password.chars().any(|c| c.is_uppercase()) {
            error_messages.push("Password must contain at least one uppercase letter".to_string());
        }
        if !password.chars().any(|c| c.is_lowercase()) {
            error_messages.push("Password must contain at least one lowercase letter".to_string());
        }
        if !password.chars().any(|c| c.is_numeric()) {
            error_messages.push("Password must contain at least one number".to_string());
        }
        let special_chars = "!@#$%^&*()_+-=[]{}|;:,.<>?";
        if !password.chars().any(|c| special_chars.contains(c)) {
            error_messages.push("Password must contain at least one special character".to_string());
        }
        if is_common {
            error_messages.push("Password is too common and easily guessable".to_string());
        }
        if entropy < 40.0 {
            error_messages.push(format!("Password is too predictable (strength: {:.1} bits, required: 40.0 bits)", entropy));
        }

        error_messages
    } else {
        Vec::new()
    };

    // Generate helpful suggestions
    let mut suggestions = Vec::new();
    if password.len() < 16 {
        suggestions.push("Consider using a longer password (16+ characters) for better security".to_string());
    }
    if entropy < 60.0 {
        suggestions.push("Mix uppercase, lowercase, numbers, and special characters".to_string());
    }
    if is_common {
        suggestions.push("Avoid common words and patterns".to_string());
    }
    if !suggestions.is_empty() && is_valid {
        suggestions.insert(0, "Your password is valid, but could be stronger:".to_string());
    }

    let response = PasswordStrengthResponse {
        is_valid,
        strength: format!("{}", strength),
        entropy_bits: entropy,
        is_common,
        errors,
        suggestions,
    };

    log::debug!("Password strength check: strength={}, entropy={:.1}, is_common={}, is_valid={}",
                strength, entropy, is_common, is_valid);

    Ok(HttpResponse::Ok().json(json!({
        "success": true,
        "data": response
    })))
}

/// Get current session information
/// GET /api/auth/session
/// Returns detailed session information including IP address, user agent, and expiration
/// CRITICAL: Used for session monitoring and security audits
pub async fn get_session(
    req: HttpRequest,
    data: web::Data<AppState>,
) -> Result<HttpResponse> {
    let ip_address = get_client_ip(&req);
    let user_agent = get_user_agent(&req);

    // Extract token
    let token = match extract_token(&req) {
        Ok(token) => token,
        Err(_) => {
            return Ok(HttpResponse::Unauthorized().json(json!({
                "success": false,
                "message": "Authorization token required"
            })));
        }
    };

    // Get detailed session information
    match data.auth_service.lock() {
        Ok(auth_service) => {
            match auth_service.get_session_info(&token, Some(ip_address.clone()), user_agent).await {
                Ok(session_info) => {
                    log::info!(
                        "Session info retrieved for user: {} from IP: {}",
                        session_info.username,
                        ip_address
                    );

                    Ok(HttpResponse::Ok().json(json!({
                        "success": true,
                        "message": "Session information retrieved",
                        "data": session_info
                    })))
                }
                Err(auth_error) => {
                    let (status_code, message) = match auth_error {
                        AuthError::TokenExpired => (401, "Token has expired"),
                        AuthError::SessionExpired => (401, "Session has expired"),
                        AuthError::InvalidToken => (401, "Invalid token"),
                        _ => (500, "Internal server error"),
                    };

                    Ok(HttpResponse::build(actix_web::http::StatusCode::from_u16(status_code).unwrap())
                        .json(json!({
                            "success": false,
                            "message": message
                        })))
                }
            }
        }
        Err(_) => {
            Ok(HttpResponse::InternalServerError().json(json!({
                "success": false,
                "message": "Internal server error"
            })))
        }
    }
}

/// Get audit logs for current user
/// GET /api/auth/audit-logs?limit=50
/// Returns security audit trail for the authenticated user
/// CRITICAL: Used for compliance, security monitoring, and user activity tracking
pub async fn get_audit_logs(
    req: HttpRequest,
    data: web::Data<AppState>,
) -> Result<HttpResponse> {
    let ip_address = get_client_ip(&req);

    // Extract token
    let token = match extract_token(&req) {
        Ok(token) => token,
        Err(_) => {
            return Ok(HttpResponse::Unauthorized().json(json!({
                "success": false,
                "message": "Authorization token required"
            })));
        }
    };

    // Validate session and get user ID
    let (user_id, username) = match data.auth_service.lock() {
        Ok(auth_service) => {
            match auth_service.validate_session(&token).await {
                Ok(user_response) => {
                    match uuid::Uuid::parse_str(&user_response.id) {
                        Ok(id) => (id, user_response.username),
                        Err(_) => {
                            return Ok(HttpResponse::InternalServerError().json(json!({
                                "success": false,
                                "message": "Invalid user ID format"
                            })));
                        }
                    }
                }
                Err(auth_error) => {
                    let (status_code, message) = match auth_error {
                        AuthError::TokenExpired => (401, "Token has expired"),
                        AuthError::SessionExpired => (401, "Session has expired"),
                        AuthError::InvalidToken => (401, "Invalid token"),
                        _ => (500, "Internal server error"),
                    };

                    return Ok(HttpResponse::build(actix_web::http::StatusCode::from_u16(status_code).unwrap())
                        .json(json!({
                            "success": false,
                            "message": message
                        })));
                }
            }
        }
        Err(_) => {
            return Ok(HttpResponse::InternalServerError().json(json!({
                "success": false,
                "message": "Internal server error"
            })));
        }
    };

    // Get limit from query parameter (default to 50)
    let limit = req
        .query_string()
        .split('&')
        .find(|param| param.starts_with("limit="))
        .and_then(|param| param.strip_prefix("limit="))
        .and_then(|val| val.parse::<i32>().ok())
        .unwrap_or(50)
        .min(100); // Cap at 100 for performance

    // Retrieve audit logs
    match data.auth_service.lock() {
        Ok(auth_service) => {
            match auth_service.get_audit_logs(user_id, limit).await {
                Ok(logs) => {
                    log::info!(
                        "Audit logs retrieved for user: {} from IP: {} (count: {})",
                        username,
                        ip_address,
                        logs.len()
                    );

                    Ok(HttpResponse::Ok().json(json!({
                        "success": true,
                        "message": "Audit logs retrieved",
                        "data": {
                            "logs": logs,
                            "count": logs.len(),
                            "limit": limit
                        }
                    })))
                }
                Err(auth_error) => {
                    log::error!("Failed to retrieve audit logs: {}", auth_error);
                    Ok(HttpResponse::InternalServerError().json(json!({
                        "success": false,
                        "message": "Failed to retrieve audit logs"
                    })))
                }
            }
        }
        Err(_) => {
            Ok(HttpResponse::InternalServerError().json(json!({
                "success": false,
                "message": "Internal server error"
            })))
        }
    }
}

/// GET /api/auth/security-dashboard
/// Security monitoring dashboard for administrators
/// CRITICAL: Provides overview of security metrics and recent threats
pub async fn get_security_dashboard(
    req: HttpRequest,
    data: web::Data<AppState>,
) -> Result<HttpResponse> {
    let ip_address = get_client_ip(&req);

    // Extract token
    let token = match extract_token(&req) {
        Ok(token) => token,
        Err(_) => {
            return Ok(HttpResponse::Unauthorized().json(json!({
                "success": false,
                "message": "Authorization token required"
            })));
        }
    };

    // Validate session
    match data.auth_service.lock() {
        Ok(auth_service) => {
            // Validate user session
            match auth_service.validate_session(&token).await {
                Ok(user_response) => {
                    log::info!(
                        "Security dashboard accessed by user: {} from IP: {}",
                        user_response.username,
                        ip_address
                    );

                    // Get security metrics
                    let failed_login_count = auth_service.get_failed_login_count().await
                        .unwrap_or(0);

                    let recent_events = auth_service.get_recent_audit_logs(20).await
                        .unwrap_or_default();

                    Ok(HttpResponse::Ok().json(json!({
                        "success": true,
                        "data": {
                            "failed_login_count_24h": failed_login_count,
                            "recent_security_events": recent_events,
                            "timestamp": chrono::Utc::now().to_rfc3339()
                        }
                    })))
                }
                Err(auth_error) => {
                    let (status_code, message) = match auth_error {
                        AuthError::TokenExpired => (401, "Token has expired"),
                        AuthError::SessionExpired => (401, "Session has expired"),
                        AuthError::InvalidToken => (401, "Invalid token"),
                        _ => (500, "Internal server error"),
                    };

                    Ok(HttpResponse::build(actix_web::http::StatusCode::from_u16(status_code).unwrap())
                        .json(json!({
                            "success": false,
                            "message": message
                        })))
                }
            }
        }
        Err(_) => {
            Ok(HttpResponse::InternalServerError().json(json!({
                "success": false,
                "message": "Internal server error"
            })))
        }
    }
}

/// Health check endpoint
/// Root endpoint handler - prevents 404 flooding from browser extensions
pub async fn root_handler() -> Result<HttpResponse> {
    Ok(HttpResponse::Ok().json(json!({
        "service": "Demo Government Authentication API",
        "version": "1.0.0",
        "status": "operational",
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "endpoints": {
            "health": "/api/health",
            "auth": "/api/auth/*",
            "fsfvi": "/api/government/fsfvi/*"
        }
    })))
}

pub async fn health_check() -> Result<HttpResponse> {
    Ok(HttpResponse::Ok().json(json!({
        "status": "healthy",
        "service": "demo-gov-backend",
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "version": "1.0.0"
    })))
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::{test, web, App};
    use crate::models::auth::SecurityConfig;
    use crate::models::user::{LoginRequest, ChangePasswordRequest, PasswordStrengthRequest};
    use crate::services::auth_service::AuthService;
    use crate::services::password_service::PasswordService;
    use crate::services::token_service::TokenService;
    use sqlx::SqlitePool;
    use std::sync::Mutex;

    /// Helper: Create in-memory test database with migrations
    async fn setup_test_db() -> SqlitePool {
        let pool = SqlitePool::connect("sqlite::memory:")
            .await
            .expect("Failed to create in-memory database");

        sqlx::migrate!("./migrations")
            .run(&pool)
            .await
            .expect("Failed to run migrations");

        pool
    }

    /// Helper: Create test app state
    async fn create_test_app_state(pool: SqlitePool) -> web::Data<AppState> {
        let password_service = PasswordService::new();
        let security_config = SecurityConfig::default();
        let token_service = TokenService::new(security_config.clone());
        let auth_service = AuthService::new(pool, password_service, token_service, security_config);

        web::Data::new(AppState {
            auth_service: Mutex::new(auth_service),
        })
    }

    /// Helper: Create test user in database
    async fn create_test_user(
        pool: &SqlitePool,
        username: &str,
        password: &str,
    ) -> (Uuid, String) {
        let user_id = Uuid::new_v4();
        let now = chrono::Utc::now();

        // Hash the password
        let password_service = PasswordService::new();
        let password_hash = password_service.hash_password(password).unwrap();

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
            false,
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

        (user_id, password_hash)
    }

    // ============================================================================
    // Health Check Tests
    // ============================================================================

    #[actix_web::test]
    async fn test_health_check_endpoint() {
        let app = test::init_service(
            App::new().route("/health", web::get().to(health_check))
        ).await;

        let req = test::TestRequest::get().uri("/health").to_request();
        let resp = test::call_service(&app, req).await;

        assert!(resp.status().is_success());

        let body: serde_json::Value = test::read_body_json(resp).await;
        assert_eq!(body["status"], "healthy");
        assert_eq!(body["service"], "demo-gov-backend");
    }

    // ============================================================================
    // Login Endpoint Tests
    // ============================================================================

    #[actix_web::test]
    async fn test_login_success() {
        let pool = setup_test_db().await;
        let app_state = create_test_app_state(pool.clone()).await;

        let password = "SecurePhrase@2025!Valid";
        create_test_user(&pool, "test_user", password).await;

        let app = test::init_service(
            App::new()
                .app_data(app_state.clone())
                .route("/api/auth/login", web::post().to(login))
        ).await;

        let login_req = LoginRequest {
            username: "test_user".to_string(),
            password: password.to_string(),
            two_fa_code: None,
            user_agent: Some("Test Agent".to_string()),
            ip_address: None,
        };

        let req = test::TestRequest::post()
            .uri("/api/auth/login")
            .set_json(&login_req)
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert!(resp.status().is_success());

        let body: serde_json::Value = test::read_body_json(resp).await;
        assert_eq!(body["success"], true);
        assert!(body["data"]["token"].as_str().unwrap().len() > 0);
        assert_eq!(body["data"]["user"]["username"], "test_user");
    }

    #[actix_web::test]
    async fn test_login_invalid_credentials() {
        let pool = setup_test_db().await;
        let app_state = create_test_app_state(pool.clone()).await;

        create_test_user(&pool, "test_user", "CorrectPhrase@2025!Valid").await;

        let app = test::init_service(
            App::new()
                .app_data(app_state.clone())
                .route("/api/auth/login", web::post().to(login))
        ).await;

        let login_req = LoginRequest {
            username: "test_user".to_string(),
            password: "WrongPhrase@2025!Wrong".to_string(),
            two_fa_code: None,
            user_agent: Some("Test Agent".to_string()),
            ip_address: None,
        };

        let req = test::TestRequest::post()
            .uri("/api/auth/login")
            .set_json(&login_req)
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status().as_u16(), 401);

        let body: serde_json::Value = test::read_body_json(resp).await;
        assert_eq!(body["success"], false);
        assert!(body["message"].as_str().unwrap().contains("Invalid username or password"));
    }

    #[actix_web::test]
    async fn test_login_nonexistent_user() {
        let pool = setup_test_db().await;
        let app_state = create_test_app_state(pool.clone()).await;

        let app = test::init_service(
            App::new()
                .app_data(app_state.clone())
                .route("/api/auth/login", web::post().to(login))
        ).await;

        let login_req = LoginRequest {
            username: "nonexistent_user".to_string(),
            password: "AnyPhrase@2025!Any".to_string(),
            two_fa_code: None,
            user_agent: Some("Test Agent".to_string()),
            ip_address: None,
        };

        let req = test::TestRequest::post()
            .uri("/api/auth/login")
            .set_json(&login_req)
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status().as_u16(), 401);

        let body: serde_json::Value = test::read_body_json(resp).await;
        assert_eq!(body["success"], false);
    }

    // ============================================================================
    // Verify Token Endpoint Tests
    // ============================================================================

    #[actix_web::test]
    async fn test_verify_token_success() {
        let pool = setup_test_db().await;
        let app_state = create_test_app_state(pool.clone()).await;

        let password = "SecurePhrase@2025!Valid";
        create_test_user(&pool, "test_user", password).await;

        let app = test::init_service(
            App::new()
                .app_data(app_state.clone())
                .route("/api/auth/login", web::post().to(login))
                .route("/api/auth/verify", web::get().to(verify_token))
        ).await;

        // Login first to get token
        let login_req = LoginRequest {
            username: "test_user".to_string(),
            password: password.to_string(),
            two_fa_code: None,
            user_agent: Some("Test Agent".to_string()),
            ip_address: None,
        };

        let req = test::TestRequest::post()
            .uri("/api/auth/login")
            .set_json(&login_req)
            .to_request();

        let resp = test::call_service(&app, req).await;
        let body: serde_json::Value = test::read_body_json(resp).await;
        let token = body["data"]["token"].as_str().unwrap();

        // Verify token
        let req = test::TestRequest::get()
            .uri("/api/auth/verify")
            .insert_header(("Authorization", format!("Bearer {}", token)))
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert!(resp.status().is_success());

        let body: serde_json::Value = test::read_body_json(resp).await;
        assert_eq!(body["success"], true);
        assert_eq!(body["data"]["user"]["username"], "test_user");
    }

    #[actix_web::test]
    async fn test_verify_token_missing_authorization() {
        let pool = setup_test_db().await;
        let app_state = create_test_app_state(pool.clone()).await;

        let app = test::init_service(
            App::new()
                .app_data(app_state.clone())
                .route("/api/auth/verify", web::get().to(verify_token))
        ).await;

        let req = test::TestRequest::get()
            .uri("/api/auth/verify")
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status().as_u16(), 401);

        let body: serde_json::Value = test::read_body_json(resp).await;
        assert_eq!(body["success"], false);
    }

    #[actix_web::test]
    async fn test_verify_token_invalid_token() {
        let pool = setup_test_db().await;
        let app_state = create_test_app_state(pool.clone()).await;

        let app = test::init_service(
            App::new()
                .app_data(app_state.clone())
                .route("/api/auth/verify", web::get().to(verify_token))
        ).await;

        let req = test::TestRequest::get()
            .uri("/api/auth/verify")
            .insert_header(("Authorization", "Bearer invalid_token_123"))
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status().as_u16(), 401);
    }

    // ============================================================================
    // Logout Endpoint Tests
    // ============================================================================

    #[actix_web::test]
    async fn test_logout_success() {
        let pool = setup_test_db().await;
        let app_state = create_test_app_state(pool.clone()).await;

        let password = "SecurePhrase@2025!Valid";
        create_test_user(&pool, "test_user", password).await;

        let app = test::init_service(
            App::new()
                .app_data(app_state.clone())
                .route("/api/auth/login", web::post().to(login))
                .route("/api/auth/logout", web::post().to(logout))
        ).await;

        // Login first
        let login_req = LoginRequest {
            username: "test_user".to_string(),
            password: password.to_string(),
            two_fa_code: None,
            user_agent: Some("Test Agent".to_string()),
            ip_address: None,
        };

        let req = test::TestRequest::post()
            .uri("/api/auth/login")
            .set_json(&login_req)
            .to_request();

        let resp = test::call_service(&app, req).await;
        let body: serde_json::Value = test::read_body_json(resp).await;
        let token = body["data"]["token"].as_str().unwrap();

        // Logout
        let req = test::TestRequest::post()
            .uri("/api/auth/logout")
            .insert_header(("Authorization", format!("Bearer {}", token)))
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert!(resp.status().is_success());

        let body: serde_json::Value = test::read_body_json(resp).await;
        assert_eq!(body["success"], true);
    }

    // ============================================================================
    // Change Password Endpoint Tests
    // ============================================================================

    #[actix_web::test]
    async fn test_change_password_success() {
        let pool = setup_test_db().await;
        let app_state = create_test_app_state(pool.clone()).await;

        let current_password = "CurrentPhrase@2025!Old";
        create_test_user(&pool, "test_user", current_password).await;

        let app = test::init_service(
            App::new()
                .app_data(app_state.clone())
                .route("/api/auth/login", web::post().to(login))
                .route("/api/auth/change-password", web::post().to(change_password))
        ).await;

        // Login first
        let login_req = LoginRequest {
            username: "test_user".to_string(),
            password: current_password.to_string(),
            two_fa_code: None,
            user_agent: Some("Test Agent".to_string()),
            ip_address: None,
        };

        let req = test::TestRequest::post()
            .uri("/api/auth/login")
            .set_json(&login_req)
            .to_request();

        let resp = test::call_service(&app, req).await;
        let body: serde_json::Value = test::read_body_json(resp).await;
        let token = body["data"]["token"].as_str().unwrap();

        // Change password
        let change_req = ChangePasswordRequest {
            current_password: current_password.to_string(),
            new_password: "NewPhrase@2025!Changed".to_string(),
            confirm_password: "NewPhrase@2025!Changed".to_string(),
        };

        let req = test::TestRequest::post()
            .uri("/api/auth/change-password")
            .insert_header(("Authorization", format!("Bearer {}", token)))
            .set_json(&change_req)
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert!(resp.status().is_success());

        let body: serde_json::Value = test::read_body_json(resp).await;
        assert_eq!(body["success"], true);
    }

    #[actix_web::test]
    async fn test_change_password_wrong_current_password() {
        let pool = setup_test_db().await;
        let app_state = create_test_app_state(pool.clone()).await;

        let current_password = "CurrentPhrase@2025!Old";
        create_test_user(&pool, "test_user", current_password).await;

        let app = test::init_service(
            App::new()
                .app_data(app_state.clone())
                .route("/api/auth/login", web::post().to(login))
                .route("/api/auth/change-password", web::post().to(change_password))
        ).await;

        // Login first
        let login_req = LoginRequest {
            username: "test_user".to_string(),
            password: current_password.to_string(),
            two_fa_code: None,
            user_agent: Some("Test Agent".to_string()),
            ip_address: None,
        };

        let req = test::TestRequest::post()
            .uri("/api/auth/login")
            .set_json(&login_req)
            .to_request();

        let resp = test::call_service(&app, req).await;
        let body: serde_json::Value = test::read_body_json(resp).await;
        let token = body["data"]["token"].as_str().unwrap();

        // Try to change password with wrong current password
        let change_req = ChangePasswordRequest {
            current_password: "WrongPhrase@2025!Wrong".to_string(),
            new_password: "NewPhrase@2025!Changed".to_string(),
            confirm_password: "NewPhrase@2025!Changed".to_string(),
        };

        let req = test::TestRequest::post()
            .uri("/api/auth/change-password")
            .insert_header(("Authorization", format!("Bearer {}", token)))
            .set_json(&change_req)
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status().as_u16(), 400);

        let body: serde_json::Value = test::read_body_json(resp).await;
        assert_eq!(body["success"], false);
    }

    #[actix_web::test]
    async fn test_change_password_mismatched_confirmation() {
        let pool = setup_test_db().await;
        let app_state = create_test_app_state(pool.clone()).await;

        let current_password = "CurrentPhrase@2025!Old";
        create_test_user(&pool, "test_user", current_password).await;

        let app = test::init_service(
            App::new()
                .app_data(app_state.clone())
                .route("/api/auth/login", web::post().to(login))
                .route("/api/auth/change-password", web::post().to(change_password))
        ).await;

        // Login first
        let login_req = LoginRequest {
            username: "test_user".to_string(),
            password: current_password.to_string(),
            two_fa_code: None,
            user_agent: Some("Test Agent".to_string()),
            ip_address: None,
        };

        let req = test::TestRequest::post()
            .uri("/api/auth/login")
            .set_json(&login_req)
            .to_request();

        let resp = test::call_service(&app, req).await;
        let body: serde_json::Value = test::read_body_json(resp).await;
        let token = body["data"]["token"].as_str().unwrap();

        // Try to change password with mismatched confirmation
        let change_req = ChangePasswordRequest {
            current_password: current_password.to_string(),
            new_password: "NewPhrase@2025!Changed".to_string(),
            confirm_password: "DifferentPhrase@2025!Wrong".to_string(),
        };

        let req = test::TestRequest::post()
            .uri("/api/auth/change-password")
            .insert_header(("Authorization", format!("Bearer {}", token)))
            .set_json(&change_req)
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status().as_u16(), 400);
    }

    // ============================================================================
    // Password Strength Check Endpoint Tests
    // ============================================================================

    #[actix_web::test]
    async fn test_password_strength_check_strong() {
        let app = test::init_service(
            App::new().route("/api/auth/password-strength", web::post().to(check_password_strength))
        ).await;

        let strength_req = PasswordStrengthRequest {
            password: "VerySecureP@ssw0rd2025!".to_string(),
        };

        let req = test::TestRequest::post()
            .uri("/api/auth/password-strength")
            .set_json(&strength_req)
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert!(resp.status().is_success());

        let body: serde_json::Value = test::read_body_json(resp).await;
        assert_eq!(body["success"], true);
        assert_eq!(body["data"]["is_valid"], true);
    }

    #[actix_web::test]
    async fn test_password_strength_check_weak() {
        let app = test::init_service(
            App::new().route("/api/auth/password-strength", web::post().to(check_password_strength))
        ).await;

        let strength_req = PasswordStrengthRequest {
            password: "weak".to_string(),
        };

        let req = test::TestRequest::post()
            .uri("/api/auth/password-strength")
            .set_json(&strength_req)
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert!(resp.status().is_success());

        let body: serde_json::Value = test::read_body_json(resp).await;
        assert_eq!(body["success"], true);
        assert_eq!(body["data"]["is_valid"], false);
        assert!(body["data"]["errors"].as_array().unwrap().len() > 0);
    }

    #[actix_web::test]
    async fn test_password_strength_check_provides_suggestions() {
        let app = test::init_service(
            App::new().route("/api/auth/password-strength", web::post().to(check_password_strength))
        ).await;

        let strength_req = PasswordStrengthRequest {
            password: "ShortPass1!".to_string(),
        };

        let req = test::TestRequest::post()
            .uri("/api/auth/password-strength")
            .set_json(&strength_req)
            .to_request();

        let resp = test::call_service(&app, req).await;
        let body: serde_json::Value = test::read_body_json(resp).await;

        assert!(body["data"]["suggestions"].as_array().is_some());
    }

    // ============================================================================
    // IP Address Extraction Tests
    // ============================================================================

    #[actix_web::test]
    async fn test_get_client_ip_from_connection() {
        let pool = setup_test_db().await;
        let app_state = create_test_app_state(pool.clone()).await;

        create_test_user(&pool, "test_user", "SecurePhrase@2025!Valid").await;

        let app = test::init_service(
            App::new()
                .app_data(app_state.clone())
                .route("/api/auth/login", web::post().to(login))
        ).await;

        let login_req = LoginRequest {
            username: "test_user".to_string(),
            password: "SecurePhrase@2025!Valid".to_string(),
            two_fa_code: None,
            user_agent: Some("Test Agent".to_string()),
            ip_address: None,
        };

        let req = test::TestRequest::post()
            .uri("/api/auth/login")
            .set_json(&login_req)
            .to_request();

        // Just verify request completes (IP extraction happens internally)
        let resp = test::call_service(&app, req).await;
        assert!(resp.status().is_success());
    }

    #[actix_web::test]
    async fn test_get_client_ip_from_x_forwarded_for() {
        let pool = setup_test_db().await;
        let app_state = create_test_app_state(pool.clone()).await;

        create_test_user(&pool, "test_user", "SecurePhrase@2025!Valid").await;

        let app = test::init_service(
            App::new()
                .app_data(app_state.clone())
                .route("/api/auth/login", web::post().to(login))
        ).await;

        let login_req = LoginRequest {
            username: "test_user".to_string(),
            password: "SecurePhrase@2025!Valid".to_string(),
            two_fa_code: None,
            user_agent: Some("Test Agent".to_string()),
            ip_address: None,
        };

        let req = test::TestRequest::post()
            .uri("/api/auth/login")
            .insert_header(("X-Forwarded-For", "192.168.1.100, 10.0.0.1"))
            .set_json(&login_req)
            .to_request();

        // Verify request completes (IP extraction from X-Forwarded-For happens internally)
        let resp = test::call_service(&app, req).await;
        assert!(resp.status().is_success());
    }

    // ============================================================================
    // Authorization Header Tests
    // ============================================================================

    #[actix_web::test]
    async fn test_extract_token_missing_bearer_prefix() {
        let pool = setup_test_db().await;
        let app_state = create_test_app_state(pool.clone()).await;

        let app = test::init_service(
            App::new()
                .app_data(app_state.clone())
                .route("/api/auth/verify", web::get().to(verify_token))
        ).await;

        let req = test::TestRequest::get()
            .uri("/api/auth/verify")
            .insert_header(("Authorization", "invalid_token_without_bearer"))
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status().as_u16(), 401);
    }
}