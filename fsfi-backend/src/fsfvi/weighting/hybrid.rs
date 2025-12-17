/// Hybrid Weighting System
/// ========================
///
/// Combines expert (AHP), network (PageRank), and financial weighting methods
/// to produce robust, multi-perspective component weights.

use crate::fsfvi::config::{normalize_component_type, WEIGHTING_CONFIG};
use crate::fsfvi::errors::FsfviResult;
use crate::fsfvi::validators::Component;
use crate::fsfvi::weighting::expert::ExpertWeightingSystem;
use crate::fsfvi::weighting::financial;
use crate::fsfvi::weighting::models::WeightingContext;
use crate::fsfvi::weighting::network::NetworkCentralityAnalyzer;
use std::collections::HashMap;

/// Hybrid weighting system
pub struct HybridWeightingSystem {
    expert_system: ExpertWeightingSystem,
    network_analyzer: NetworkCentralityAnalyzer,
}

impl Default for HybridWeightingSystem {
    fn default() -> Self {
        Self::new()
    }
}

impl HybridWeightingSystem {
    pub fn new() -> Self {
        Self {
            expert_system: ExpertWeightingSystem::new(),
            network_analyzer: NetworkCentralityAnalyzer::new(),
        }
    }

    /// Calculate hybrid weights combining all methods
    ///
    /// Formula: ω_hybrid = α·ω_expert + β·ω_pagerank + γ·ω_cascade + δ·ω_financial
    /// where α + β + γ + δ = 1.0
    ///
    /// Default coefficients from config:
    /// - Expert (AHP): 0.35
    /// - PageRank: 0.30
    /// - Cascade: 0.25
    /// - Financial: 0.10
    pub fn calculate_hybrid_weights(
        &self,
        components: &[Component],
        scenario: Option<&str>,
        context: Option<&WeightingContext>,
    ) -> FsfviResult<HashMap<String, f64>> {
        // Get weights from each method
        let expert_weights = if let Some(ctx) = context {
            self.expert_system.get_context_weights(ctx)
        } else if let Some(scen) = scenario {
            self.expert_system.get_scenario_weights(scen)?
        } else {
            self.expert_system.calculate_ahp_weights()?
        };

        // Use scenario-specific network analyzer if scenario provided
        // This ensures PageRank and cascade multipliers reflect scenario-specific relationships
        let (pagerank_weights, cascade_weights) = if let Some(scen) = scenario {
            let scenario_analyzer = NetworkCentralityAnalyzer::with_scenario(Some(scen));
            let pr = scenario_analyzer.calculate_pagerank_centrality(None)?;
            let cascade = scenario_analyzer.calculate_cascade_multipliers()?;
            (pr, cascade)
        } else {
            let pr = self.network_analyzer.calculate_pagerank_centrality(None)?;
            let cascade = self.network_analyzer.calculate_cascade_multipliers()?;
            (pr, cascade)
        };

        let financial_weights = financial::calculate_financial_weights(components)?;

        // Combine weights using hybrid coefficients
        let mut hybrid_weights = HashMap::new();

        // Get all unique component types from all weight sources
        let mut all_component_types = std::collections::HashSet::new();
        for key in expert_weights.keys() {
            all_component_types.insert(key.clone());
        }
        for key in financial_weights.keys() {
            all_component_types.insert(key.clone());
        }

        for comp_type in all_component_types.iter() {
            let expert = expert_weights.get(comp_type).copied().unwrap_or(0.0);
            let pagerank = pagerank_weights.get(comp_type).copied().unwrap_or(0.0);
            let cascade = cascade_weights.get(comp_type).copied().unwrap_or(0.0);
            let financial = financial_weights.get(comp_type).copied().unwrap_or(0.0);

            let hybrid = WEIGHTING_CONFIG.hybrid_expert_weight * expert
                + WEIGHTING_CONFIG.hybrid_pagerank_weight * pagerank
                + WEIGHTING_CONFIG.hybrid_cascade_weight * cascade
                + WEIGHTING_CONFIG.hybrid_financial_weight * financial;

            hybrid_weights.insert(comp_type.clone(), hybrid);
        }

        // Normalize
        let sum: f64 = hybrid_weights.values().sum();
        if sum > 0.0 {
            for (_, weight) in hybrid_weights.iter_mut() {
                *weight /= sum;
            }
        }

        tracing::info!(
            "Hybrid weights calculated. Total: {:.6}",
            hybrid_weights.values().sum::<f64>()
        );

        Ok(hybrid_weights)
    }

    /// Calculate hybrid weights with performance adjustment
    ///
    /// Adjusts weights based on component vulnerability to prioritize
    /// underperforming components.
    pub fn calculate_hybrid_weights_with_performance(
        &self,
        components: &[Component],
        vulnerabilities: &HashMap<String, f64>,
        scenario: Option<&str>,
        context: Option<&WeightingContext>,
    ) -> FsfviResult<HashMap<String, f64>> {
        // Get base hybrid weights
        let mut weights = self.calculate_hybrid_weights(components, scenario, context)?;

        // Apply performance adjustment
        for comp in components {
            let comp_type = normalize_component_type(&comp.component_type);
            let comp_type_str = comp_type.as_str();

            if let Some(weight) = weights.get_mut(comp_type_str) {
                if let Some(&vulnerability) = vulnerabilities.get(comp_type_str) {
                    // Adjustment factor based on vulnerability
                    let adjustment_factor = 1.0 + vulnerability;

                    // Apply bounds from config
                    let bounded_adjustment = adjustment_factor
                        .max(WEIGHTING_CONFIG.adjustment_min_factor)
                        .min(WEIGHTING_CONFIG.adjustment_max_factor);

                    *weight *= bounded_adjustment;
                }
            }
        }

        // Renormalize after adjustment
        let sum: f64 = weights.values().sum();
        if sum > 0.0 {
            for (_, weight) in weights.iter_mut() {
                *weight /= sum;
            }
        }

        tracing::info!(
            "Performance-adjusted hybrid weights calculated. Total: {:.6}",
            weights.values().sum::<f64>()
        );

        Ok(weights)
    }


    /// Get expert weights only
    pub fn get_expert_weights(
        &self,
        scenario: Option<&str>,
        context: Option<&WeightingContext>,
    ) -> FsfviResult<HashMap<String, f64>> {
        if let Some(ctx) = context {
            Ok(self.expert_system.get_context_weights(ctx))
        } else if let Some(scen) = scenario {
            self.expert_system.get_scenario_weights(scen)
        } else {
            self.expert_system.calculate_ahp_weights()
        }
    }

    /// Get network weights (PageRank + Cascade combined)
    pub fn get_network_weights(&self) -> FsfviResult<HashMap<String, f64>> {
        let pagerank = self.network_analyzer.calculate_pagerank_centrality(None)?;
        let cascade = self.network_analyzer.calculate_cascade_multipliers()?;

        let mut network_weights = HashMap::new();
        for name in self.network_analyzer.get_component_names() {
            let pr = pagerank.get(name).copied().unwrap_or(0.0);
            let cas = cascade.get(name).copied().unwrap_or(0.0);
            // 70% PageRank, 30% Cascade
            network_weights.insert(name.clone(), 0.7 * pr + 0.3 * cas);
        }

        // Normalize
        let sum: f64 = network_weights.values().sum();
        if sum > 0.0 {
            for (_, weight) in network_weights.iter_mut() {
                *weight /= sum;
            }
        }

        Ok(network_weights)
    }
}

/// Analyze weight sensitivity across scenarios
pub fn analyze_weight_sensitivity(
    system: &HybridWeightingSystem,
    components: &[Component],
    scenarios: &[&str],
) -> FsfviResult<HashMap<String, HashMap<String, f64>>> {
    let mut sensitivity_analysis = HashMap::new();

    for scenario in scenarios {
        let weights = system.calculate_hybrid_weights(components, Some(scenario), None)?;
        sensitivity_analysis.insert(scenario.to_string(), weights);
    }

    Ok(sensitivity_analysis)
}

/// Analyze weight sensitivity across contexts
pub fn analyze_context_sensitivity(
    system: &HybridWeightingSystem,
    components: &[Component],
    contexts: &[WeightingContext],
) -> FsfviResult<HashMap<String, HashMap<String, f64>>> {
    let mut sensitivity_analysis = HashMap::new();

    for (i, context) in contexts.iter().enumerate() {
        let context_name = context
            .country
            .clone()
            .unwrap_or_else(|| format!("context_{}", i));
        let weights = system.calculate_hybrid_weights(components, None, Some(context))?;
        sensitivity_analysis.insert(context_name, weights);
    }

    Ok(sensitivity_analysis)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_components() -> Vec<Component> {
        vec![
            Component {
                component_id: Some("comp1".to_string()),
                component_type: "agricultural_development".to_string(),
                observed_value: 100.0,
                benchmark_value: 120.0,
                financial_allocation: 1000.0,
                weight: None,
                sensitivity_parameter: Some(0.001),
            },
            Component {
                component_id: Some("comp2".to_string()),
                component_type: "infrastructure".to_string(),
                observed_value: 80.0,
                benchmark_value: 100.0,
                financial_allocation: 500.0,
                weight: None,
                sensitivity_parameter: Some(0.001),
            },
        ]
    }

    #[test]
    fn test_hybrid_weights() {
        let system = HybridWeightingSystem::new();
        let components = create_test_components();

        let weights = system.calculate_hybrid_weights(&components, None, None).unwrap();

        // Check normalization
        let sum: f64 = weights.values().sum();
        assert!((sum - 1.0).abs() < 1e-6);

        // Check all weights are positive
        for (_, weight) in weights.iter() {
            assert!(*weight > 0.0);
            assert!(*weight <= 1.0);
        }
    }

    #[test]
    fn test_performance_adjusted_weights() {
        let system = HybridWeightingSystem::new();
        let components = create_test_components();

        let mut vulnerabilities = HashMap::new();
        vulnerabilities.insert("agricultural_development".to_string(), 0.3);
        vulnerabilities.insert("infrastructure".to_string(), 0.2);

        let weights = system
            .calculate_hybrid_weights_with_performance(
                &components,
                &vulnerabilities,
                None,
                None,
            )
            .unwrap();

        // Check normalization
        let sum: f64 = weights.values().sum();
        assert!((sum - 1.0).abs() < 1e-6);
    }

    #[test]
    fn test_expert_weights() {
        let system = HybridWeightingSystem::new();
        let weights = system.get_expert_weights(None, None).unwrap();

        let sum: f64 = weights.values().sum();
        assert!((sum - 1.0).abs() < 1e-6);
    }

    #[test]
    fn test_network_weights() {
        let system = HybridWeightingSystem::new();
        let weights = system.get_network_weights().unwrap();

        let sum: f64 = weights.values().sum();
        assert!((sum - 1.0).abs() < 1e-6);
    }

    #[test]
    fn test_weight_sensitivity() {
        let system = HybridWeightingSystem::new();
        let components = create_test_components();
        let scenarios = vec!["normal_operations", "climate_shock"];

        let sensitivity = analyze_weight_sensitivity(&system, &components, &scenarios).unwrap();

        assert_eq!(sensitivity.len(), 2);
        for (_, weights) in sensitivity.iter() {
            let sum: f64 = weights.values().sum();
            assert!((sum - 1.0).abs() < 1e-6);
        }
    }
}
