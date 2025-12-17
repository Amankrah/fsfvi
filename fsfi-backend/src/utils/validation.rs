use validator::ValidationError;

/// Validate that a string is a valid ISO 3166-1 alpha-2 country code
pub fn validate_country_code(code: &str) -> Result<(), ValidationError> {
    if code.len() == 2 && code.chars().all(|c| c.is_ascii_uppercase()) {
        Ok(())
    } else {
        Err(ValidationError::new("Invalid country code"))
    }
}

/// Get list of all valid scopes/endpoints for government developers
/// These correspond to actual FSFVI API endpoint groups
pub fn get_valid_scopes() -> Vec<&'static str> {
    vec![
        "*",                           // WILDCARD: Full access to all endpoints (admin/testing only)
        "fsfvi:assessments",           // Run vulnerability assessments
        "fsfvi:strategic-planning",    // Multi-year plans, MTEF, investment sequencing
        "fsfvi:budget-optimization",   // Budget efficiency & ROI analysis
        "fsfvi:weighting-analysis",    // Methodology validation & transparency
        "fsfvi:performance-gaps",      // Performance gap analysis & peer comparison
        "fsfvi:sensitivity-analysis",  // Sensitivity & robustness testing
        "fsfvi:matrices",              // AHP & network matrix generation
        "fsfvi:scenarios",             // Scenario simulation & comparison
        "fsfvi:decision-support",      // Policy recommendations & crisis response
    ]
}

/// Validate that a scope is valid
pub fn validate_scope(scope: &str) -> Result<(), ValidationError> {
    let valid_scopes = get_valid_scopes();

    if valid_scopes.contains(&scope) {
        Ok(())
    } else {
        Err(ValidationError::new("Invalid scope"))
    }
}
