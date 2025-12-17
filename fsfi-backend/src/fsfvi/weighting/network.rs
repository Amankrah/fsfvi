/// Network Centrality Analysis
/// ============================
///
/// Implements PageRank and cascade multiplier calculations for
/// component weighting based on system interdependencies.
///
/// Uses IPC/FEWS NET-grounded relationship matrices from ComponentRegistry.

use crate::fsfvi::config::WEIGHTING_CONFIG;
use crate::fsfvi::errors::FsfviResult;
use crate::fsfvi::validators::validate_dependency_matrix;
use crate::fsfvi::weighting::models::ComponentRegistry;
use std::collections::HashMap;

/// Network centrality analyzer
/// 
/// Calculates PageRank and cascade multipliers based on food system
/// interdependencies. Supports scenario-specific relationship matrices.
pub struct NetworkCentralityAnalyzer {
    dependency_matrix: Vec<Vec<f64>>,
    component_names: Vec<String>,
    current_scenario: String,
}

impl NetworkCentralityAnalyzer {
    /// Create a new analyzer with baseline scenario
    pub fn new() -> Self {
        Self::with_scenario(None)
    }

    /// Create analyzer for a specific scenario
    /// 
    /// # Arguments
    /// * `scenario` - Scenario name (e.g., "climate_shock", "financial_crisis")
    ///               If None, uses "baseline"
    pub fn with_scenario(scenario: Option<&str>) -> Self {
        let component_registry = ComponentRegistry::new();
        let component_names = component_registry.get_component_names();
        let scenario_key = scenario.unwrap_or("baseline");
        let dependency_matrix = component_registry.get_dependency_matrix(Some(scenario_key));

        tracing::info!(
            "NetworkCentralityAnalyzer initialized for scenario: {}",
            scenario_key
        );

        Self {
            dependency_matrix,
            component_names,
            current_scenario: scenario_key.to_string(),
        }
    }

    /// Update the dependency matrix for a different scenario
    ///
    /// **Test Utility**: This method is primarily used in tests to verify scenario switching.
    ///
    /// In production code, prefer creating a new analyzer with `with_scenario()` instead
    /// of mutating an existing one, as this makes the scenario explicit and avoids
    /// stateful mutations.
    ///
    /// **Example**:
    /// ```no_run
    /// // Prefer this (production):
    /// let analyzer = NetworkCentralityAnalyzer::with_scenario(Some("climate_shock"));
    ///
    /// // Over this (testing only):
    /// let mut analyzer = NetworkCentralityAnalyzer::new();
    /// analyzer.set_scenario("climate_shock");
    /// ```
    #[allow(dead_code)]
    pub fn set_scenario(&mut self, scenario: &str) {
        let component_registry = ComponentRegistry::new();
        self.dependency_matrix = component_registry.get_dependency_matrix(Some(scenario));
        self.current_scenario = scenario.to_string();

        tracing::info!(
            "NetworkCentralityAnalyzer updated to scenario: {}",
            scenario
        );
    }

    /// Get current scenario
    ///
    /// **Test Utility**: Returns the current scenario name.
    ///
    /// Primarily used in tests to verify scenario configuration.
    #[allow(dead_code)]
    pub fn current_scenario(&self) -> &str {
        &self.current_scenario
    }

    /// Calculate PageRank centrality weights
    ///
    /// PageRank models the importance of components based on the network
    /// of dependencies. Components that are heavily depended upon by
    /// other important components get higher weights.
    ///
    /// Formula: PR(i) = (1-d)/N + d × Σⱼ PR(j)/L(j)
    /// where:
    /// - d: damping factor (typically 0.85)
    /// - N: number of components
    /// - L(j): number of outgoing links from j
    pub fn calculate_pagerank_centrality(
        &self,
        damping: Option<f64>,
    ) -> FsfviResult<HashMap<String, f64>> {
        // Validate dependency matrix
        validate_dependency_matrix(&self.dependency_matrix)?;

        let damping = damping.unwrap_or(WEIGHTING_CONFIG.pagerank_damping);
        let n = self.dependency_matrix.len();

        // Create transition matrix
        let transition_matrix = self.create_transition_matrix();

        // Initialize PageRank vector with equal probabilities
        let mut pagerank = vec![1.0 / n as f64; n];
        let tolerance = WEIGHTING_CONFIG.pagerank_tolerance;
        let max_iterations = WEIGHTING_CONFIG.pagerank_max_iterations;

        // PageRank iteration
        for iteration in 0..max_iterations {
            let mut new_pagerank = vec![0.0; n];

            for i in 0..n {
                let mut sum = 0.0;
                for j in 0..n {
                    sum += transition_matrix[j][i] * pagerank[j];
                }
                new_pagerank[i] = (1.0 - damping) / n as f64 + damping * sum;
            }

            // Check convergence
            let diff: f64 = pagerank
                .iter()
                .zip(new_pagerank.iter())
                .map(|(old, new)| (old - new).abs())
                .sum();

            pagerank = new_pagerank;

            if diff < tolerance {
                tracing::info!(
                    "PageRank converged after {} iterations (scenario: {})",
                    iteration + 1,
                    self.current_scenario
                );
                break;
            }

            if iteration == max_iterations - 1 {
                tracing::warn!(
                    "PageRank did not converge after {} iterations (scenario: {})",
                    max_iterations,
                    self.current_scenario
                );
            }
        }

        // Normalize
        let sum: f64 = pagerank.iter().sum();
        if sum > 0.0 {
            for val in pagerank.iter_mut() {
                *val /= sum;
            }
        }

        // Create result map
        let mut result = HashMap::new();
        for (i, name) in self.component_names.iter().enumerate() {
            result.insert(name.clone(), pagerank[i]);
        }

        tracing::info!(
            "PageRank centrality calculated for scenario '{}'. Total: {:.6}",
            self.current_scenario,
            result.values().sum::<f64>()
        );

        Ok(result)
    }

    /// Calculate cascade impact multipliers
    ///
    /// Cascade multipliers measure how failures in one component
    /// can cascade through the system affecting other components.
    ///
    /// Higher multipliers indicate components whose failure would
    /// have widespread system impacts.
    pub fn calculate_cascade_multipliers(&self) -> FsfviResult<HashMap<String, f64>> {
        let n = self.component_names.len();
        let mut cascade_impacts = HashMap::new();

        for i in 0..n {
            let component_name = &self.component_names[i];

            // Primary impact: direct dependencies on this component
            // (how many other components directly depend on this one)
            let mut primary_impact = 0.0;
            for j in 0..n {
                if i != j {
                    // dependency_matrix[j][i] = effect of i's failure on j
                    primary_impact += self.dependency_matrix[i][j];
                }
            }

            // Secondary impact: cascading effects
            // (if this component fails, affecting j, how much does j's degradation
            //  then affect other components k)
            let mut secondary_impact = 0.0;
            for j in 0..n {
                if i != j {
                    let i_to_j_impact = self.dependency_matrix[i][j];

                    // Downstream effects from j to all k
                    let mut j_downstream = 0.0;
                    for k in 0..n {
                        if k != j && k != i {
                            j_downstream += self.dependency_matrix[j][k];
                        }
                    }

                    // Add to secondary impact with damping factor
                    // (second-order effects are typically dampened)
                    secondary_impact += i_to_j_impact * j_downstream * 0.5;
                }
            }

            // Total impact = direct + cascading effects
            let total_impact = primary_impact + secondary_impact;
            cascade_impacts.insert(component_name.clone(), total_impact.max(0.0));
        }

        // Normalize to [0, 1] first
        let max_impact = cascade_impacts
            .values()
            .max_by(|a, b| a.partial_cmp(b).unwrap())
            .copied()
            .unwrap_or(1.0);

        if max_impact > 1e-10 {
            for (_, impact) in cascade_impacts.iter_mut() {
                *impact /= max_impact;
            }
        }

        // Final normalization to sum to 1.0 (for use as weights)
        let sum: f64 = cascade_impacts.values().sum();
        if sum > 0.0 {
            for (_, impact) in cascade_impacts.iter_mut() {
                *impact /= sum;
            }
        }

        tracing::info!(
            "Cascade multipliers calculated for scenario '{}'. Total: {:.6}",
            self.current_scenario,
            cascade_impacts.values().sum::<f64>()
        );

        Ok(cascade_impacts)
    }

    /// Create transition matrix for PageRank
    fn create_transition_matrix(&self) -> Vec<Vec<f64>> {
        let n = self.dependency_matrix.len();
        let mut transition = vec![vec![0.0; n]; n];

        for i in 0..n {
            // Calculate row sum (outgoing dependencies)
            let row_sum: f64 = self.dependency_matrix[i].iter().sum();

            if row_sum > 1e-10 {
                for j in 0..n {
                    transition[i][j] = self.dependency_matrix[i][j] / row_sum;
                }
            } else {
                // If no outgoing links, uniform distribution (dangling node)
                for j in 0..n {
                    transition[i][j] = 1.0 / n as f64;
                }
            }
        }

        transition
    }

    /// Get component names
    pub fn get_component_names(&self) -> &[String] {
        &self.component_names
    }

    /// Get dependency matrix
    pub fn get_dependency_matrix(&self) -> &[Vec<f64>] {
        &self.dependency_matrix
    }

    /// Calculate PageRank sensitivity to relationship weights
    ///
    /// **Analysis Utility**: This method is intended for validation and research purposes.
    ///
    /// Returns how much PageRank scores change when each relationship
    /// is perturbed by a small amount. Useful for identifying which
    /// relationships have the most influence on results.
    ///
    /// **Use Cases**:
    /// - Sensitivity analysis for government analysts
    /// - Identifying critical relationships in the food system network
    /// - Validating robustness of weighting methodology
    ///
    /// Note: Currently used in tests and documented in INTEGRATION_GUIDE.
    /// Not exposed through API endpoints. Could be added to admin/analysis endpoints.
    #[allow(dead_code)]
    pub fn calculate_relationship_sensitivity(
        &self,
        perturbation: f64,
    ) -> FsfviResult<HashMap<(String, String), f64>> {
        let base_pagerank = self.calculate_pagerank_centrality(None)?;
        let n = self.component_names.len();
        let mut sensitivities = HashMap::new();

        for i in 0..n {
            for j in 0..n {
                if i != j && self.dependency_matrix[i][j] > 0.0 {
                    // Create perturbed matrix
                    let mut perturbed_matrix = self.dependency_matrix.clone();
                    perturbed_matrix[i][j] += perturbation;

                    // Create temporary analyzer with perturbed matrix
                    let perturbed_analyzer = Self {
                        dependency_matrix: perturbed_matrix,
                        component_names: self.component_names.clone(),
                        current_scenario: self.current_scenario.clone(),
                    };

                    let perturbed_pagerank = perturbed_analyzer.calculate_pagerank_centrality(None)?;

                    // Calculate total change in PageRank scores
                    let mut total_change = 0.0;
                    for name in &self.component_names {
                        let base = base_pagerank.get(name).copied().unwrap_or(0.0);
                        let perturbed = perturbed_pagerank.get(name).copied().unwrap_or(0.0);
                        total_change += (perturbed - base).abs();
                    }

                    let source = self.component_names[i].clone();
                    let target = self.component_names[j].clone();
                    sensitivities.insert((source, target), total_change / perturbation);
                }
            }
        }

        Ok(sensitivities)
    }
}

impl Default for NetworkCentralityAnalyzer {
    fn default() -> Self {
        Self::new()
    }
}

/// Calculate eigenvector centrality
///
/// **Analysis Utility**: This function is intended for validation and research purposes.
///
/// Eigenvector centrality assigns scores to components based on the
/// principle that connections to high-scoring components contribute
/// more to the score of the component in question.
///
/// This is an alternative to PageRank that can be used for validation
/// or sensitivity analysis (do conclusions change with different algorithms?).
///
/// **Use Cases**:
/// - Comparing different centrality algorithms for robustness
/// - Academic transparency and methodology validation
/// - Cross-checking PageRank results
///
/// Note: Currently used in tests and `compare_centrality_methods()`.
/// Not exposed through API endpoints. Could be added to admin/analysis endpoints.
#[allow(dead_code)]
pub fn calculate_eigenvector_centrality(
    dependency_matrix: &[Vec<f64>],
    component_names: &[String],
) -> FsfviResult<HashMap<String, f64>> {
    let n = dependency_matrix.len();
    let mut centrality = vec![1.0 / n as f64; n]; // Initial values
    let max_iterations = WEIGHTING_CONFIG.pagerank_max_iterations;
    let tolerance = 1e-8;

    for iteration in 0..max_iterations {
        let mut new_centrality = vec![0.0; n];

        // Multiply by adjacency matrix
        for i in 0..n {
            for j in 0..n {
                new_centrality[i] += dependency_matrix[j][i] * centrality[j];
            }
        }

        // Normalize (eigenvector normalization)
        let norm: f64 = new_centrality.iter().map(|x| x * x).sum::<f64>().sqrt();
        if norm > 1e-10 {
            for val in new_centrality.iter_mut() {
                *val /= norm;
            }
        }

        // Check convergence
        let diff: f64 = centrality
            .iter()
            .zip(new_centrality.iter())
            .map(|(old, new)| (old - new).abs())
            .sum();

        centrality = new_centrality;

        if diff < tolerance {
            tracing::debug!(
                "Eigenvector centrality converged after {} iterations",
                iteration + 1
            );
            break;
        }
    }

    // Normalize to sum to 1.0 (for use as weights)
    let sum: f64 = centrality.iter().sum();
    if sum > 0.0 {
        for val in centrality.iter_mut() {
            *val /= sum;
        }
    }

    // Create result map
    let mut result = HashMap::new();
    for (i, name) in component_names.iter().enumerate() {
        result.insert(name.clone(), centrality[i]);
    }

    Ok(result)
}

/// Compare PageRank and Eigenvector centrality results
///
/// **Analysis Utility**: This function is intended for validation and research purposes.
///
/// Returns correlation coefficient and max divergence between the two methods.
/// High correlation suggests conclusions are robust to algorithm choice.
///
/// **Use Cases**:
/// - Validating robustness of weighting methodology
/// - Academic peer review and methodology transparency
/// - Government analysts verifying consistency across algorithms
///
/// Note: Currently used in tests and documented in INTEGRATION_GUIDE.
/// Not exposed through API endpoints. Could be added to admin/analysis endpoints.
#[allow(dead_code)]
pub fn compare_centrality_methods(
    analyzer: &NetworkCentralityAnalyzer,
) -> FsfviResult<CentralityComparison> {
    let pagerank = analyzer.calculate_pagerank_centrality(None)?;
    let eigenvector = calculate_eigenvector_centrality(
        analyzer.get_dependency_matrix(),
        analyzer.get_component_names(),
    )?;

    let mut pr_values = Vec::new();
    let mut ev_values = Vec::new();
    let mut max_divergence = 0.0_f64;
    let mut max_divergence_component = String::new();

    for name in analyzer.get_component_names() {
        let pr = pagerank.get(name).copied().unwrap_or(0.0);
        let ev = eigenvector.get(name).copied().unwrap_or(0.0);
        pr_values.push(pr);
        ev_values.push(ev);

        let divergence = (pr - ev).abs();
        if divergence > max_divergence {
            max_divergence = divergence;
            max_divergence_component = name.clone();
        }
    }

    // Calculate Pearson correlation
    let n = pr_values.len() as f64;
    let pr_mean: f64 = pr_values.iter().sum::<f64>() / n;
    let ev_mean: f64 = ev_values.iter().sum::<f64>() / n;

    let mut numerator = 0.0;
    let mut pr_var = 0.0;
    let mut ev_var = 0.0;

    for (pr, ev) in pr_values.iter().zip(ev_values.iter()) {
        numerator += (pr - pr_mean) * (ev - ev_mean);
        pr_var += (pr - pr_mean).powi(2);
        ev_var += (ev - ev_mean).powi(2);
    }

    let correlation = if pr_var > 0.0 && ev_var > 0.0 {
        numerator / (pr_var.sqrt() * ev_var.sqrt())
    } else {
        1.0 // If no variance, methods agree
    };

    Ok(CentralityComparison {
        pagerank,
        eigenvector,
        correlation,
        max_divergence,
        max_divergence_component,
    })
}

/// Result of comparing centrality methods
///
/// **Analysis Utility**: This struct is used by `compare_centrality_methods()` for
/// validation and research purposes.
///
/// Contains results from both PageRank and Eigenvector centrality algorithms,
/// along with correlation metrics to assess robustness.
#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct CentralityComparison {
    pub pagerank: HashMap<String, f64>,
    pub eigenvector: HashMap<String, f64>,
    pub correlation: f64,
    pub max_divergence: f64,
    pub max_divergence_component: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pagerank_calculation() {
        let analyzer = NetworkCentralityAnalyzer::new();
        let pagerank = analyzer.calculate_pagerank_centrality(None).unwrap();

        // Check normalization
        let sum: f64 = pagerank.values().sum();
        assert!((sum - 1.0).abs() < 1e-6);

        // Check all values are positive
        for (_, weight) in pagerank.iter() {
            assert!(*weight > 0.0);
            assert!(*weight <= 1.0);
        }
    }

    #[test]
    fn test_scenario_specific_pagerank() {
        let baseline_analyzer = NetworkCentralityAnalyzer::with_scenario(Some("baseline"));
        let climate_analyzer = NetworkCentralityAnalyzer::with_scenario(Some("climate_shock"));

        let baseline_pr = baseline_analyzer.calculate_pagerank_centrality(None).unwrap();
        let climate_pr = climate_analyzer.calculate_pagerank_centrality(None).unwrap();

        // Results should differ between scenarios
        let baseline_climate = baseline_pr.get("climate_natural_resources").unwrap();
        let climate_climate = climate_pr.get("climate_natural_resources").unwrap();

        // In climate shock, climate component should have different centrality
        assert!((baseline_climate - climate_climate).abs() > 1e-6);
    }

    #[test]
    fn test_cascade_multipliers() {
        let analyzer = NetworkCentralityAnalyzer::new();
        let cascade = analyzer.calculate_cascade_multipliers().unwrap();

        // Check normalization
        let sum: f64 = cascade.values().sum();
        assert!((sum - 1.0).abs() < 1e-6);

        // Check all values are non-negative
        for (_, impact) in cascade.iter() {
            assert!(*impact >= 0.0);
            assert!(*impact <= 1.0);
        }
    }

    #[test]
    fn test_transition_matrix() {
        let analyzer = NetworkCentralityAnalyzer::new();
        let transition = analyzer.create_transition_matrix();

        // Each row should sum to 1.0
        for row in transition.iter() {
            let row_sum: f64 = row.iter().sum();
            assert!((row_sum - 1.0).abs() < 1e-6);
        }
    }

    #[test]
    fn test_eigenvector_centrality() {
        let analyzer = NetworkCentralityAnalyzer::new();
        let matrix = analyzer.get_dependency_matrix();
        let names = analyzer.get_component_names();

        let centrality = calculate_eigenvector_centrality(matrix, names).unwrap();

        // Check normalization
        let sum: f64 = centrality.values().sum();
        assert!((sum - 1.0).abs() < 1e-6);
    }

    #[test]
    fn test_centrality_comparison() {
        let analyzer = NetworkCentralityAnalyzer::new();
        let comparison = compare_centrality_methods(&analyzer).unwrap();

        // Both methods should produce normalized weights
        assert!((comparison.pagerank.values().sum::<f64>() - 1.0).abs() < 1e-6);
        assert!((comparison.eigenvector.values().sum::<f64>() - 1.0).abs() < 1e-6);

        // Correlation should be reasonably high (methods should roughly agree)
        assert!(comparison.correlation > 0.5);
    }

    #[test]
    fn test_set_scenario() {
        let mut analyzer = NetworkCentralityAnalyzer::new();
        assert_eq!(analyzer.current_scenario(), "baseline");

        analyzer.set_scenario("climate_shock");
        assert_eq!(analyzer.current_scenario(), "climate_shock");
    }
}