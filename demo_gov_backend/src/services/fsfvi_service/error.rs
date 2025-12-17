/// FSFVI Service Error Types
/// ==========================
/// Comprehensive error handling for FSFVI service operations

use actix_web::{http::StatusCode, HttpResponse, ResponseError};
use serde_json::json;

#[derive(Debug)]
pub enum FsfviServiceError {
    NetworkError(String),
    ApiError { status: u16, message: String },
    ResponseParseError(String),
    ValidationError(String),
    DatabaseError(String),
}

impl std::fmt::Display for FsfviServiceError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            FsfviServiceError::NetworkError(msg) => write!(f, "Network error: {}", msg),
            FsfviServiceError::ApiError { status, message } => {
                write!(f, "API error ({}): {}", status, message)
            }
            FsfviServiceError::ResponseParseError(msg) => write!(f, "Parse error: {}", msg),
            FsfviServiceError::ValidationError(msg) => write!(f, "Validation error: {}", msg),
            FsfviServiceError::DatabaseError(msg) => write!(f, "Database error: {}", msg),
        }
    }
}

impl std::error::Error for FsfviServiceError {}

impl ResponseError for FsfviServiceError {
    fn error_response(&self) -> HttpResponse {
        let status = match self {
            FsfviServiceError::NetworkError(_) => StatusCode::BAD_GATEWAY,
            FsfviServiceError::ApiError { status, .. } => {
                StatusCode::from_u16(*status).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR)
            }
            FsfviServiceError::ResponseParseError(_) => StatusCode::BAD_GATEWAY,
            FsfviServiceError::ValidationError(_) => StatusCode::BAD_REQUEST,
            FsfviServiceError::DatabaseError(_) => StatusCode::INTERNAL_SERVER_ERROR,
        };

        HttpResponse::build(status).json(json!({
            "error": self.to_string()
        }))
    }
}
