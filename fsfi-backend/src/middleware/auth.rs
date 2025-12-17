/// JWT Authentication Middleware
/// Production implementation for securing API endpoints

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

use crate::models::user::UserRole;
use crate::services::jwt::JwtService;

#[derive(Clone)]
pub struct AuthMiddleware {
    jwt_service: Rc<JwtService>,
    required_roles: Option<Vec<UserRole>>,
}

impl AuthMiddleware {
    pub fn new(jwt_service: JwtService) -> Self {
        Self {
            jwt_service: Rc::new(jwt_service),
            required_roles: None,
        }
    }

    pub fn with_roles(mut self, roles: Vec<UserRole>) -> Self {
        self.required_roles = Some(roles);
        self
    }
}

impl<S, B> Transform<S, ServiceRequest> for AuthMiddleware
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: MessageBody + 'static,
{
    type Response = ServiceResponse<BoxBody>;
    type Error = Error;
    type InitError = ();
    type Transform = AuthMiddlewareService<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(AuthMiddlewareService {
            service: Rc::new(service),
            jwt_service: self.jwt_service.clone(),
            required_roles: self.required_roles.clone(),
        }))
    }
}

pub struct AuthMiddlewareService<S> {
    service: Rc<S>,
    jwt_service: Rc<JwtService>,
    required_roles: Option<Vec<UserRole>>,
}

impl<S, B> Service<ServiceRequest> for AuthMiddlewareService<S>
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
        let jwt_service = self.jwt_service.clone();
        let required_roles = self.required_roles.clone();
        let service = self.service.clone();

        Box::pin(async move {
            // Extract Authorization header
            let auth_header = req
                .headers()
                .get("Authorization")
                .and_then(|h| h.to_str().ok());

            if let Some(auth_value) = auth_header {
                if let Some(token) = auth_value.strip_prefix("Bearer ") {
                    // Verify token
                    match jwt_service.verify_token(token) {
                        Ok(claims) => {
                            // Check required roles if specified
                            if let Some(ref roles) = required_roles {
                                if !roles.contains(&claims.role) {
                                    let (req, _) = req.into_parts();
                                    let res = HttpResponse::Forbidden()
                                        .json(serde_json::json!({
                                            "success": false,
                                            "error": "Insufficient permissions"
                                        }))
                                        .map_into_boxed_body();
                                    return Ok(ServiceResponse::new(req, res));
                                }
                            }

                            // Add claims to request extensions
                            req.extensions_mut().insert(claims);

                            // Continue to the next service
                            return service.call(req).await.map(|res| res.map_into_boxed_body());
                        }
                        Err(_) => {
                            let (req, _) = req.into_parts();
                            let res = HttpResponse::Unauthorized()
                                .json(serde_json::json!({
                                    "success": false,
                                    "error": "Invalid or expired token"
                                }))
                                .map_into_boxed_body();
                            return Ok(ServiceResponse::new(req, res));
                        }
                    }
                }
            }

            // No valid authorization header
            let (req, _) = req.into_parts();
            let res = HttpResponse::Unauthorized()
                .json(serde_json::json!({
                    "success": false,
                    "error": "Missing or invalid authorization header"
                }))
                .map_into_boxed_body();
            Ok(ServiceResponse::new(req, res))
        })
    }
}
