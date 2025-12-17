/// Matrix Generation Service
/// ==========================
/// Provides transparency into FSFVI weighting methodology
/// Endpoint Reference: fsfi-backend/src/fsfvi_api/handlers.rs:831-1027
///
/// CRITICAL: Enables governments to view and understand how component weights
/// are calculated, and allows customization for context-specific needs

use super::client::FsfviClient;
use super::error::FsfviServiceError;
use super::models::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

pub struct MatrixGenerationService {
    client: FsfviClient,
}

impl MatrixGenerationService {
    pub fn new(client: FsfviClient) -> Self {
        Self { client }
    }

    /// Generate AHP (expert) pairwise comparison matrix
    ///
    /// Endpoint: GET /api/v1/fsfvi/matrices/ahp
    /// Reference: fsfi-backend/src/fsfvi_api/handlers.rs:849-875
    ///
    /// Returns the pairwise comparison matrix used for expert weighting.
    /// Each cell [i,j] represents "how much more important is component i than j"
    ///
    /// Scale interpretation:
    /// - 1: Equal importance
    /// - 3: Moderate importance
    /// - 5: Strong importance
    /// - 7: Very strong importance
    /// - 9: Extreme importance
    pub async fn generate_ahp_matrix(
        &self,
    ) -> Result<ApiResponse<AhpMatrixResponse>, FsfviServiceError> {
        log::info!("Generating AHP matrix for transparency");

        self.client.get("/api/v1/fsfvi/matrices/ahp").await
    }

    /// Generate network dependency matrix
    ///
    /// Endpoint: GET /api/v1/fsfvi/matrices/network
    /// Reference: fsfi-backend/src/fsfvi_api/handlers.rs:894-920
    ///
    /// Returns the dependency matrix showing how components depend on each other.
    /// Values range from 0.0 (no dependency) to 1.0 (strong dependency)
    pub async fn generate_network_matrix(
        &self,
    ) -> Result<ApiResponse<NetworkMatrixResponse>, FsfviServiceError> {
        log::info!("Generating network dependency matrix");

        self.client.get("/api/v1/fsfvi/matrices/network").await
    }

    /// Customize AHP matrix with government's own expert judgments
    ///
    /// Endpoint: POST /api/v1/fsfvi/matrices/ahp/customize
    /// Reference: fsfi-backend/src/fsfvi_api/handlers.rs:942-982
    ///
    /// Accepts pairwise comparisons and generates weights accordingly.
    /// Validates matrix consistency and provides warnings if inconsistent.
    pub async fn customize_ahp_matrix(
        &self,
        pairwise_comparisons: Vec<PairwiseComparison>,
    ) -> Result<ApiResponse<CustomAhpMatrixResponse>, FsfviServiceError> {
        if pairwise_comparisons.is_empty() {
            return Err(FsfviServiceError::ValidationError(
                "At least one pairwise comparison is required".to_string(),
            ));
        }

        log::info!(
            "Customizing AHP matrix with {} comparisons",
            pairwise_comparisons.len()
        );

        // Validate each comparison
        for comparison in &pairwise_comparisons {
            if comparison.value < 1.0 / 9.0 || comparison.value > 9.0 {
                return Err(FsfviServiceError::ValidationError(format!(
                    "Comparison value must be between 1/9 and 9, got {} for {} vs {}",
                    comparison.value, comparison.component_a, comparison.component_b
                )));
            }

            // Validate component types
            const VALID_TYPES: &[&str] = &[
                "agricultural_development",
                "infrastructure",
                "nutrition_health",
                "climate_natural_resources",
                "social_protection_equity",
                "governance_institutions",
            ];

            if !VALID_TYPES.contains(&comparison.component_a.as_str()) {
                return Err(FsfviServiceError::ValidationError(format!(
                    "Invalid component_a: '{}'",
                    comparison.component_a
                )));
            }

            if !VALID_TYPES.contains(&comparison.component_b.as_str()) {
                return Err(FsfviServiceError::ValidationError(format!(
                    "Invalid component_b: '{}'",
                    comparison.component_b
                )));
            }

            if comparison.component_a == comparison.component_b {
                return Err(FsfviServiceError::ValidationError(
                    "Cannot compare a component with itself".to_string(),
                ));
            }
        }

        let request = CustomAhpMatrixRequest { pairwise_comparisons };

        let body = serde_json::to_value(&request)
            .map_err(|e| FsfviServiceError::ValidationError(e.to_string()))?;

        self.client
            .post("/api/v1/fsfvi/matrices/ahp/customize", body)
            .await
    }

    /// Export AHP and network matrices to CSV format
    ///
    /// Endpoint: GET /api/v1/fsfvi/matrices/export
    /// Reference: fsfi-backend/src/fsfvi_api/handlers.rs:1001-1027
    ///
    /// Returns both matrices in CSV format for transparency reporting
    pub async fn export_matrices_csv(
        &self,
    ) -> Result<ApiResponse<MatrixExportResponse>, FsfviServiceError> {
        log::info!("Exporting matrices to CSV format");

        self.client.get("/api/v1/fsfvi/matrices/export").await
    }
}

// Models
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PairwiseComparison {
    pub component_a: String,
    pub component_b: String,
    pub value: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomAhpMatrixRequest {
    pub pairwise_comparisons: Vec<PairwiseComparison>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AhpMatrixResponse {
    pub matrix: Vec<Vec<f64>>,
    pub component_names: Vec<String>,
    pub resulting_weights: HashMap<String, f64>,
    pub consistency_ratio: f64,
    pub is_consistent: bool,
    pub consistency_threshold: f64,
    pub pairwise_explanations: Vec<PairwiseExplanation>,
    pub interpretation_guide: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PairwiseExplanation {
    pub component_a: String,
    pub component_b: String,
    pub comparison_value: f64,
    pub explanation: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkMatrixResponse {
    pub dependency_matrix: Vec<Vec<f64>>,
    pub component_names: Vec<String>,
    pub pagerank_weights: HashMap<String, f64>,
    pub cascade_weights: HashMap<String, f64>,
    pub dependency_explanations: Vec<DependencyExplanation>,
    pub interpretation_guide: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DependencyExplanation {
    pub source_component: String,
    pub target_component: String,
    pub dependency_strength: f64,
    pub explanation: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomAhpMatrixResponse {
    pub matrix: Vec<Vec<f64>>,
    pub component_names: Vec<String>,
    pub custom_weights: HashMap<String, f64>,
    pub consistency_ratio: f64,
    pub is_consistent: bool,
    pub warnings: Vec<String>,
    pub recommendations: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MatrixExportResponse {
    pub ahp_matrix_csv: String,
    pub network_matrix_csv: String,
    pub timestamp: String,
}
