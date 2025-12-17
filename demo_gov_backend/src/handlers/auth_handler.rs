use actix_web::{web, HttpRequest, HttpResponse, Result};
use serde_json::json;
use std::sync::Mutex;
use uuid::Uuid;

use crate::models::auth::AuthError;
use crate::models::user::{ChangePasswordRequest, LoginRequest, TwoFASetupRequest, TwoFAVerifyRequest, TwoFADisableRequest};
use crate::services::auth_service::AuthService;

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

                    let (status_code, message) = match auth_error {
                        AuthError::InvalidCredentials => (400, "Current password is incorrect"),
                        AuthError::PasswordMismatch => (400, "New passwords do not match"),
                        AuthError::PasswordTooWeak => (400, "Password does not meet security requirements"),
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
                        match auth_service.logout(user_id).await {
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

/// Health check endpoint
pub async fn health_check() -> Result<HttpResponse> {
    Ok(HttpResponse::Ok().json(json!({
        "status": "healthy",
        "service": "kenya-fsfvi-auth",
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "version": "1.0.0"
    })))
}