/// FSFVI API Integration Layer
/// ============================
///
/// Connects FSFVI core services to the existing backend infrastructure:
/// - Authentication & Authorization (JWT + API Keys)
/// - Database persistence
/// - API endpoints
/// - Request/Response handling
/// - Rate limiting
///
/// SECURITY MODEL:
/// - All endpoints require authentication (JWT or API Key)
/// - Role-based access control (Government, Analyst, Partner, Admin)
/// - API usage tracking and rate limiting
/// - Audit logging for all FSFVI operations
///
/// CURRENCY STANDARD:
/// - ALL monetary values in USD for uniformity
/// - Currency conversion handled at input if needed
/// - Results always returned in USD

pub mod budget_optimization;
pub mod handlers;
pub mod models;
pub mod openapi;
pub mod permissions;
pub mod routes;
pub mod weighting_analysis;

