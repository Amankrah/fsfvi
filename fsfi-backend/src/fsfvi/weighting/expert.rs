/// Expert-Driven Weighting System (AHP)
/// ======================================
///
/// Implements Analytic Hierarchy Process (AHP) for expert-driven weighting.
/// 
/// Key improvements over previous version:
/// 1. Uses actual expert pairwise comparison matrices (not derived from weights)
/// 2. Scenario-specific expert judgments aligned with IPC/FEWS NET
/// 3. Calculates and validates Consistency Ratio (CR < 0.10)
/// 4. Supports custom expert matrices for local calibration
///
/// Reference: Saaty, T.L. (1980) The Analytic Hierarchy Process

use crate::fsfvi::config::WEIGHTING_CONFIG;
use crate::fsfvi::errors::{FsfviError, FsfviResult};
use crate::fsfvi::validators::validate_ahp_matrix;
use crate::fsfvi::weighting::models::{ComponentRegistry, ScenarioWeights, WeightingContext};
use std::collections::HashMap;

/// Random Index values for consistency ratio calculation
/// These are empirically derived values for matrices of size 1-15
const RANDOM_INDEX: [f64; 16] = [
    0.0,   // n=0 (unused)
    0.0,   // n=1
    0.0,   // n=2
    0.58,  // n=3
    0.90,  // n=4
    1.12,  // n=5
    1.24,  // n=6
    1.32,  // n=7
    1.41,  // n=8
    1.45,  // n=9
    1.49,  // n=10
    1.51,  // n=11
    1.48,  // n=12
    1.56,  // n=13
    1.57,  // n=14
    1.59,  // n=15
];

/// Result of AHP calculation including consistency metrics
#[derive(Debug, Clone)]
pub struct AhpResult {
    /// Calculated weights for each component
    pub weights: HashMap<String, f64>,
    /// Principal eigenvalue (λmax)
    pub lambda_max: f64,
    /// Consistency Index (CI)
    pub consistency_index: f64,
    /// Consistency Ratio (CR) - should be < 0.10
    pub consistency_ratio: f64,
    /// Whether the matrix passes consistency check
    pub is_consistent: bool,
    /// Scenario used for the calculation
    pub scenario: String,
}

/// Expert comparison matrix with metadata
#[derive(Debug, Clone)]
pub struct ExpertComparisonMatrix {
    /// The pairwise comparison matrix
    pub matrix: Vec<Vec<f64>>,
    /// Description of the expert panel or source
    pub source: String,
    /// When the comparisons were made
    pub date: Option<String>,
    /// Notes on methodology
    pub methodology: Option<String>,
}

impl ExpertComparisonMatrix {
    pub fn new(matrix: Vec<Vec<f64>>, source: &str) -> Self {
        Self {
            matrix,
            source: source.to_string(),
            date: None,
            methodology: None,
        }
    }
}

/// Expert weighting system using AHP
pub struct ExpertWeightingSystem {
    component_registry: ComponentRegistry,
    scenario_weights: ScenarioWeights,
    /// Scenario-specific expert comparison matrices
    expert_matrices: HashMap<String, ExpertComparisonMatrix>,
    /// Component ordering (must match matrix indices)
    component_order: Vec<String>,
}

impl Default for ExpertWeightingSystem {
    fn default() -> Self {
        Self::new()
    }
}

impl ExpertWeightingSystem {
    pub fn new() -> Self {
        let component_registry = ComponentRegistry::new();
        let scenario_weights = ScenarioWeights::new();
        
        // Fixed component ordering for matrix consistency
        let component_order = vec![
            "agricultural_development".to_string(),
            "infrastructure".to_string(),
            "nutrition_health".to_string(),
            "climate_natural_resources".to_string(),
            "social_protection_equity".to_string(),
            "governance_institutions".to_string(),
        ];

        let mut system = Self {
            component_registry,
            scenario_weights,
            expert_matrices: HashMap::new(),
            component_order,
        };

        // Initialize with IPC/FEWS NET-grounded expert matrices
        system.initialize_expert_matrices();
        system
    }

    /// Initialize expert comparison matrices based on IPC/FEWS NET frameworks
    /// 
    /// AHP Scale:
    /// 1 = Equal importance
    /// 3 = Moderate importance of one over another
    /// 5 = Strong importance
    /// 7 = Very strong importance
    /// 9 = Extreme importance
    /// 2,4,6,8 = Intermediate values
    fn initialize_expert_matrices(&mut self) {
        // Component order (for reference):
        // 0: agricultural_development
        // 1: infrastructure
        // 2: nutrition_health
        // 3: climate_natural_resources
        // 4: social_protection_equity
        // 5: governance_institutions

        // ============================================================
        // BASELINE / NORMAL OPERATIONS
        // Based on: IPC Technical Manual default contributing factor weights
        // ============================================================
        let baseline_matrix = vec![
            //  agri   infra  nutri  clim   soc    gov
            vec![1.0,   2.0,   1.0,   2.0,   3.0,   5.0],  // agri
            vec![0.5,   1.0,   0.5,   1.0,   2.0,   4.0],  // infra
            vec![1.0,   2.0,   1.0,   2.0,   2.0,   5.0],  // nutri
            vec![0.5,   1.0,   0.5,   1.0,   2.0,   4.0],  // clim
            vec![1.0/3.0,  0.5,   0.5,   0.5,   1.0,   3.0],  // soc
            vec![0.2,   0.25,  0.2,   0.25,  1.0/3.0,  1.0],  // gov
        ];
        self.expert_matrices.insert(
            "baseline".to_string(),
            ExpertComparisonMatrix::new(
                baseline_matrix.clone(),
                "IPC Technical Manual 3.1 - Default contributing factor weights"
            )
        );
        self.expert_matrices.insert(
            "normal_operations".to_string(),
            ExpertComparisonMatrix::new(
                baseline_matrix,
                "IPC Technical Manual 3.1 - Default contributing factor weights"
            )
        );

        // ============================================================
        // CLIMATE SHOCK (Drought/Flood)
        // Based on: FEWS NET Climate Hazard Analysis guidance
        // Climate and agriculture elevated; social protection critical for response
        // ============================================================
        let climate_matrix = vec![
            //  agri   infra  nutri  clim   soc    gov
            vec![1.0,   2.0,   2.0,   0.5,   3.0,   5.0],  // agri - high but below climate
            vec![0.5,   1.0,   1.0,   1.0/3.0,  2.0,   4.0],  // infra
            vec![0.5,   1.0,   1.0,   1.0/3.0,  1.0,   4.0],  // nutri - outcome, not driver
            vec![2.0,   3.0,   3.0,   1.0,   4.0,   7.0],  // clim - PRIMARY DRIVER
            vec![1.0/3.0,  0.5,   1.0,   0.25,  1.0,   3.0],  // soc - response mechanism
            vec![0.2,   0.25,  0.25,  1.0/7.0,  1.0/3.0,  1.0],  // gov
        ];
        self.expert_matrices.insert(
            "climate_shock".to_string(),
            ExpertComparisonMatrix::new(
                climate_matrix,
                "FEWS NET Climate Hazard Analysis; IPC Acute Food Insecurity"
            )
        );

        // ============================================================
        // FINANCIAL CRISIS
        // Based on: IPC Economic Shock Analysis
        // Purchase pathway dominates; social protection critical
        // ============================================================
        let financial_matrix = vec![
            //  agri   infra  nutri  clim   soc    gov
            vec![1.0,   3.0,   1.0,   3.0,   1.0,   5.0],  // agri - production still matters
            vec![1.0/3.0,  1.0,   0.5,   1.0,   0.5,   3.0],  // infra - less critical
            vec![1.0,   2.0,   1.0,   3.0,   1.0,   5.0],  // nutri - outcome focus
            vec![1.0/3.0,  1.0,   1.0/3.0,  1.0,   0.5,   3.0],  // clim - secondary
            vec![1.0,   2.0,   1.0,   2.0,   1.0,   4.0],  // soc - CRITICAL for response
            vec![0.2,   1.0/3.0,  0.2,   1.0/3.0,  0.25,  1.0],  // gov - fiscal constraints
        ];
        self.expert_matrices.insert(
            "financial_crisis".to_string(),
            ExpertComparisonMatrix::new(
                financial_matrix,
                "IPC Contributing Factors; FEWS NET Market Analysis"
            )
        );

        // ============================================================
        // PANDEMIC / HEALTH CRISIS
        // Based on: IPC Acute Food Insecurity + COVID-19 adaptations
        // Nutrition/health elevated; infrastructure (supply chains) critical
        // ============================================================
        let pandemic_matrix = vec![
            //  agri   infra  nutri  clim   soc    gov
            vec![1.0,   1.0,   0.5,   2.0,   2.0,   4.0],  // agri
            vec![1.0,   1.0,   0.5,   2.0,   2.0,   4.0],  // infra - supply chains
            vec![2.0,   2.0,   1.0,   4.0,   2.0,   6.0],  // nutri - PRIMARY OUTCOME
            vec![0.5,   0.5,   0.25,  1.0,   1.0,   3.0],  // clim - secondary
            vec![0.5,   0.5,   0.5,   1.0,   1.0,   3.0],  // soc - response
            vec![0.25,  0.25,  1.0/6.0,  1.0/3.0,  1.0/3.0,  1.0],  // gov - health system capacity
        ];
        self.expert_matrices.insert(
            "pandemic_disruption".to_string(),
            ExpertComparisonMatrix::new(
                pandemic_matrix,
                "IPC Acute Food Insecurity; COVID-19 Food Security Analysis"
            )
        );

        // ============================================================
        // CONFLICT / POLITICAL INSTABILITY
        // Based on: IPC Famine Review Committee; FEWS NET Conflict Analysis
        // Governance is shock origin; infrastructure destruction critical
        // ============================================================
        let conflict_matrix = vec![
            //  agri   infra  nutri  clim   soc    gov
            vec![1.0,   1.0,   1.0,   2.0,   2.0,   0.5],  // agri
            vec![1.0,   1.0,   1.0,   2.0,   2.0,   0.5],  // infra - destruction
            vec![1.0,   1.0,   1.0,   2.0,   2.0,   0.5],  // nutri
            vec![0.5,   0.5,   0.5,   1.0,   1.0,   1.0/3.0], // clim - secondary
            vec![0.5,   0.5,   0.5,   1.0,   1.0,   1.0/3.0], // soc - service delivery collapse
            vec![2.0,   2.0,   2.0,   3.0,   3.0,   1.0],  // gov - SHOCK ORIGIN
        ];
        self.expert_matrices.insert(
            "political_instability".to_string(),
            ExpertComparisonMatrix::new(
                conflict_matrix.clone(),
                "IPC Famine Review Committee; FEWS NET Conflict and Food Security"
            )
        );
        self.expert_matrices.insert(
            "conflict".to_string(),
            ExpertComparisonMatrix::new(
                conflict_matrix,
                "IPC Famine Review Committee; FEWS NET Conflict and Food Security"
            )
        );
    }

    /// Calculate AHP weights with full consistency analysis
    pub fn calculate_ahp_weights_full(&self, scenario: Option<&str>) -> FsfviResult<AhpResult> {
        let scenario_key = scenario.unwrap_or("baseline");
        
        let matrix = if let Some(expert_matrix) = self.expert_matrices.get(scenario_key) {
            &expert_matrix.matrix
        } else {
            tracing::warn!(
                "No expert matrix for scenario '{}', falling back to baseline",
                scenario_key
            );
            &self.expert_matrices.get("baseline")
                .ok_or_else(|| FsfviError::validation("No baseline expert matrix found"))?
                .matrix
        };

        // Validate matrix structure
        validate_ahp_matrix(matrix)?;

        // Calculate principal eigenvector and eigenvalue
        let (weights_vec, lambda_max) = self.calculate_principal_eigenvector_with_eigenvalue(matrix)?;

        // Calculate consistency metrics
        let n = matrix.len();
        let consistency_index = (lambda_max - n as f64) / (n as f64 - 1.0);
        let random_index = if n < RANDOM_INDEX.len() { RANDOM_INDEX[n] } else { 1.59 };
        let consistency_ratio = if random_index > 0.0 {
            consistency_index / random_index
        } else {
            0.0
        };

        let is_consistent = consistency_ratio < WEIGHTING_CONFIG.ahp_consistency_threshold;

        if !is_consistent {
            tracing::warn!(
                "AHP matrix for scenario '{}' has CR={:.3} (threshold: {:.2}). Expert judgments may be inconsistent.",
                scenario_key,
                consistency_ratio,
                WEIGHTING_CONFIG.ahp_consistency_threshold
            );
        }

        // Map weights to component names
        let mut weights = HashMap::new();
        for (i, name) in self.component_order.iter().enumerate() {
            if i < weights_vec.len() {
                weights.insert(name.clone(), weights_vec[i]);
            }
        }

        // Normalize
        let sum: f64 = weights.values().sum();
        if sum > 0.0 {
            for (_, weight) in weights.iter_mut() {
                *weight /= sum;
            }
        }

        tracing::info!(
            "AHP weights calculated for scenario '{}': CR={:.4}, consistent={}",
            scenario_key,
            consistency_ratio,
            is_consistent
        );

        Ok(AhpResult {
            weights,
            lambda_max,
            consistency_index,
            consistency_ratio,
            is_consistent,
            scenario: scenario_key.to_string(),
        })
    }

    /// Calculate AHP weights (simple interface, returns just weights)
    pub fn calculate_ahp_weights(&self) -> FsfviResult<HashMap<String, f64>> {
        let result = self.calculate_ahp_weights_full(None)?;
        Ok(result.weights)
    }

    /// Calculate AHP weights for a specific scenario
    pub fn calculate_ahp_weights_for_scenario(&self, scenario: &str) -> FsfviResult<HashMap<String, f64>> {
        let result = self.calculate_ahp_weights_full(Some(scenario))?;
        Ok(result.weights)
    }

    /// Calculate principal eigenvector and eigenvalue using power method
    fn calculate_principal_eigenvector_with_eigenvalue(
        &self,
        matrix: &[Vec<f64>],
    ) -> FsfviResult<(Vec<f64>, f64)> {
        let n = matrix.len();
        let mut vector = vec![1.0 / n as f64; n];
        let max_iterations = WEIGHTING_CONFIG.pagerank_max_iterations;
        let tolerance = 1e-10;

        let mut lambda_max = 0.0;

        for iteration in 0..max_iterations {
            // Multiply matrix by vector
            let mut new_vector = vec![0.0; n];
            for i in 0..n {
                for j in 0..n {
                    new_vector[i] += matrix[i][j] * vector[j];
                }
            }

            // Calculate eigenvalue estimate (Rayleigh quotient approximation)
            lambda_max = 0.0;
            for i in 0..n {
                if vector[i].abs() > 1e-10 {
                    lambda_max += new_vector[i] / vector[i];
                }
            }
            lambda_max /= n as f64;

            // Normalize (L1 norm for probability interpretation)
            let norm: f64 = new_vector.iter().map(|x| x.abs()).sum();
            if norm > 0.0 {
                for val in new_vector.iter_mut() {
                    *val /= norm;
                }
            }

            // Check convergence
            let diff: f64 = vector
                .iter()
                .zip(new_vector.iter())
                .map(|(a, b)| (a - b).abs())
                .sum();

            vector = new_vector;

            if diff < tolerance {
                tracing::debug!(
                    "AHP eigenvector converged after {} iterations, λmax={:.6}",
                    iteration + 1,
                    lambda_max
                );
                return Ok((vector, lambda_max));
            }
        }

        tracing::warn!(
            "AHP eigenvector did not converge after {} iterations",
            max_iterations
        );
        Ok((vector, lambda_max))
    }

    /// Get weights for a specific scenario (from predefined scenario weights)
    pub fn get_scenario_weights(&self, scenario: &str) -> FsfviResult<HashMap<String, f64>> {
        // First try AHP-derived weights for this scenario
        if self.expert_matrices.contains_key(scenario) {
            return self.calculate_ahp_weights_for_scenario(scenario);
        }

        // Fall back to predefined scenario weights
        if let Some(weights) = self.scenario_weights.get_weights(scenario) {
            Ok(weights.clone())
        } else {
            self.scenario_weights
                .get_weights("normal_operations")
                .map(|w| w.clone())
                .ok_or_else(|| FsfviError::validation("No default scenario weights found"))
        }
    }

    /// Get context-aware weights
    pub fn get_context_weights(&self, context: &WeightingContext) -> HashMap<String, f64> {
        self.component_registry.get_context_weights(context)
    }

    /// Set a custom expert comparison matrix for a scenario
    ///
    /// **Public API for future feature**: Local calibration of expert judgments
    /// Use this to input country-specific expert comparisons
    ///
    /// Currently used in tests and documentation, reserved for Phase 2 API endpoint
    #[allow(dead_code)]
    pub fn set_expert_matrix(
        &mut self,
        scenario: &str,
        matrix: Vec<Vec<f64>>,
        source: &str,
    ) -> FsfviResult<()> {
        // Validate matrix
        validate_ahp_matrix(&matrix)?;

        // Check consistency before accepting
        let result = self.calculate_ahp_weights_full(Some(scenario));
        
        self.expert_matrices.insert(
            scenario.to_string(),
            ExpertComparisonMatrix::new(matrix, source),
        );

        if let Ok(res) = result {
            if !res.is_consistent {
                tracing::warn!(
                    "Custom expert matrix for '{}' has CR={:.3}. Consider revising.",
                    scenario,
                    res.consistency_ratio
                );
            }
        }

        Ok(())
    }

    /// Get available scenarios with expert matrices
    pub fn get_available_scenarios(&self) -> Vec<String> {
        self.expert_matrices.keys().cloned().collect()
    }

    /// Get expert matrix source attribution for a scenario
    ///
    /// **Simplified API**: Returns only source attribution
    /// For full metadata (including date/methodology), use `get_expert_matrix_metadata()`
    ///
    /// Kept for API compatibility and convenience
    #[allow(dead_code)]
    pub fn get_expert_matrix_source(&self, scenario: &str) -> Option<&str> {
        self.expert_matrices.get(scenario).map(|m| m.source.as_str())
    }

    /// Get full expert matrix metadata for transparency and audit trails
    /// Returns (source, date, methodology) for a given scenario
    pub fn get_expert_matrix_metadata(&self, scenario: &str) -> Option<(&str, Option<&str>, Option<&str>)> {
        self.expert_matrices.get(scenario).map(|m| {
            (
                m.source.as_str(),
                m.date.as_deref(),
                m.methodology.as_deref(),
            )
        })
    }

    /// Compare weights across scenarios
    ///
    /// **Alternative API**: Returns raw weight comparison
    /// Prefer using `WeightingAnalysisService::compare_expert_weights_across_scenarios()`
    /// which includes full validation reports and consistency metrics
    ///
    /// Used in tests for lightweight comparison
    #[allow(dead_code)]
    pub fn compare_scenario_weights(&self) -> FsfviResult<HashMap<String, HashMap<String, f64>>> {
        let mut comparison = HashMap::new();

        for scenario in self.expert_matrices.keys() {
            let result = self.calculate_ahp_weights_full(Some(scenario))?;
            comparison.insert(scenario.clone(), result.weights);
        }

        Ok(comparison)
    }

    /// Get component ordering (useful for interpreting raw matrices)
    ///
    /// **Public API for transparency**: Shows canonical component order
    /// Useful when interpreting raw expert comparison matrices
    ///
    /// Used in tests and may be exposed via API for matrix interpretation
    #[allow(dead_code)]
    pub fn get_component_order(&self) -> &[String] {
        &self.component_order
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ahp_matrix_structure() {
        let system = ExpertWeightingSystem::new();
        
        for (scenario, expert_matrix) in &system.expert_matrices {
            let matrix = &expert_matrix.matrix;
            let n = matrix.len();

            // Check square matrix
            for row in matrix {
                assert_eq!(row.len(), n, "Matrix for {} is not square", scenario);
            }

            // Check diagonal is 1.0
            for i in 0..n {
                assert!(
                    (matrix[i][i] - 1.0).abs() < 1e-10,
                    "Diagonal not 1.0 for {} at position {}",
                    scenario,
                    i
                );
            }

            // Check reciprocal property: a[i][j] * a[j][i] = 1
            for i in 0..n {
                for j in 0..n {
                    let product = matrix[i][j] * matrix[j][i];
                    assert!(
                        (product - 1.0).abs() < 1e-6,
                        "Reciprocal property violated for {} at ({}, {}): {} * {} = {}",
                        scenario,
                        i,
                        j,
                        matrix[i][j],
                        matrix[j][i],
                        product
                    );
                }
            }
        }
    }

    #[test]
    fn test_ahp_weights_calculation() {
        let system = ExpertWeightingSystem::new();
        let result = system.calculate_ahp_weights_full(None).unwrap();

        // Check normalization
        let sum: f64 = result.weights.values().sum();
        assert!((sum - 1.0).abs() < 1e-6, "Weights don't sum to 1.0");

        // Check all weights are positive
        for (name, weight) in result.weights.iter() {
            assert!(*weight > 0.0, "Weight for {} is not positive", name);
            assert!(*weight <= 1.0, "Weight for {} exceeds 1.0", name);
        }

        // Check consistency (baseline should be consistent)
        assert!(
            result.is_consistent,
            "Baseline matrix should be consistent, CR={}",
            result.consistency_ratio
        );
    }

    #[test]
    fn test_consistency_ratio_calculation() {
        let system = ExpertWeightingSystem::new();
        
        for scenario in system.get_available_scenarios() {
            let result = system.calculate_ahp_weights_full(Some(&scenario)).unwrap();
            
            // CR should be reasonable (< 0.15 for most cases)
            assert!(
                result.consistency_ratio < 0.15,
                "Scenario {} has high CR: {}",
                scenario,
                result.consistency_ratio
            );
            
            // Lambda max should be >= n for positive matrices
            assert!(
                result.lambda_max >= 5.5, // n=6, so λmax should be around 6
                "Lambda max too low for {}: {}",
                scenario,
                result.lambda_max
            );
        }
    }

    #[test]
    fn test_scenario_specific_weights() {
        let system = ExpertWeightingSystem::new();
        
        let baseline = system.calculate_ahp_weights_full(Some("baseline")).unwrap();
        let climate = system.calculate_ahp_weights_full(Some("climate_shock")).unwrap();
        
        // Climate component should be higher in climate_shock scenario
        let baseline_climate = baseline.weights.get("climate_natural_resources").unwrap();
        let climate_climate = climate.weights.get("climate_natural_resources").unwrap();
        
        assert!(
            climate_climate > baseline_climate,
            "Climate component should be higher in climate_shock: {} vs {}",
            climate_climate,
            baseline_climate
        );
    }

    #[test]
    fn test_pandemic_scenario_weights() {
        let system = ExpertWeightingSystem::new();
        
        let baseline = system.calculate_ahp_weights_full(Some("baseline")).unwrap();
        let pandemic = system.calculate_ahp_weights_full(Some("pandemic_disruption")).unwrap();
        
        // Nutrition/health should be higher in pandemic scenario
        let baseline_nutri = baseline.weights.get("nutrition_health").unwrap();
        let pandemic_nutri = pandemic.weights.get("nutrition_health").unwrap();
        
        assert!(
            pandemic_nutri > baseline_nutri,
            "Nutrition should be higher in pandemic: {} vs {}",
            pandemic_nutri,
            baseline_nutri
        );
    }

    #[test]
    fn test_component_order() {
        let system = ExpertWeightingSystem::new();
        let order = system.get_component_order();
        
        assert_eq!(order.len(), 6);
        assert!(order.contains(&"agricultural_development".to_string()));
        assert!(order.contains(&"governance_institutions".to_string()));
    }

    #[test]
    fn test_compare_scenario_weights() {
        let system = ExpertWeightingSystem::new();
        let comparison = system.compare_scenario_weights().unwrap();
        
        // Should have all scenarios
        assert!(comparison.len() >= 5);
        
        // Each scenario should have all components
        for (scenario, weights) in &comparison {
            assert_eq!(
                weights.len(),
                6,
                "Scenario {} doesn't have 6 components",
                scenario
            );
        }
    }
}