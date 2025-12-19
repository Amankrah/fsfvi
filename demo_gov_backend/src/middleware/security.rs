use actix_web::{
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    http::header::{HeaderName, HeaderValue},
    Error,
};
use futures_util::future::LocalBoxFuture;
use std::{
    collections::HashMap,
    future::{ready, Ready},
    rc::Rc,
    sync::{Arc, Mutex},
    time::{SystemTime, UNIX_EPOCH},
};

/// Security headers middleware
pub struct SecurityHeaders;

impl<S, B> Transform<S, ServiceRequest> for SecurityHeaders
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = SecurityHeadersMiddleware<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(SecurityHeadersMiddleware {
            service: Rc::new(service),
        }))
    }
}

pub struct SecurityHeadersMiddleware<S> {
    service: Rc<S>,
}

impl<S, B> Service<ServiceRequest> for SecurityHeadersMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let svc = self.service.clone();

        Box::pin(async move {
            let mut res = svc.call(req).await?;

            // Add security headers
            let headers = res.headers_mut();

            // Security headers for Demo Government compliance
            headers.insert(
                HeaderName::from_static("x-content-type-options"),
                HeaderValue::from_static("nosniff"),
            );

            headers.insert(
                HeaderName::from_static("x-frame-options"),
                HeaderValue::from_static("DENY"),
            );

            headers.insert(
                HeaderName::from_static("x-xss-protection"),
                HeaderValue::from_static("1; mode=block"),
            );

            headers.insert(
                HeaderName::from_static("strict-transport-security"),
                HeaderValue::from_static("max-age=31536000; includeSubDomains; preload"),
            );

            headers.insert(
                HeaderName::from_static("content-security-policy"),
                HeaderValue::from_static(
                    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; media-src 'self'; child-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
                ),
            );

            headers.insert(
                HeaderName::from_static("referrer-policy"),
                HeaderValue::from_static("strict-origin-when-cross-origin"),
            );

            headers.insert(
                HeaderName::from_static("permissions-policy"),
                HeaderValue::from_static("camera=(), microphone=(), geolocation=(), payment=()"),
            );

            // Custom header for Demo Government
            headers.insert(
                HeaderName::from_static("x-kenya-gov-secure"),
                HeaderValue::from_static("true"),
            );

            Ok(res)
        })
    }
}

/// Rate limiting middleware
/// CRITICAL: Protects government systems from abuse and ensures fair resource allocation
/// Tracks requests per IP address per minute to prevent DoS attacks
pub struct RateLimiting {
    max_requests_per_minute: u32,
    // In-memory rate limit tracker: IP -> (timestamp, request_count)
    // For production, use Redis for distributed rate limiting
    request_tracker: Arc<Mutex<HashMap<String, (u64, u32)>>>,
}

impl RateLimiting {
    pub fn new(max_requests_per_minute: u32) -> Self {
        Self {
            max_requests_per_minute,
            request_tracker: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    fn get_current_minute() -> u64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() / 60
    }
}

impl<S, B> Transform<S, ServiceRequest> for RateLimiting
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = RateLimitingMiddleware<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(RateLimitingMiddleware {
            service: Rc::new(service),
            max_requests: self.max_requests_per_minute,
            request_tracker: self.request_tracker.clone(),
        }))
    }
}

pub struct RateLimitingMiddleware<S> {
    service: Rc<S>,
    max_requests: u32,
    request_tracker: Arc<Mutex<HashMap<String, (u64, u32)>>>,
}

impl<S, B> Service<ServiceRequest> for RateLimitingMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let svc = self.service.clone();
        let max_requests = self.max_requests;
        let request_tracker = self.request_tracker.clone();

        Box::pin(async move {
            let client_ip = req.connection_info().peer_addr().unwrap_or("unknown").to_string();
            let current_minute = RateLimiting::get_current_minute();

            // CRITICAL: Enforce rate limiting to protect government systems from abuse
            // Check if this IP has exceeded the rate limit
            let rate_limit_exceeded = {
                let mut tracker = request_tracker.lock().unwrap();

                // Get or create entry for this IP
                let entry = tracker.entry(client_ip.clone()).or_insert((current_minute, 0));

                // If we're in a new minute, reset the counter
                if entry.0 != current_minute {
                    *entry = (current_minute, 1);
                    false
                } else {
                    entry.1 += 1;

                    if entry.1 > max_requests {
                        log::warn!(
                            "SECURITY: Rate limit exceeded for IP {}. Requests in current minute: {}. Max allowed: {}",
                            client_ip, entry.1, max_requests
                        );
                        true
                    } else {
                        false
                    }
                }
            };

            if rate_limit_exceeded {
                // Return 429 Too Many Requests
                return Err(actix_web::error::ErrorTooManyRequests(
                    format!("Rate limit exceeded. Maximum {} requests per minute allowed.", max_requests)
                ));
            }

            log::debug!("Request from IP: {} to path: {}", client_ip, req.path());

            svc.call(req).await
        })
    }
}

/// Request logging middleware
pub struct RequestLogging;

impl<S, B> Transform<S, ServiceRequest> for RequestLogging
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = RequestLoggingMiddleware<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(RequestLoggingMiddleware {
            service: Rc::new(service),
        }))
    }
}

pub struct RequestLoggingMiddleware<S> {
    service: Rc<S>,
}

impl<S, B> Service<ServiceRequest> for RequestLoggingMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let svc = self.service.clone();
        let start_time = std::time::Instant::now();

        Box::pin(async move {
            let method = req.method().to_string();
            let path = req.path().to_string();
            let client_ip = req.connection_info().peer_addr().unwrap_or("unknown").to_string();
            let user_agent = req
                .headers()
                .get("User-Agent")
                .and_then(|ua| ua.to_str().ok())
                .unwrap_or("unknown")
                .to_string();

            let result = svc.call(req).await;

            match &result {
                Ok(res) => {
                    let duration = start_time.elapsed();
                    let status = res.status();

                    log::info!(
                        "{} {} {} - {} - {}ms - User-Agent: {}",
                        client_ip,
                        method,
                        path,
                        status,
                        duration.as_millis(),
                        user_agent
                    );
                }
                Err(err) => {
                    let duration = start_time.elapsed();
                    log::error!(
                        "{} {} {} - ERROR: {} - {}ms - User-Agent: {}",
                        client_ip,
                        method,
                        path,
                        err,
                        duration.as_millis(),
                        user_agent
                    );
                }
            }

            result
        })
    }
}

/// Authenticated User Information
#[derive(Debug, Clone)]
pub struct AuthenticatedUser {
    pub user_id: String,
    pub username: String,
    pub government_id: String,
    pub role: String,
}

/// Extract user from JWT token in request
pub fn extract_user_from_token(req: &actix_web::HttpRequest) -> Result<AuthenticatedUser, actix_web::Error> {
    // Extract Authorization header
    let auth_header = req
        .headers()
        .get("Authorization")
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing authorization header"))?
        .to_str()
        .map_err(|_| actix_web::error::ErrorUnauthorized("Invalid authorization header"))?;

    // Extract Bearer token
    if !auth_header.starts_with("Bearer ") {
        return Err(actix_web::error::ErrorUnauthorized("Invalid authorization format"));
    }

    let token = &auth_header[7..]; // Remove "Bearer " prefix

    // Validate token (simplified - in production, verify JWT signature)
    if token.is_empty() {
        return Err(actix_web::error::ErrorUnauthorized("Empty token"));
    }

    // For now, extract basic info from token
    // In a real implementation, you would:
    // 1. Verify JWT signature
    // 2. Check expiration
    // 3. Validate claims
    // 4. Check if session is still valid in database

    // Parse JWT token to extract claims
    use jsonwebtoken::{decode, DecodingKey, Validation, Algorithm};
    use serde::{Deserialize, Serialize};

    #[derive(Debug, Serialize, Deserialize)]
    struct Claims {
        sub: String,          // User ID
        username: String,     // Username
        role: String,         // User role
        exp: usize,           // Expiration
    }

    // Get JWT secret from environment (fallback for compilation)
    let jwt_secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "dev_secret_key_change_in_production".to_string());

    let mut validation = Validation::new(Algorithm::HS256);
    validation.validate_exp = true;

    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(jwt_secret.as_bytes()),
        &validation,
    ).map_err(|e| {
        log::error!("JWT validation failed: {}", e);
        actix_web::error::ErrorUnauthorized("Invalid or expired token")
    })?;

    let claims = token_data.claims;

    // For Demo Government, the government_id is typically the username or a fixed ID
    // In a real system, this would be stored in the JWT claims
    let government_id = format!("demo_gov_{}", claims.username);

    let authenticated_user = AuthenticatedUser {
        user_id: claims.sub.clone(),
        username: claims.username.clone(),
        government_id: government_id.clone(),
        role: claims.role.clone(),
    };

    // CRITICAL SECURITY: Log successful authentication for audit trail
    // This helps track who accessed what resources and when
    log::info!(
        "User authenticated: user_id={}, username={}, role={}, government_id={}",
        authenticated_user.user_id,
        authenticated_user.username,
        authenticated_user.role,
        authenticated_user.government_id
    );

    Ok(authenticated_user)
}