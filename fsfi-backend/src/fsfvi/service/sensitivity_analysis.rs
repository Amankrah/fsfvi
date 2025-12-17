/// Sensitivity Analysis Service
/// ============================
///
/// Helps governments understand robustness of FSFVI assessments to parameter uncertainty.
/// Critical for decision-making: how much can parameters change before conclusions change?
///
/// TYPES OF SENSITIVITY ANALYSIS:
/// ------------------------------
/// 1. Weight Sensitivity: How do results change if component weights are adjusted?
/// 2. Parameter Sensitivity: Impact of uncertainty in sensitivity parameters (α)
/// 3. Benchmark Sensitivity: Effect of different benchmark values
/// 4. Scenario Robustness: How stable are results across scenarios?
///
/// USE CASES:
/// - Validate assessment robustness before major policy decisions
/// - Identify which parameters need better data collection
/// - Communicate uncertainty to stakeholders
/// - Support evidence-based policy with confidence bounds

use crate::fsfvi::config::{Scenario, WeightingMethod};
use crate::fsfvi::errors::{FsfviError, FsfviResult};
use crate::fsfvi::service::vulnerability_assessment::{
    AssessmentRequest, VulnerabilityAssessmentService,
};
use crate::fsfvi::validators::Component;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Sensitivity analysis service
pub struct SensitivityAnalysisService {
    assessment_service: VulnerabilityAssessmentService,
}

impl Default for SensitivityAnalysisService {
    fn default() -> Self {
        Self::new()
    }
}

impl SensitivityAnalysisService {
    pub fn new() -> Self {
        Self {
            assessment_service: VulnerabilityAssessmentService::new(),
        }
    }

    /// Analyze sensitivity to component weights
    ///
    /// Tests how FSFVI changes when component weights are perturbed.
    /// Critical for understanding if weight estimation errors affect conclusions.
    pub fn analyze_weight_sensitivity(
        &self,
        components: Vec<Component>,
        perturbation_levels: Vec<f64>, // e.g., [0.05, 0.10, 0.20] for ±5%, ±10%, ±20%
    ) -> FsfviResult<WeightSensitivityReport> {
        tracing::info!(
            "Analyzing weight sensitivity for {} components at {} perturbation levels",
            components.len(),
            perturbation_levels.len()
        );

        // Baseline assessment
        let baseline = self.run_assessment(&components)?;
        let baseline_fsfvi = baseline.system_result.fsfvi_value;

        let mut component_sensitivities = Vec::new();

        // Test each component's weight sensitivity
        for (idx, comp) in components.iter().enumerate() {
            let mut sensitivity_results = Vec::new();

            for &perturbation in &perturbation_levels {
                // Increase weight
                let fsfvi_increase = self.perturb_component_weight(&components, idx, 1.0 + perturbation)?;

                // Decrease weight
                let fsfvi_decrease = self.perturb_component_weight(&components, idx, 1.0 - perturbation)?;

                sensitivity_results.push(WeightPerturbationResult {
                    perturbation_percent: perturbation * 100.0,
                    fsfvi_with_increase: fsfvi_increase,
                    fsfvi_with_decrease: fsfvi_decrease,
                    fsfvi_change_range: (fsfvi_increase - fsfvi_decrease).abs(),
                });
            }

            // Calculate elasticity: % change in FSFVI / % change in weight
            let avg_elasticity = sensitivity_results
                .iter()
                .map(|r| {
                    r.fsfvi_change_range / baseline_fsfvi / (2.0 * r.perturbation_percent / 100.0)
                })
                .sum::<f64>()
                / sensitivity_results.len() as f64;

            component_sensitivities.push(ComponentWeightSensitivity {
                component_type: comp.component_type.clone(),
                baseline_weight: comp.weight.unwrap_or(1.0 / components.len() as f64),
                perturbation_results: sensitivity_results,
                elasticity: avg_elasticity,
                is_highly_sensitive: avg_elasticity > 0.5, // >50% FSFVI change for 100% weight change
            });
        }

        // Rank by sensitivity
        component_sensitivities.sort_by(|a, b| {
            b.elasticity
                .partial_cmp(&a.elasticity)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        let overall_robustness = self.calculate_weight_robustness(&component_sensitivities);
        let recommendations = self.generate_weight_sensitivity_recommendations(&component_sensitivities);

        Ok(WeightSensitivityReport {
            baseline_fsfvi,
            component_sensitivities,
            overall_robustness,
            recommendations,
        })
    }

    /// Analyze sensitivity to sensitivity parameters (α)
    ///
    /// Tests impact of uncertainty in the sensitivity parameters.
    /// Important because these are often estimated, not directly measured.
    pub fn analyze_parameter_sensitivity(
        &self,
        components: Vec<Component>,
        perturbation_levels: Vec<f64>,
    ) -> FsfviResult<ParameterSensitivityReport> {
        tracing::info!(
            "Analyzing sensitivity parameter robustness for {} components",
            components.len()
        );

        let baseline = self.run_assessment(&components)?;
        let baseline_fsfvi = baseline.system_result.fsfvi_value;

        let mut component_sensitivities = Vec::new();

        for (idx, comp) in components.iter().enumerate() {
            let baseline_sensitivity_param = comp.sensitivity_parameter.unwrap_or(0.001);
            let mut perturbation_results = Vec::new();

            for &perturbation in &perturbation_levels {
                // Increase sensitivity parameter
                let fsfvi_increase = self.perturb_sensitivity_parameter(
                    &components,
                    idx,
                    baseline_sensitivity_param * (1.0 + perturbation),
                )?;

                // Decrease sensitivity parameter
                let fsfvi_decrease = self.perturb_sensitivity_parameter(
                    &components,
                    idx,
                    baseline_sensitivity_param * (1.0 - perturbation),
                )?;

                perturbation_results.push(ParameterPerturbationResult {
                    perturbation_percent: perturbation * 100.0,
                    fsfvi_with_increase: fsfvi_increase,
                    fsfvi_with_decrease: fsfvi_decrease,
                    fsfvi_range: (fsfvi_increase - fsfvi_decrease).abs(),
                });
            }

            let max_impact = perturbation_results
                .iter()
                .map(|r| r.fsfvi_range)
                .max_by(|a, b| a.partial_cmp(b).unwrap())
                .unwrap_or(0.0);

            component_sensitivities.push(ComponentParameterSensitivity {
                component_type: comp.component_type.clone(),
                baseline_sensitivity_parameter: baseline_sensitivity_param,
                perturbation_results,
                max_fsfvi_impact: max_impact,
                requires_better_estimation: max_impact > baseline_fsfvi * 0.1, // >10% impact
            });
        }

        let overall_parameter_robustness = self.calculate_parameter_robustness(&component_sensitivities, baseline_fsfvi);
        let recommendations = self.generate_parameter_recommendations(&component_sensitivities);

        Ok(ParameterSensitivityReport {
            baseline_fsfvi,
            component_sensitivities,
            overall_parameter_robustness,
            recommendations,
        })
    }

    /// Analyze robustness across different scenarios
    ///
    /// Tests if policy conclusions hold across normal operations, drought, pandemic, etc.
    /// Critical for ensuring recommendations aren't scenario-specific.
    pub fn analyze_scenario_robustness(
        &self,
        components: Vec<Component>,
    ) -> FsfviResult<ScenarioRobustnessReport> {
        tracing::info!("Analyzing scenario robustness across all scenarios");

        let scenarios = vec![
            Scenario::NormalOperations,
            Scenario::ClimateShock,
            Scenario::PandemicDisruption,
            Scenario::FinancialCrisis,
            Scenario::PoliticalInstability,
        ];

        let mut scenario_results = Vec::new();

        for scenario in &scenarios {
            let scenario_components = components.clone();

            // Run assessment for this scenario
            let assessment = self.assessment_service.assess_food_system(AssessmentRequest {
                components: scenario_components,
                country_name: None,
                weighting_method: Some(WeightingMethod::Hybrid),
                scenario: Some(*scenario),
                context: None,
                currency: None,
                use_performance_adjusted_weights: false, // Consistent methodology across scenarios
            })?;

            scenario_results.push(ScenarioResult {
                scenario: format!("{:?}", scenario),
                fsfvi: assessment.system_result.fsfvi_value,
                risk_level: assessment.system_result.risk_level.clone(),
                top_3_vulnerabilities: assessment
                    .system_result
                    .top_3_vulnerability_contributors
                    .iter()
                    .map(|c| c.component_name.clone())
                    .collect(),
            });
        }

        // Calculate variability
        let fsfvi_values: Vec<f64> = scenario_results.iter().map(|r| r.fsfvi).collect();
        let mean_fsfvi = fsfvi_values.iter().sum::<f64>() / fsfvi_values.len() as f64;
        let variance = fsfvi_values
            .iter()
            .map(|v| (v - mean_fsfvi).powi(2))
            .sum::<f64>()
            / fsfvi_values.len() as f64;
        let std_dev = variance.sqrt();
        let coefficient_of_variation = std_dev / mean_fsfvi;

        // Check if top vulnerabilities are consistent
        let vulnerability_consistency = self.calculate_vulnerability_consistency(&scenario_results);

        Ok(ScenarioRobustnessReport {
            scenario_results,
            mean_fsfvi,
            std_dev_fsfvi: std_dev,
            coefficient_of_variation,
            min_fsfvi: fsfvi_values.iter().cloned().fold(f64::INFINITY, f64::min),
            max_fsfvi: fsfvi_values.iter().cloned().fold(f64::NEG_INFINITY, f64::max),
            vulnerability_consistency_score: vulnerability_consistency,
            is_robust: coefficient_of_variation < 0.15, // CV < 15% considered robust
            recommendations: self.generate_scenario_recommendations(coefficient_of_variation, vulnerability_consistency),
        })
    }

    /// Analyze sensitivity to benchmark values
    ///
    /// Tests how FSFVI changes with different benchmark assumptions.
    /// Important because benchmarks may vary by source or methodology.
    pub fn analyze_benchmark_sensitivity(
        &self,
        components: Vec<Component>,
        benchmark_perturbations: Vec<f64>, // e.g., [0.05, 0.10] for ±5%, ±10%
    ) -> FsfviResult<BenchmarkSensitivityReport> {
        tracing::info!(
            "Analyzing benchmark sensitivity for {} components",
            components.len()
        );

        let baseline = self.run_assessment(&components)?;
        let baseline_fsfvi = baseline.system_result.fsfvi_value;

        let mut sensitivity_results = Vec::new();

        for &perturbation in &benchmark_perturbations {
            // Test uniform benchmark increase
            let fsfvi_increase = self.perturb_all_benchmarks(&components, 1.0 + perturbation)?;

            // Test uniform benchmark decrease
            let fsfvi_decrease = self.perturb_all_benchmarks(&components, 1.0 - perturbation)?;

            sensitivity_results.push(BenchmarkPerturbationResult {
                perturbation_percent: perturbation * 100.0,
                fsfvi_with_higher_benchmarks: fsfvi_increase,
                fsfvi_with_lower_benchmarks: fsfvi_decrease,
                fsfvi_range: (fsfvi_increase - fsfvi_decrease).abs(),
            });
        }

        let max_impact = sensitivity_results
            .iter()
            .map(|r| r.fsfvi_range)
            .max_by(|a, b| a.partial_cmp(b).unwrap())
            .unwrap_or(0.0);

        Ok(BenchmarkSensitivityReport {
            baseline_fsfvi,
            perturbation_results: sensitivity_results,
            max_fsfvi_impact: max_impact,
            is_robust_to_benchmarks: max_impact < baseline_fsfvi * 0.2, // <20% change
            recommendations: self.generate_benchmark_recommendations(max_impact, baseline_fsfvi),
        })
    }

    /// Comprehensive Monte Carlo sensitivity analysis
    ///
    /// Simultaneously perturbs ALL parameters to understand combined uncertainty.
    /// Most realistic but computationally intensive.
    pub fn monte_carlo_sensitivity(
        &self,
        components: Vec<Component>,
        num_simulations: usize,
        parameter_uncertainty: f64, // e.g., 0.10 for ±10% random variation
    ) -> FsfviResult<MonteCarloSensitivityReport> {
        tracing::info!(
            "Running Monte Carlo sensitivity analysis: {} simulations",
            num_simulations
        );

        if num_simulations < 100 {
            return Err(FsfviError::Validation {
                message: "Monte Carlo requires at least 100 simulations for statistical validity".to_string(),
                details: [("requested".to_string(), num_simulations.to_string())]
                    .iter()
                    .cloned()
                    .collect(),
            });
        }

        let baseline = self.run_assessment(&components)?;
        let baseline_fsfvi = baseline.system_result.fsfvi_value;

        let mut fsfvi_results = Vec::new();

        for _ in 0..num_simulations {
            let perturbed_components = self.perturb_all_parameters(&components, parameter_uncertainty);
            let assessment = self.run_assessment(&perturbed_components)?;
            fsfvi_results.push(assessment.system_result.fsfvi_value);
        }

        // Statistical analysis
        fsfvi_results.sort_by(|a, b| a.partial_cmp(b).unwrap());

        let mean = fsfvi_results.iter().sum::<f64>() / fsfvi_results.len() as f64;
        let variance = fsfvi_results
            .iter()
            .map(|v| (v - mean).powi(2))
            .sum::<f64>()
            / fsfvi_results.len() as f64;
        let std_dev = variance.sqrt();

        // Confidence intervals
        let ci_95_lower = fsfvi_results[(num_simulations as f64 * 0.025) as usize];
        let ci_95_upper = fsfvi_results[(num_simulations as f64 * 0.975) as usize];
        let ci_90_lower = fsfvi_results[(num_simulations as f64 * 0.05) as usize];
        let ci_90_upper = fsfvi_results[(num_simulations as f64 * 0.95) as usize];

        Ok(MonteCarloSensitivityReport {
            baseline_fsfvi,
            num_simulations,
            parameter_uncertainty_percent: parameter_uncertainty * 100.0,
            mean_fsfvi: mean,
            std_dev_fsfvi: std_dev,
            min_fsfvi: fsfvi_results[0],
            max_fsfvi: fsfvi_results[num_simulations - 1],
            confidence_interval_90: (ci_90_lower, ci_90_upper),
            confidence_interval_95: (ci_95_lower, ci_95_upper),
            coefficient_of_variation: std_dev / mean,
            is_robust: std_dev / mean < 0.15, // CV < 15%
            recommendations: self.generate_monte_carlo_recommendations(std_dev / mean),
        })
    }

    // Helper methods

    fn run_assessment(&self, components: &[Component]) -> FsfviResult<crate::fsfvi::service::vulnerability_assessment::AssessmentReport> {
        self.assessment_service.assess_food_system(AssessmentRequest {
            components: components.to_vec(),
            country_name: None,
            weighting_method: Some(WeightingMethod::Hybrid),
            scenario: Some(Scenario::NormalOperations),
            context: None,
            currency: None,
            use_performance_adjusted_weights: false, // Standard assessment for sensitivity analysis
        })
    }

    fn perturb_component_weight(
        &self,
        components: &[Component],
        component_idx: usize,
        weight_multiplier: f64,
    ) -> FsfviResult<f64> {
        let mut perturbed = components.to_vec();

        // Perturb the target component's weight
        if let Some(current_weight) = perturbed[component_idx].weight {
            perturbed[component_idx].weight = Some(current_weight * weight_multiplier);

            // Renormalize all weights to sum to 1.0
            let total_weight: f64 = perturbed.iter().filter_map(|c| c.weight).sum();
            for comp in perturbed.iter_mut() {
                if let Some(w) = comp.weight {
                    comp.weight = Some(w / total_weight);
                }
            }
        }

        let assessment = self.run_assessment(&perturbed)?;
        Ok(assessment.system_result.fsfvi_value)
    }

    fn perturb_sensitivity_parameter(
        &self,
        components: &[Component],
        component_idx: usize,
        new_sensitivity: f64,
    ) -> FsfviResult<f64> {
        let mut perturbed = components.to_vec();
        perturbed[component_idx].sensitivity_parameter = Some(new_sensitivity);

        let assessment = self.run_assessment(&perturbed)?;
        Ok(assessment.system_result.fsfvi_value)
    }

    fn perturb_all_benchmarks(&self, components: &[Component], multiplier: f64) -> FsfviResult<f64> {
        let mut perturbed = components.to_vec();
        for comp in perturbed.iter_mut() {
            comp.benchmark_value *= multiplier;
        }

        let assessment = self.run_assessment(&perturbed)?;
        Ok(assessment.system_result.fsfvi_value)
    }

    fn perturb_all_parameters(&self, components: &[Component], uncertainty: f64) -> Vec<Component> {
        use rand::Rng;
        let mut rng = rand::thread_rng();

        components
            .iter()
            .map(|comp| {
                let weight_factor = 1.0 + rng.gen_range(-uncertainty..uncertainty);
                let sensitivity_factor = 1.0 + rng.gen_range(-uncertainty..uncertainty);
                let benchmark_factor = 1.0 + rng.gen_range(-uncertainty..uncertainty);

                Component {
                    component_id: comp.component_id.clone(),
                    component_type: comp.component_type.clone(),
                    observed_value: comp.observed_value,
                    benchmark_value: comp.benchmark_value * benchmark_factor,
                    financial_allocation: comp.financial_allocation,
                    weight: comp.weight.map(|w| w * weight_factor),
                    sensitivity_parameter: comp
                        .sensitivity_parameter
                        .map(|s| s * sensitivity_factor),
                }
            })
            .collect()
    }

    fn calculate_weight_robustness(&self, sensitivities: &[ComponentWeightSensitivity]) -> String {
        let avg_elasticity = sensitivities.iter().map(|s| s.elasticity).sum::<f64>()
            / sensitivities.len() as f64;

        if avg_elasticity > 1.0 {
            "low".to_string()
        } else if avg_elasticity > 0.5 {
            "medium".to_string()
        } else {
            "high".to_string()
        }
    }

    fn calculate_parameter_robustness(
        &self,
        sensitivities: &[ComponentParameterSensitivity],
        baseline_fsfvi: f64,
    ) -> String {
        let max_impact = sensitivities
            .iter()
            .map(|s| s.max_fsfvi_impact / baseline_fsfvi)
            .max_by(|a, b| a.partial_cmp(b).unwrap())
            .unwrap_or(0.0);

        if max_impact > 0.2 {
            "low".to_string()
        } else if max_impact > 0.1 {
            "medium".to_string()
        } else {
            "high".to_string()
        }
    }

    fn calculate_vulnerability_consistency(&self, scenario_results: &[ScenarioResult]) -> f64 {
        // Check how often the same components appear in top 3 across scenarios
        let mut component_appearances: HashMap<String, usize> = HashMap::new();

        for result in scenario_results {
            for comp in &result.top_3_vulnerabilities {
                *component_appearances.entry(comp.clone()).or_insert(0) += 1;
            }
        }

        // Score based on maximum appearances
        let max_appearances = component_appearances
            .values()
            .max()
            .copied()
            .unwrap_or(0);
        max_appearances as f64 / scenario_results.len() as f64
    }

    fn generate_weight_sensitivity_recommendations(
        &self,
        sensitivities: &[ComponentWeightSensitivity],
    ) -> Vec<String> {
        let mut recommendations = Vec::new();

        let highly_sensitive: Vec<_> = sensitivities
            .iter()
            .filter(|s| s.is_highly_sensitive)
            .collect();

        if !highly_sensitive.is_empty() {
            recommendations.push(format!(
                "{} component(s) are highly sensitive to weight changes. Validate weighting methodology.",
                highly_sensitive.len()
            ));
        }

        if sensitivities.iter().all(|s| !s.is_highly_sensitive) {
            recommendations.push("Results are robust to weight uncertainty. Proceed with confidence.".to_string());
        }

        recommendations
    }

    fn generate_parameter_recommendations(
        &self,
        sensitivities: &[ComponentParameterSensitivity],
    ) -> Vec<String> {
        let mut recommendations = Vec::new();

        let need_better_estimation: Vec<_> = sensitivities
            .iter()
            .filter(|s| s.requires_better_estimation)
            .collect();

        if !need_better_estimation.is_empty() {
            recommendations.push(format!(
                "{} component(s) need better sensitivity parameter estimation through field data collection.",
                need_better_estimation.len()
            ));
        } else {
            recommendations.push("Sensitivity parameters are sufficiently accurate. No additional data collection needed.".to_string());
        }

        recommendations
    }

    fn generate_scenario_recommendations(&self, cv: f64, consistency: f64) -> Vec<String> {
        let mut recommendations = Vec::new();

        if cv < 0.15 {
            recommendations.push("Assessment is robust across scenarios. Policy recommendations are stable.".to_string());
        } else {
            recommendations.push("Assessment varies significantly across scenarios. Consider scenario-specific policies.".to_string());
        }

        if consistency > 0.7 {
            recommendations.push("Top vulnerabilities are consistent across scenarios. Focus interventions on these components.".to_string());
        } else {
            recommendations.push("Vulnerability priorities change across scenarios. Develop flexible, adaptive policies.".to_string());
        }

        recommendations
    }

    fn generate_benchmark_recommendations(&self, max_impact: f64, baseline_fsfvi: f64) -> Vec<String> {
        let mut recommendations = Vec::new();

        let impact_pct = (max_impact / baseline_fsfvi) * 100.0;

        if impact_pct < 10.0 {
            recommendations.push("Results are robust to benchmark uncertainty. Current benchmarks are adequate.".to_string());
        } else if impact_pct < 20.0 {
            recommendations.push("Moderate sensitivity to benchmarks. Consider validating benchmarks with multiple sources.".to_string());
        } else {
            recommendations.push("High sensitivity to benchmarks. CRITICAL: Validate benchmark values before making policy decisions.".to_string());
        }

        recommendations
    }

    fn generate_monte_carlo_recommendations(&self, cv: f64) -> Vec<String> {
        let mut recommendations = Vec::new();

        if cv < 0.10 {
            recommendations.push("HIGHLY ROBUST: Combined parameter uncertainty has minimal impact. High confidence in results.".to_string());
        } else if cv < 0.15 {
            recommendations.push("ROBUST: Results are stable under combined parameter uncertainty. Suitable for policy decisions.".to_string());
        } else if cv < 0.25 {
            recommendations.push("MODERATE UNCERTAINTY: Some caution warranted. Consider sensitivity-specific data improvement.".to_string());
        } else {
            recommendations.push("HIGH UNCERTAINTY: Improve data quality before making major policy decisions.".to_string());
        }

        recommendations
    }
}

// Response Types

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WeightSensitivityReport {
    pub baseline_fsfvi: f64,
    pub component_sensitivities: Vec<ComponentWeightSensitivity>,
    pub overall_robustness: String, // "low", "medium", "high"
    pub recommendations: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentWeightSensitivity {
    pub component_type: String,
    pub baseline_weight: f64,
    pub perturbation_results: Vec<WeightPerturbationResult>,
    pub elasticity: f64, // % change in FSFVI per % change in weight
    pub is_highly_sensitive: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WeightPerturbationResult {
    pub perturbation_percent: f64,
    pub fsfvi_with_increase: f64,
    pub fsfvi_with_decrease: f64,
    pub fsfvi_change_range: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParameterSensitivityReport {
    pub baseline_fsfvi: f64,
    pub component_sensitivities: Vec<ComponentParameterSensitivity>,
    pub overall_parameter_robustness: String,
    pub recommendations: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentParameterSensitivity {
    pub component_type: String,
    pub baseline_sensitivity_parameter: f64,
    pub perturbation_results: Vec<ParameterPerturbationResult>,
    pub max_fsfvi_impact: f64,
    pub requires_better_estimation: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParameterPerturbationResult {
    pub perturbation_percent: f64,
    pub fsfvi_with_increase: f64,
    pub fsfvi_with_decrease: f64,
    pub fsfvi_range: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScenarioRobustnessReport {
    pub scenario_results: Vec<ScenarioResult>,
    pub mean_fsfvi: f64,
    pub std_dev_fsfvi: f64,
    pub coefficient_of_variation: f64,
    pub min_fsfvi: f64,
    pub max_fsfvi: f64,
    pub vulnerability_consistency_score: f64, // 0.0-1.0
    pub is_robust: bool,
    pub recommendations: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScenarioResult {
    pub scenario: String,
    pub fsfvi: f64,
    pub risk_level: String,
    pub top_3_vulnerabilities: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BenchmarkSensitivityReport {
    pub baseline_fsfvi: f64,
    pub perturbation_results: Vec<BenchmarkPerturbationResult>,
    pub max_fsfvi_impact: f64,
    pub is_robust_to_benchmarks: bool,
    pub recommendations: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BenchmarkPerturbationResult {
    pub perturbation_percent: f64,
    pub fsfvi_with_higher_benchmarks: f64,
    pub fsfvi_with_lower_benchmarks: f64,
    pub fsfvi_range: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonteCarloSensitivityReport {
    pub baseline_fsfvi: f64,
    pub num_simulations: usize,
    pub parameter_uncertainty_percent: f64,
    pub mean_fsfvi: f64,
    pub std_dev_fsfvi: f64,
    pub min_fsfvi: f64,
    pub max_fsfvi: f64,
    pub confidence_interval_90: (f64, f64),
    pub confidence_interval_95: (f64, f64),
    pub coefficient_of_variation: f64,
    pub is_robust: bool,
    pub recommendations: Vec<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_components() -> Vec<Component> {
        vec![
            Component {
                component_id: Some("test_1".to_string()),
                component_type: "agricultural_development".to_string(),
                observed_value: 100.0,
                benchmark_value: 120.0,
                financial_allocation: 1000.0,
                weight: Some(0.4),
                sensitivity_parameter: Some(0.001),
            },
            Component {
                component_id: Some("test_2".to_string()),
                component_type: "infrastructure".to_string(),
                observed_value: 80.0,
                benchmark_value: 100.0,
                financial_allocation: 500.0,
                weight: Some(0.6),
                sensitivity_parameter: Some(0.0015),
            },
        ]
    }

    #[test]
    fn test_weight_sensitivity_analysis() {
        let service = SensitivityAnalysisService::new();
        let perturbations = vec![0.10, 0.20];

        let report = service
            .analyze_weight_sensitivity(create_test_components(), perturbations)
            .unwrap();

        assert!(report.baseline_fsfvi > 0.0);
        assert_eq!(report.component_sensitivities.len(), 2);
    }

    #[test]
    fn test_scenario_robustness() {
        let service = SensitivityAnalysisService::new();

        let report = service
            .analyze_scenario_robustness(create_test_components())
            .unwrap();

        assert!(report.scenario_results.len() > 0);
        assert!(report.mean_fsfvi > 0.0);
    }
}
