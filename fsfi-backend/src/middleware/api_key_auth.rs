/// API Key Authentication Middleware
/// Production implementation for API key-based authentication

use actix_web::{
    body::{BoxBody, MessageBody},
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    Error, HttpMessage, HttpResponse,
};
use futures_util::future::LocalBoxFuture;
use std::{
    future::{ready, Ready},
    rc::Rc,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::api_key::ApiKeyStatus;
use crate::services::api_key::ApiKeyService;

#[derive(Clone)]
pub struct ApiKeyAuthContext {
    pub api_key_id: Uuid,
    pub government_id: Uuid,
    pub scopes: Vec<String>,
}

pub struct ApiKeyAuth {
    db_pool: Rc<PgPool>,
}

impl ApiKeyAuth {
    pub fn new(db_pool: PgPool) -> Self {
        Self {
            db_pool: Rc::new(db_pool),
        }
    }
}

impl<S, B> Transform<S, ServiceRequest> for ApiKeyAuth
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: MessageBody + 'static,
{
    type Response = ServiceResponse<BoxBody>;
    type Error = Error;
    type InitError = ();
    type Transform = ApiKeyAuthService<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(ApiKeyAuthService {
            service: Rc::new(service),
            db_pool: self.db_pool.clone(),
        }))
    }
}

pub struct ApiKeyAuthService<S> {
    service: Rc<S>,
    db_pool: Rc<PgPool>,
}

impl<S> ApiKeyAuthService<S> {
    /// Extract client IP address from request
    /// Checks multiple sources in order of preference:
    /// 1. X-Forwarded-For header (if behind proxy/load balancer)
    /// 2. X-Real-IP header (nginx standard)
    /// 3. Connection peer address (direct connection)
    fn extract_client_ip(req: &ServiceRequest) -> Option<String> {
        // Check X-Forwarded-For header (standard for proxies/load balancers)
        if let Some(forwarded_for) = req.headers().get("x-forwarded-for") {
            if let Ok(forwarded_str) = forwarded_for.to_str() {
                // X-Forwarded-For can contain multiple IPs (client, proxy1, proxy2...)
                // Take the FIRST IP (the original client)
                if let Some(first_ip) = forwarded_str.split(',').next() {
                    return Some(first_ip.trim().to_string());
                }
            }
        }

        // Check X-Real-IP header (nginx standard)
        if let Some(real_ip) = req.headers().get("x-real-ip") {
            if let Ok(ip_str) = real_ip.to_str() {
                return Some(ip_str.trim().to_string());
            }
        }

        // Fall back to connection peer address (direct connection)
        if let Some(peer_addr) = req.peer_addr() {
            return Some(peer_addr.ip().to_string());
        }

        None
    }
}

impl<S, B> Service<ServiceRequest> for ApiKeyAuthService<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: MessageBody + 'static,
{
    type Response = ServiceResponse<BoxBody>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let service = self.service.clone();
        let db_pool = self.db_pool.clone();

        Box::pin(async move {
            // Extract API key from header
            let api_key = req
                .headers()
                .get("x-api-key")
                .and_then(|h| h.to_str().ok())
                .map(|s| s.to_string());

            if let Some(key) = api_key {
                // Validate API key against database
                let key_hash = ApiKeyService::hash_api_key(&key);

                let api_key_record = sqlx::query!(
                    r#"
                    SELECT id, government_id, scopes, status as "status: ApiKeyStatus"
                    FROM api_keys
                    WHERE key_hash = $1 AND status = 'active'
                    "#,
                    key_hash
                )
                .fetch_optional(db_pool.as_ref())
                .await;

                if let Ok(Some(record)) = api_key_record {
                    // ============================================================================
                    // CRITICAL SECURITY CHECK: IP Whitelist Enforcement
                    // ============================================================================
                    // Fetch government's IP whitelist configuration
                    let government = sqlx::query!(
                        r#"
                        SELECT ip_whitelist
                        FROM governments
                        WHERE id = $1
                        "#,
                        record.government_id
                    )
                    .fetch_optional(db_pool.as_ref())
                    .await;

                    if let Ok(Some(gov)) = government {
                        // Check if IP whitelist is configured
                        if let Some(ip_whitelist_json) = gov.ip_whitelist {
                            // Parse IP whitelist from JSONB
                            let ip_whitelist: Vec<String> = serde_json::from_value(ip_whitelist_json)
                                .unwrap_or_default();

                            if !ip_whitelist.is_empty() {
                                // Extract client IP from request
                                let client_ip = Self::extract_client_ip(&req);

                                if let Some(ip) = client_ip {
                                    // Check if client IP is in whitelist
                                    if !ip_whitelist.contains(&ip) {
                                        tracing::warn!(
                                            "IP whitelist violation: API key {} accessed from non-whitelisted IP: {}",
                                            record.id,
                                            ip
                                        );

                                        let (req, _) = req.into_parts();
                                        return Ok(ServiceResponse::new(
                                            req,
                                            HttpResponse::Forbidden()
                                                .json(serde_json::json!({
                                                    "error": "Access denied: IP address not whitelisted",
                                                    "ip": ip,
                                                    "message": "This API key can only be used from whitelisted IP addresses"
                                                }))
                                                .map_into_boxed_body(),
                                        ));
                                    }
                                } else {
                                    // Could not determine client IP - deny access for security
                                    tracing::warn!(
                                        "IP whitelist check failed: Could not determine client IP for API key {}",
                                        record.id
                                    );

                                    let (req, _) = req.into_parts();
                                    return Ok(ServiceResponse::new(
                                        req,
                                        HttpResponse::Forbidden()
                                            .json(serde_json::json!({
                                                "error": "Access denied: Could not verify IP address"
                                            }))
                                            .map_into_boxed_body(),
                                    ));
                                }
                            }
                        }
                    }

                    // Parse scopes from JSON (scopes is JsonValue, not Option<JsonValue>)
                    let scopes: Vec<String> = serde_json::from_value(record.scopes).unwrap_or_default();

                    // Store API key context in request extensions
                    req.extensions_mut().insert(ApiKeyAuthContext {
                        api_key_id: record.id,
                        government_id: record.government_id,
                        scopes,
                    });

                    // Continue with the request
                    let res = service.call(req).await?;
                    return Ok(res.map_into_boxed_body());
                }
            }

            // Unauthorized
            let (req, _) = req.into_parts();
            Ok(ServiceResponse::new(
                req,
                HttpResponse::Unauthorized()
                    .json(serde_json::json!({
                        "error": "Invalid or missing API key"
                    }))
                    .map_into_boxed_body(),
            ))
        })
    }
}
