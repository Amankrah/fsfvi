/// Weighting Analysis Service
/// ============================
///
/// Provides sensitivity analysis and validation utilities for the weighting system.
/// Used by government analysts and researchers to validate methodology robustness.

use crate::fsfvi::errors::FsfviResult;
use crate::fsfvi::validators::Component;
use crate::fsfvi::weighting::models::WeightingContext;
use crate::fsfvi::weighting::network::{compare_centrality_methods, NetworkCentralityAnalyzer};
use crate::fsfvi::weighting::financial::{
    analyze_financial_allocations, calculate_marginal_impact,
    compare_effective_allocation_to_vulnerability, generate_constrained_recommendations,
    FinancialAnalysisResult,
};
use crate::fsfvi::weighting::{
    analyze_context_sensitivity, analyze_weight_sensitivity,
    ExpertWeightingSystem, HybridWeightingSystem,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Service for weighting methodology analysis and validation
pub struct WeightingAnalysisService {
    hybrid_system: HybridWeightingSystem,
    expert_system: ExpertWeightingSystem,
}

impl Default for WeightingAnalysisService {
    fn default() -> Self {
        Self::new()
    }
}

impl WeightingAnalysisService {
    pub fn new() -> Self {
        Self {
            hybrid_system: HybridWeightingSystem::new(),
            expert_system: ExpertWeightingSystem::new(),
        }
    }

    /// Analyze how HYBRID weights change across different scenarios
    ///
    /// **Use Case**: Government analysts can use this to understand how
    /// component priorities shift during different crisis scenarios
    /// (climate shocks, financial crises, pandemics, etc.)
    ///
    /// **Returns**: Map of scenario → component weights
    pub fn analyze_scenario_sensitivity_hybrid(
        &self,
        components: &[Component],
        scenarios: &[&str],
    ) -> FsfviResult<ScenarioSensitivityReport> {
        let weight_changes = analyze_weight_sensitivity(&self.hybrid_system, components, scenarios)?;

        // Calculate variance across scenarios for each component
        let mut component_variance = HashMap::new();
        let component_names: Vec<String> = weight_changes
            .values()
            .next()
            .map(|weights| weights.keys().cloned().collect())
            .unwrap_or_default();

        for comp_name in &component_names {
            let mut weights_across_scenarios = Vec::new();
            for weights in weight_changes.values() {
                if let Some(&weight) = weights.get(comp_name) {
                    weights_across_scenarios.push(weight);
                }
            }

            if !weights_across_scenarios.is_empty() {
                let mean: f64 = weights_across_scenarios.iter().sum::<f64>() / weights_across_scenarios.len() as f64;
                let variance: f64 = weights_across_scenarios
                    .iter()
                    .map(|w| (w - mean).powi(2))
                    .sum::<f64>()
                    / weights_across_scenarios.len() as f64;
                component_variance.insert(comp_name.clone(), variance);
            }
        }

        // Identify most scenario-sensitive components
        let mut variance_vec: Vec<_> = component_variance.iter().collect();
        variance_vec.sort_by(|a, b| b.1.partial_cmp(a.1).unwrap());
        let most_sensitive_components: Vec<String> = variance_vec
            .iter()
            .take(3)
            .map(|(name, _)| (*name).clone())
            .collect();

        Ok(ScenarioSensitivityReport {
            scenario_weights: weight_changes,
            component_variance,
            most_sensitive_components,
        })
    }

    /// Analyze how EXPERT weights change across different scenarios
    ///
    /// **Use Case**: Compare expert-driven priorities across different crisis scenarios
    ///
    /// **Returns**: Map of scenario → component weights
    pub fn analyze_scenario_sensitivity_expert(
        &self,
        scenarios: &[&str],
    ) -> FsfviResult<ScenarioSensitivityReport> {
        let mut weight_changes = HashMap::new();

        for scenario in scenarios {
            let weights = self.expert_system.get_scenario_weights(scenario)?;
            weight_changes.insert(scenario.to_string(), weights);
        }

        // Calculate variance across scenarios for each component
        let mut component_variance = HashMap::new();
        let component_names: Vec<String> = weight_changes
            .values()
            .next()
            .map(|weights| weights.keys().cloned().collect())
            .unwrap_or_default();

        for comp_name in &component_names {
            let mut weights_across_scenarios = Vec::new();
            for weights in weight_changes.values() {
                if let Some(&weight) = weights.get(comp_name) {
                    weights_across_scenarios.push(weight);
                }
            }

            if !weights_across_scenarios.is_empty() {
                let mean: f64 = weights_across_scenarios.iter().sum::<f64>() / weights_across_scenarios.len() as f64;
                let variance: f64 = weights_across_scenarios
                    .iter()
                    .map(|w| (w - mean).powi(2))
                    .sum::<f64>()
                    / weights_across_scenarios.len() as f64;
                component_variance.insert(comp_name.clone(), variance);
            }
        }

        let mut variance_vec: Vec<_> = component_variance.iter().collect();
        variance_vec.sort_by(|a, b| b.1.partial_cmp(a.1).unwrap());
        let most_sensitive_components: Vec<String> = variance_vec
            .iter()
            .take(3)
            .map(|(name, _)| (*name).clone())
            .collect();

        Ok(ScenarioSensitivityReport {
            scenario_weights: weight_changes,
            component_variance,
            most_sensitive_components,
        })
    }

    /// Analyze how FINANCIAL weights change across different allocations
    ///
    /// **Use Case**: Compare how budget allocation patterns affect relative priorities
    ///
    /// **Returns**: Comprehensive financial analysis for each allocation scenario
    ///
    /// **Enhanced**: Now includes cost-effectiveness, funding gaps, and threshold analysis
    pub fn analyze_financial_weights(
        &self,
        component_scenarios: &[Vec<Component>],
        scenario_names: Option<&[String]>,
        is_crisis: bool,
        include_efficiency: bool,
    ) -> FsfviResult<EnhancedFinancialWeightsReport> {
        let mut scenario_analyses = HashMap::new();
        let mut total_budget = 0.0;

        for (i, components) in component_scenarios.iter().enumerate() {
            // Get scenario name if provided, otherwise generate default
            let scenario_name = scenario_names
                .and_then(|names| names.get(i))
                .map(|s| s.as_str());

            // Run comprehensive financial analysis
            let analysis = analyze_financial_allocations(
                components,
                scenario_name,
                is_crisis,
            )?;

            // Track total budget
            let scenario_budget: f64 = components.iter().map(|c| c.financial_allocation).sum();
            total_budget += scenario_budget;

            // Store analysis with appropriate key
            let key = if let Some(name) = scenario_name {
                name.to_string()
            } else {
                format!("allocation_scenario_{}", i + 1)
            };

            scenario_analyses.insert(key, analysis);
        }

        // Calculate efficiency analysis if requested and we have vulnerability data
        let efficiency_analysis = if include_efficiency && !component_scenarios.is_empty() {
            self.calculate_efficiency_analysis(&component_scenarios[0], scenario_names)?
        } else {
            None
        };

        // Build metadata
        let metadata = FinancialAnalysisMetadata {
            num_scenarios: component_scenarios.len(),
            crisis_mode: is_crisis,
            total_budget,
            timestamp: chrono::Utc::now().to_rfc3339(),
        };

        Ok(EnhancedFinancialWeightsReport {
            scenario_analyses,
            efficiency_analysis,
            metadata,
        })
    }

    /// Calculate allocation efficiency analysis based on vulnerability
    ///
    /// **Internal Helper**: Extracts vulnerability from components and compares to allocations
    fn calculate_efficiency_analysis(
        &self,
        components: &[Component],
        scenario_names: Option<&[String]>,
    ) -> FsfviResult<Option<AllocationEfficiencyMetrics>> {
        // Extract vulnerability data from components by calculating performance gaps
        let mut vulnerabilities = HashMap::new();

        for comp in components {
            let normalized_type = crate::fsfvi::config::normalize_component_type(&comp.component_type);
            let type_str = normalized_type.as_str().to_string();

            // Calculate basic vulnerability from performance gap
            let gap = if comp.observed_value < comp.benchmark_value {
                (comp.benchmark_value - comp.observed_value) / comp.benchmark_value
            } else {
                0.0
            };

            *vulnerabilities.entry(type_str).or_insert(0.0) += gap;
        }

        // Normalize vulnerabilities by component count
        let mut component_counts: HashMap<String, usize> = HashMap::new();
        for comp in components {
            let normalized_type = crate::fsfvi::config::normalize_component_type(&comp.component_type);
            *component_counts.entry(normalized_type.as_str().to_string()).or_insert(0) += 1;
        }

        for (comp_type, vuln) in vulnerabilities.iter_mut() {
            if let Some(&count) = component_counts.get(comp_type) {
                if count > 0 {
                    *vuln /= count as f64;
                }
            }
        }

        // Skip if no vulnerability data
        if vulnerabilities.is_empty() || vulnerabilities.values().all(|&v| v == 0.0) {
            return Ok(None);
        }

        // Get scenario name for cost-effectiveness adjustment
        let scenario = scenario_names.and_then(|names| names.first()).map(|s| s.as_str());

        // Calculate efficiency ratios
        let efficiency_ratios = compare_effective_allocation_to_vulnerability(
            components,
            &vulnerabilities,
            scenario,
        )?;

        // Calculate total budget for recommendations
        let total_budget: f64 = components.iter().map(|c| c.financial_allocation).sum();

        // Generate constrained recommendations
        let recommended_allocations = if total_budget > 0.0 {
            generate_constrained_recommendations(
                total_budget,
                &vulnerabilities,
                false, // Use normal thresholds for recommendations
            )?
        } else {
            HashMap::new()
        };

        // Calculate marginal impact scores
        let marginal_impact_scores = calculate_marginal_impact(components, &vulnerabilities)?;

        Ok(Some(AllocationEfficiencyMetrics {
            efficiency_ratios,
            recommended_allocations,
            marginal_impact_scores,
        }))
    }

    /// Analyze how HYBRID weights change across different country contexts
    ///
    /// **Use Case**: Compare weighting strategies for low-income vs high-income countries,
    /// or different geographical regions
    ///
    /// **Returns**: Map of context → component weights
    pub fn analyze_country_context_sensitivity(
        &self,
        components: &[Component],
        contexts: &[WeightingContext],
    ) -> FsfviResult<ContextSensitivityReport> {
        let weight_changes = analyze_context_sensitivity(&self.hybrid_system, components, contexts)?;

        // Calculate range of weights for each component across contexts
        let mut component_ranges = HashMap::new();
        let component_names: Vec<String> = weight_changes
            .values()
            .next()
            .map(|weights| weights.keys().cloned().collect())
            .unwrap_or_default();

        for comp_name in &component_names {
            let mut weights = Vec::new();
            for weight_map in weight_changes.values() {
                if let Some(&weight) = weight_map.get(comp_name) {
                    weights.push(weight);
                }
            }

            if !weights.is_empty() {
                let min = weights.iter().copied().fold(f64::INFINITY, f64::min);
                let max = weights.iter().copied().fold(f64::NEG_INFINITY, f64::max);
                component_ranges.insert(comp_name.clone(), (min, max));
            }
        }

        Ok(ContextSensitivityReport {
            context_weights: weight_changes,
            component_ranges,
        })
    }

    /// Compare PageRank vs Eigenvector centrality for robustness validation
    ///
    /// **Use Case**: Academic peer review, methodology transparency,
    /// validating that conclusions are robust to algorithm choice
    ///
    /// **Returns**: Correlation and divergence metrics between algorithms
    pub fn compare_network_algorithms(
        &self,
        scenario: Option<&str>,
    ) -> FsfviResult<NetworkAlgorithmComparison> {
        let analyzer = if let Some(scen) = scenario {
            NetworkCentralityAnalyzer::with_scenario(Some(scen))
        } else {
            NetworkCentralityAnalyzer::new()
        };

        let comparison = compare_centrality_methods(&analyzer)?;

        Ok(NetworkAlgorithmComparison {
            pagerank_weights: comparison.pagerank,
            eigenvector_weights: comparison.eigenvector,
            correlation: comparison.correlation,
            max_divergence: comparison.max_divergence,
            max_divergence_component: comparison.max_divergence_component,
            robustness_assessment: Self::assess_robustness(comparison.correlation),
        })
    }

    fn assess_robustness(correlation: f64) -> String {
        if correlation > 0.95 {
            "Very high robustness - results are highly consistent across algorithms".to_string()
        } else if correlation > 0.85 {
            "High robustness - results are largely consistent with minor variations".to_string()
        } else if correlation > 0.70 {
            "Moderate robustness - some sensitivity to algorithm choice, review divergent components".to_string()
        } else {
            "Low robustness - significant sensitivity to algorithm choice, deeper analysis recommended".to_string()
        }
    }

    /// Get expert weight validation report with full AHP consistency metrics
    ///
    /// **Use Case**: Government transparency, academic peer review, methodology validation
    /// **Returns**: Weights with full consistency analysis (CR, CI, λmax) and metadata
    pub fn get_expert_weight_validation(
        &self,
        scenario: Option<&str>,
    ) -> FsfviResult<ExpertWeightValidationReport> {
        let scenario_key = scenario.unwrap_or("baseline");

        // Get full AHP result with consistency metrics
        let ahp_result = self.expert_system.calculate_ahp_weights_full(scenario)?;

        // Get full matrix metadata (source, date, methodology)
        let (source_attribution, date, methodology) = self
            .expert_system
            .get_expert_matrix_metadata(scenario_key)
            .map(|(s, d, m)| (Some(s.to_string()), d.map(|d| d.to_string()), m.map(|m| m.to_string())))
            .unwrap_or((None, None, None));

        // Assess consistency quality
        let consistency_assessment = if ahp_result.is_consistent {
            if ahp_result.consistency_ratio < 0.05 {
                "Excellent - Very high consistency in expert judgments"
            } else if ahp_result.consistency_ratio < 0.08 {
                "Good - Acceptable consistency in expert judgments"
            } else {
                "Acceptable - Consistency ratio within threshold (CR < 0.10)"
            }
        } else {
            "WARNING - Consistency ratio exceeds threshold (CR >= 0.10), expert judgments may be contradictory"
        };

        // Generate warning if needed
        let validation_warnings = if !ahp_result.is_consistent {
            vec![
                format!(
                    "Consistency Ratio ({:.4}) exceeds AHP threshold of 0.10. Expert judgments show contradictions.",
                    ahp_result.consistency_ratio
                ),
                "Recommendation: Review and revise expert comparison matrix for this scenario.".to_string(),
            ]
        } else {
            vec![]
        };

        Ok(ExpertWeightValidationReport {
            scenario: ahp_result.scenario.clone(),
            weights: ahp_result.weights,
            lambda_max: ahp_result.lambda_max,
            consistency_index: ahp_result.consistency_index,
            consistency_ratio: ahp_result.consistency_ratio,
            is_consistent: ahp_result.is_consistent,
            consistency_assessment: consistency_assessment.to_string(),
            validation_warnings,
            source_attribution,
            date,
            methodology,
        })
    }

    /// Get list of available scenarios for analysis
    ///
    /// **Use Case**: Discover what scenarios are available (baseline, climate_shock, etc.)
    /// **Returns**: List of scenario names
    pub fn get_available_scenarios(&self) -> Vec<String> {
        self.expert_system.get_available_scenarios()
    }

    /// Compare expert weights across multiple scenarios
    ///
    /// **Use Case**: Cross-scenario analysis, understanding how priorities shift
    /// **Returns**: Validation reports for each scenario with consistency metrics
    pub fn compare_expert_weights_across_scenarios(
        &self,
        scenarios: &[&str],
    ) -> FsfviResult<ScenarioComparisonReport> {
        let mut scenario_validations = HashMap::new();
        let mut all_consistent = true;
        let mut scenarios_with_warnings = Vec::new();

        for scenario in scenarios {
            let validation = self.get_expert_weight_validation(Some(scenario))?;

            if !validation.is_consistent {
                all_consistent = false;
                scenarios_with_warnings.push(scenario.to_string());
            }

            scenario_validations.insert(scenario.to_string(), validation);
        }

        // Overall quality assessment
        let overall_assessment = if all_consistent {
            "All scenario matrices pass AHP consistency validation (CR < 0.10)".to_string()
        } else {
            format!(
                "WARNING: {} scenario(s) fail consistency validation: {}",
                scenarios_with_warnings.len(),
                scenarios_with_warnings.join(", ")
            )
        };

        Ok(ScenarioComparisonReport {
            scenario_validations,
            all_scenarios_consistent: all_consistent,
            scenarios_with_warnings,
            overall_assessment,
        })
    }
}

// Response Types

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScenarioSensitivityReport {
    /// Weights for each scenario
    pub scenario_weights: HashMap<String, HashMap<String, f64>>,
    /// Variance of weights across scenarios for each component
    pub component_variance: HashMap<String, f64>,
    /// Components most sensitive to scenario changes
    pub most_sensitive_components: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContextSensitivityReport {
    /// Weights for each context
    pub context_weights: HashMap<String, HashMap<String, f64>>,
    /// (min, max) weight range for each component across contexts
    pub component_ranges: HashMap<String, (f64, f64)>,
}

/// Additional analysis metrics for allocation-vulnerability comparison
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AllocationEfficiencyMetrics {
    /// Allocation efficiency by component (>1.0 = over-allocated, <1.0 = under-allocated)
    pub efficiency_ratios: HashMap<String, f64>,
    /// Recommended allocations based on vulnerability
    pub recommended_allocations: HashMap<String, f64>,
    /// Marginal impact scores (where next dollar has highest impact)
    pub marginal_impact_scores: HashMap<String, f64>,
}

/// Enhanced financial weights report with comprehensive analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnhancedFinancialWeightsReport {
    /// Comprehensive financial analysis results for each scenario
    pub scenario_analyses: HashMap<String, FinancialAnalysisResult>,
    /// Optional allocation efficiency metrics (if vulnerability data provided)
    pub efficiency_analysis: Option<AllocationEfficiencyMetrics>,
    /// Analysis metadata
    pub metadata: FinancialAnalysisMetadata,
}

/// Metadata about the financial analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FinancialAnalysisMetadata {
    /// Number of scenarios analyzed
    pub num_scenarios: usize,
    /// Whether crisis-level thresholds were used
    pub crisis_mode: bool,
    /// Total budget across all scenarios
    pub total_budget: f64,
    /// Analysis timestamp
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkAlgorithmComparison {
    pub pagerank_weights: HashMap<String, f64>,
    pub eigenvector_weights: HashMap<String, f64>,
    pub correlation: f64,
    pub max_divergence: f64,
    pub max_divergence_component: String,
    pub robustness_assessment: String,
}

/// Expert weight validation report with full AHP consistency metrics
/// For government transparency and academic peer review
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExpertWeightValidationReport {
    /// Scenario analyzed
    pub scenario: String,
    /// Calculated component weights
    pub weights: HashMap<String, f64>,
    /// Principal eigenvalue (λmax) - should be close to matrix size
    pub lambda_max: f64,
    /// Consistency Index (CI)
    pub consistency_index: f64,
    /// Consistency Ratio (CR) - MUST be < 0.10 for valid AHP
    pub consistency_ratio: f64,
    /// Whether matrix passes consistency check (CR < 0.10)
    pub is_consistent: bool,
    /// Human-readable consistency quality assessment
    pub consistency_assessment: String,
    /// Warnings if consistency check fails
    pub validation_warnings: Vec<String>,
    /// Source attribution for expert judgments (FAO, World Bank, etc.)
    pub source_attribution: Option<String>,
    /// Date when expert comparisons were made (for temporal tracking)
    pub date: Option<String>,
    /// Methodology notes (e.g., "AHP pairwise comparisons by food security experts")
    pub methodology: Option<String>,
}

/// Comparison of expert weights across multiple scenarios
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScenarioComparisonReport {
    /// Validation report for each scenario
    pub scenario_validations: HashMap<String, ExpertWeightValidationReport>,
    /// Whether all scenarios pass consistency validation
    pub all_scenarios_consistent: bool,
    /// List of scenarios that fail consistency (CR >= 0.10)
    pub scenarios_with_warnings: Vec<String>,
    /// Overall assessment of methodology quality
    pub overall_assessment: String,
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
                financial_allocation: 500.0,
                sensitivity_parameter: Some(0.001),
                weight: None,
            },
            Component {
                component_id: Some("comp2".to_string()),
                component_type: "infrastructure".to_string(),
                observed_value: 80.0,
                benchmark_value: 100.0,
                financial_allocation: 300.0,
                sensitivity_parameter: Some(0.0015),
                weight: None,
            },
        ]
    }

    #[test]
    fn test_scenario_sensitivity_analysis() {
        let service = WeightingAnalysisService::new();
        let components = create_test_components();
        let scenarios = vec!["baseline", "climate_shock", "financial_crisis"];

        let report = service
            .analyze_scenario_sensitivity_hybrid(&components, &scenarios)
            .unwrap();

        assert_eq!(report.scenario_weights.len(), 3);
        assert!(!report.most_sensitive_components.is_empty());
    }

    #[test]
    fn test_network_algorithm_comparison() {
        let service = WeightingAnalysisService::new();
        let comparison = service.compare_network_algorithms(None).unwrap();

        assert!(comparison.correlation >= -1.0 && comparison.correlation <= 1.0);
        assert!(!comparison.robustness_assessment.is_empty());
    }
}
