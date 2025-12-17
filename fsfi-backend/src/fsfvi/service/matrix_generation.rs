/// Matrix Generation and Visualization
/// =====================================
///
/// Provides government users the ability to:
/// 1. View AHP (expert) comparison matrices
/// 2. View network dependency matrices
/// 3. Customize expert judgments
/// 4. Export matrices for transparency
///
/// This enables transparency and allows governments to understand
/// and potentially customize the weighting methodology.

use crate::fsfvi::config::WEIGHTING_CONFIG;
use crate::fsfvi::errors::{FsfviError, FsfviResult};
use crate::fsfvi::validators::validate_ahp_matrix;
use crate::fsfvi::weighting::{ComponentRegistry, ExpertWeightingSystem, NetworkCentralityAnalyzer};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Matrix generation service
pub struct MatrixGenerationService {
    expert_system: ExpertWeightingSystem,
    network_analyzer: NetworkCentralityAnalyzer,
    component_registry: ComponentRegistry,
}

impl Default for MatrixGenerationService {
    fn default() -> Self {
        Self::new()
    }
}

impl MatrixGenerationService {
    pub fn new() -> Self {
        Self {
            expert_system: ExpertWeightingSystem::new(),
            network_analyzer: NetworkCentralityAnalyzer::new(),
            component_registry: ComponentRegistry::new(),
        }
    }

    /// Generate AHP matrix with explanations
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
    pub fn generate_ahp_matrix(&self) -> FsfviResult<AhpMatrixResponse> {
        let component_names = self.component_registry.get_component_names();
        let n = component_names.len();

        // Get the AHP matrix from expert system
        let ahp_weights = self.expert_system.calculate_ahp_weights()?;

        // Build the matrix by extracting from expert system
        // We'll recreate it here for transparency
        let mut matrix = vec![vec![1.0; n]; n];
        let mut explanations = Vec::new();

        for i in 0..n {
            for j in (i + 1)..n {
                let comp_i = &component_names[i];
                let comp_j = &component_names[j];

                if let (Some(meta_i), Some(meta_j)) = (
                    self.component_registry.components.get(comp_i),
                    self.component_registry.components.get(comp_j),
                ) {
                    // Calculate comparison based on default weights
                    let weight_ratio = meta_i.default_weight / meta_j.default_weight.max(0.001);
                    let category_adj = get_category_adjustment(&meta_i.category, &meta_j.category);
                    let comparison = (weight_ratio * category_adj).max(1.0 / 9.0).min(9.0);

                    matrix[i][j] = comparison;
                    matrix[j][i] = 1.0 / comparison;

                    // Create explanation
                    let explanation = if comparison > 1.0 {
                        format!(
                            "{} is {:.1}x more important than {} (based on {} vs {})",
                            comp_i,
                            comparison,
                            comp_j,
                            describe_importance(comparison),
                            describe_importance(1.0 / comparison)
                        )
                    } else {
                        format!(
                            "{} is {:.1}x more important than {} (based on {} vs {})",
                            comp_j,
                            1.0 / comparison,
                            comp_i,
                            describe_importance(1.0 / comparison),
                            describe_importance(comparison)
                        )
                    };

                    explanations.push(PairwiseExplanation {
                        component_a: comp_i.clone(),
                        component_b: comp_j.clone(),
                        comparison_value: comparison,
                        explanation,
                    });
                }
            }
        }

        // Calculate consistency ratio
        let consistency_info = self.calculate_consistency_ratio(&matrix)?;

        Ok(AhpMatrixResponse {
            matrix,
            component_names,
            resulting_weights: ahp_weights,
            consistency_ratio: consistency_info.consistency_ratio,
            is_consistent: consistency_info.is_consistent,
            consistency_threshold: WEIGHTING_CONFIG.ahp_consistency_threshold,
            pairwise_explanations: explanations,
            interpretation_guide: create_ahp_interpretation_guide(),
        })
    }

    /// Generate network dependency matrix
    ///
    /// Returns the dependency matrix showing how components depend on each other.
    /// Values range from 0.0 (no dependency) to 1.0 (strong dependency).
    pub fn generate_network_matrix(&self) -> FsfviResult<NetworkMatrixResponse> {
        let component_names = self.network_analyzer.get_component_names().to_vec();
        let dependency_matrix = self.network_analyzer.get_dependency_matrix().to_vec();

        // Calculate PageRank and cascade weights to show impact
        let pagerank_weights = self.network_analyzer.calculate_pagerank_centrality(None)?;
        let cascade_weights = self.network_analyzer.calculate_cascade_multipliers()?;

        // Create explanations for each dependency
        let mut dependency_explanations = Vec::new();
        for (i, source) in component_names.iter().enumerate() {
            for (j, target) in component_names.iter().enumerate() {
                if i != j {
                    let dependency = dependency_matrix[i][j];
                    if dependency > 0.2 {
                        // Only explain significant dependencies
                        dependency_explanations.push(DependencyExplanation {
                            source_component: source.clone(),
                            target_component: target.clone(),
                            dependency_strength: dependency,
                            explanation: format!(
                                "{} depends on {} ({} dependency)",
                                source,
                                target,
                                describe_dependency_strength(dependency)
                            ),
                        });
                    }
                }
            }
        }

        Ok(NetworkMatrixResponse {
            dependency_matrix,
            component_names,
            pagerank_weights,
            cascade_weights,
            dependency_explanations,
            interpretation_guide: create_network_interpretation_guide(),
        })
    }

    /// Allow government to customize AHP matrix with their own judgments
    ///
    /// Accepts pairwise comparisons and generates weights accordingly.
    /// Validates matrix consistency and provides warnings if inconsistent.
    pub fn customize_ahp_matrix(
        &self,
        custom_comparisons: Vec<PairwiseComparison>,
    ) -> FsfviResult<CustomAhpMatrixResponse> {
        let component_names = self.component_registry.get_component_names();
        let n = component_names.len();

        // Build matrix from custom comparisons
        let mut matrix = vec![vec![1.0; n]; n];

        for comparison in &custom_comparisons {
            let i = component_names
                .iter()
                .position(|name| name == &comparison.component_a)
                .ok_or_else(|| {
                    FsfviError::validation(format!("Unknown component: {}", comparison.component_a))
                })?;

            let j = component_names
                .iter()
                .position(|name| name == &comparison.component_b)
                .ok_or_else(|| {
                    FsfviError::validation(format!("Unknown component: {}", comparison.component_b))
                })?;

            // Validate comparison value
            if comparison.value < 1.0 / 9.0 || comparison.value > 9.0 {
                return Err(FsfviError::validation(format!(
                    "Comparison value must be between 1/9 and 9, got {}",
                    comparison.value
                )));
            }

            matrix[i][j] = comparison.value;
            matrix[j][i] = 1.0 / comparison.value;
        }

        // Validate matrix
        validate_ahp_matrix(&matrix)?;

        // Calculate weights using power method
        let weights = self.calculate_weights_from_matrix(&matrix, &component_names)?;

        // Calculate consistency
        let consistency_info = self.calculate_consistency_ratio(&matrix)?;

        // Generate warnings if inconsistent
        let mut warnings = Vec::new();
        if !consistency_info.is_consistent {
            warnings.push(format!(
                "Matrix consistency ratio ({:.3}) exceeds threshold ({:.3}). Consider reviewing your judgments.",
                consistency_info.consistency_ratio,
                WEIGHTING_CONFIG.ahp_consistency_threshold
            ));
        }

        Ok(CustomAhpMatrixResponse {
            matrix,
            component_names,
            custom_weights: weights,
            consistency_ratio: consistency_info.consistency_ratio,
            is_consistent: consistency_info.is_consistent,
            warnings,
            recommendations: if consistency_info.is_consistent {
                vec!["Matrix is consistent and ready to use for FSFVI calculations.".to_string()]
            } else {
                vec![
                    "Review pairwise comparisons for logical consistency.".to_string(),
                    "Ensure transitive relationships (if A>B and B>C, then A>C).".to_string(),
                ]
            },
        })
    }

    /// Calculate consistency ratio for AHP matrix
    fn calculate_consistency_ratio(&self, matrix: &[Vec<f64>]) -> FsfviResult<ConsistencyInfo> {
        let n = matrix.len();

        // Calculate principal eigenvalue using power method
        let mut vector = vec![1.0 / n as f64; n];
        for _ in 0..100 {
            let mut new_vector = vec![0.0; n];
            for i in 0..n {
                for j in 0..n {
                    new_vector[i] += matrix[i][j] * vector[j];
                }
            }

            let norm: f64 = new_vector.iter().sum();
            for val in new_vector.iter_mut() {
                *val /= norm;
            }

            vector = new_vector;
        }

        // Calculate lambda_max
        let mut lambda_max = 0.0;
        for i in 0..n {
            let mut sum = 0.0;
            for j in 0..n {
                sum += matrix[i][j] * vector[j];
            }
            lambda_max += sum / vector[i];
        }
        lambda_max /= n as f64;

        // Calculate consistency index
        let ci = (lambda_max - n as f64) / (n - 1) as f64;

        // Random index values
        let ri = match n {
            3 => 0.58,
            4 => 0.90,
            5 => 1.12,
            6 => 1.24,
            7 => 1.32,
            8 => 1.41,
            9 => 1.45,
            10 => 1.49,
            _ => 1.24,
        };

        let cr = ci / ri;
        let is_consistent = cr <= WEIGHTING_CONFIG.ahp_consistency_threshold;

        Ok(ConsistencyInfo {
            consistency_ratio: cr,
            is_consistent,
            lambda_max,
            consistency_index: ci,
        })
    }

    /// Calculate weights from AHP matrix using eigenvector method
    fn calculate_weights_from_matrix(
        &self,
        matrix: &[Vec<f64>],
        component_names: &[String],
    ) -> FsfviResult<HashMap<String, f64>> {
        let n = matrix.len();
        let mut vector = vec![1.0 / n as f64; n];

        // Power method
        for _ in 0..1000 {
            let mut new_vector = vec![0.0; n];
            for i in 0..n {
                for j in 0..n {
                    new_vector[i] += matrix[i][j] * vector[j];
                }
            }

            let norm: f64 = new_vector.iter().sum();
            for val in new_vector.iter_mut() {
                *val /= norm;
            }

            vector = new_vector;
        }

        let mut weights = HashMap::new();
        for (i, name) in component_names.iter().enumerate() {
            weights.insert(name.clone(), vector[i]);
        }

        Ok(weights)
    }

    /// Export matrices to CSV format
    pub fn export_matrices_csv(&self) -> FsfviResult<MatrixExportResponse> {
        let ahp_response = self.generate_ahp_matrix()?;
        let network_response = self.generate_network_matrix()?;

        // Convert to CSV strings
        let ahp_csv = matrix_to_csv(&ahp_response.matrix, &ahp_response.component_names);
        let network_csv = matrix_to_csv(
            &network_response.dependency_matrix,
            &network_response.component_names,
        );

        Ok(MatrixExportResponse {
            ahp_matrix_csv: ahp_csv,
            network_matrix_csv: network_csv,
            timestamp: chrono::Utc::now().to_rfc3339(),
        })
    }
}

// Helper functions

fn get_category_adjustment(cat_i: &str, cat_j: &str) -> f64 {
    let hierarchy: HashMap<&str, f64> = [
        ("economic", 1.0),
        ("social", 0.9),
        ("physical", 0.8),
        ("environmental", 0.7),
        ("institutional", 0.6),
    ]
    .iter()
    .cloned()
    .collect();

    let importance_i = hierarchy.get(cat_i).unwrap_or(&0.5);
    let importance_j = hierarchy.get(cat_j).unwrap_or(&0.5);

    importance_i / importance_j.max(0.1)
}

fn describe_importance(value: f64) -> &'static str {
    if value >= 7.0 {
        "extremely important"
    } else if value >= 5.0 {
        "strongly important"
    } else if value >= 3.0 {
        "moderately important"
    } else if value > 1.0 {
        "slightly important"
    } else {
        "equally important"
    }
}

fn describe_dependency_strength(value: f64) -> &'static str {
    if value >= 0.7 {
        "strong"
    } else if value >= 0.5 {
        "moderate"
    } else if value >= 0.3 {
        "weak"
    } else {
        "minimal"
    }
}

fn create_ahp_interpretation_guide() -> String {
    r#"AHP Matrix Interpretation Guide:

    1-9 Scale:
    1 = Equal importance
    3 = Moderate importance of one over another
    5 = Strong importance of one over another
    7 = Very strong importance
    9 = Extreme importance

    Matrix Properties:
    - Diagonal values are always 1.0 (component compared to itself)
    - Reciprocal property: If A/B = 3, then B/A = 1/3
    - Consistency Ratio < 0.1 indicates acceptable consistency
    "#
    .to_string()
}

fn create_network_interpretation_guide() -> String {
    r#"Network Dependency Matrix Interpretation:

    Values (0.0 to 1.0):
    0.0 - 0.2 = Minimal dependency
    0.2 - 0.4 = Weak dependency
    0.4 - 0.6 = Moderate dependency
    0.6 - 0.8 = Strong dependency
    0.8 - 1.0 = Very strong dependency

    PageRank weights show overall system importance.
    Cascade weights show vulnerability to cascading failures.
    "#
    .to_string()
}

fn matrix_to_csv(matrix: &[Vec<f64>], headers: &[String]) -> String {
    let mut csv = String::new();

    // Header row
    csv.push_str(",");
    csv.push_str(&headers.join(","));
    csv.push('\n');

    // Data rows
    for (i, row) in matrix.iter().enumerate() {
        csv.push_str(&headers[i]);
        csv.push(',');
        csv.push_str(
            &row.iter()
                .map(|v| format!("{:.4}", v))
                .collect::<Vec<_>>()
                .join(","),
        );
        csv.push('\n');
    }

    csv
}

// Response types

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
pub struct PairwiseComparison {
    pub component_a: String,
    pub component_b: String,
    pub value: f64,
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
pub struct ConsistencyInfo {
    pub consistency_ratio: f64,
    pub is_consistent: bool,
    pub lambda_max: f64,
    pub consistency_index: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MatrixExportResponse {
    pub ahp_matrix_csv: String,
    pub network_matrix_csv: String,
    pub timestamp: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_ahp_matrix() {
        let service = MatrixGenerationService::new();
        let response = service.generate_ahp_matrix().unwrap();

        assert!(!response.matrix.is_empty());
        assert_eq!(response.matrix.len(), response.component_names.len());
        assert!(response.consistency_ratio >= 0.0);
    }

    #[test]
    fn test_generate_network_matrix() {
        let service = MatrixGenerationService::new();
        let response = service.generate_network_matrix().unwrap();

        assert!(!response.dependency_matrix.is_empty());
        assert_eq!(
            response.dependency_matrix.len(),
            response.component_names.len()
        );
    }
}
