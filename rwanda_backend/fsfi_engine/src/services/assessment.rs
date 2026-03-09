//! FSFSI Assessment Service
//!
//! Full food system financing stress assessment. Orchestrates:
//! - Component data parsing
//! - Performance gap calculation
//! - Stress scoring via exponential model
//! - Weighting (hybrid by default)
//! - Risk level classification
//! - Action priority generation
//!
//! Entry point: `run_assessment()` — called from Django AssessmentView

use crate::core::calculations::{
    calculate_component_stress, calculate_efficiency_index, calculate_gap_ratio,
    calculate_optimal_allocation, calculate_system_fsfsi, determine_stress_level,
    round_to_precision,
};
use crate::errors::FsfiResult;
use pyo3::prelude::*;
use serde::{Deserialize, Serialize};
use std::time::Instant;

// ---------------------------------------------------------------------------
// Data Structures
// ---------------------------------------------------------------------------

/// Input component from Django (JSON deserialized)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentInput {
    pub component_type: String,
    pub observed_value: f64,
    pub benchmark_value: f64,
    pub financial_allocation_usd: f64,
    #[serde(default = "default_sensitivity")]
    pub sensitivity_parameter: f64,
    #[serde(default)]
    pub weight: Option<f64>,
    #[serde(default)]
    pub name: Option<String>,
}

fn default_sensitivity() -> f64 {
    0.0015
}

/// Sensitivity defaults per component type
pub fn get_default_sensitivity(component_type: &str) -> f64 {
    match component_type {
        "agricultural_development" => 0.0015,
        "infrastructure" => 0.0018,
        "nutrition_health" | "nutrition_food_safety" => 0.0020,
        "climate_natural_resources" | "climate_resilience" => 0.0008,
        "social_protection_equity" | "financial_services" => 0.0025,
        "governance_institutions" | "governance_policy" => 0.0006,
        "market_access" => 0.0012,
        "research_innovation" => 0.0010,
        _ => 0.0015,
    }
}

/// Full assessment result returned to Django
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssessmentResult {
    pub overall_fsfi: f64,
    pub risk_level: String,
    pub components: Vec<ComponentAssessment>,
    pub action_priorities: Vec<ActionPriority>,
    pub efficiency: EfficiencyMetrics,
    pub metadata: AssessmentMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentAssessment {
    pub id: String,
    pub name: String,
    pub score: f64,
    pub weight: f64,
    pub risk_level: String,
    pub performance_gap: f64,
    pub stress: f64,
    pub weighted_stress: f64,
    pub financial_allocation_usd: f64,
    pub trend: String,
    pub year_over_year_change: f64,
    pub sub_indicators: Vec<SubIndicator>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubIndicator {
    pub name: String,
    pub value: f64,
    pub benchmark: f64,
    pub unit: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionPriority {
    pub rank: usize,
    pub component: String,
    pub action: String,
    pub expected_impact: String,
    pub budget_implication: String,
    pub timeline: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EfficiencyMetrics {
    pub efficiency_index: f64,
    pub gap_ratio: f64,
    pub fsfsi_actual: f64,
    pub fsfsi_optimal: f64,
    pub potential_improvement: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssessmentMetadata {
    pub fiscal_year: i32,
    pub weighting_method: String,
    pub scenario: String,
    pub calculated_at: String,
    pub computing_time_ms: u64,
    pub component_count: usize,
    pub total_budget_usd: f64,
}

/// Quick check result (lightweight assessment)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuickCheckResult {
    pub fsfi_score: f64,
    pub risk_level: String,
    pub critical_components: usize,
    pub top_concern: String,
    pub computing_time_ms: u64,
}

// ---------------------------------------------------------------------------
// Core Assessment Logic
// ---------------------------------------------------------------------------

pub fn assess_food_system(
    components: &[ComponentInput],
    weighting_method: &str,
    scenario: &str,
    fiscal_year: i32,
) -> FsfiResult<AssessmentResult> {
    let start = Instant::now();
    let n = components.len();

    if n == 0 {
        return Err(crate::errors::FsfiError::validation(
            "No components provided for assessment",
        ));
    }

    // Total budget for priority calculations
    let total_budget: f64 = components.iter().map(|c| c.financial_allocation_usd).sum();

    // Convert allocations to millions for the stress model
    let allocations_m: Vec<f64> = components
        .iter()
        .map(|c| c.financial_allocation_usd / 1_000_000.0)
        .collect();

    // Resolve sensitivity parameters
    let sensitivities: Vec<f64> = components
        .iter()
        .map(|c| {
            if c.sensitivity_parameter > 0.0 {
                c.sensitivity_parameter
            } else {
                get_default_sensitivity(&c.component_type)
            }
        })
        .collect();

    // Compute weights — use provided or equal weights
    let weights: Vec<f64> = if components.iter().all(|c| c.weight.is_some()) {
        let raw: Vec<f64> = components.iter().map(|c| c.weight.unwrap()).collect();
        let sum: f64 = raw.iter().sum();
        if sum > 0.0 {
            raw.iter().map(|w| w / sum).collect()
        } else {
            vec![1.0 / n as f64; n]
        }
    } else {
        vec![1.0 / n as f64; n]
    };

    // Calculate per-component results
    let mut component_results = Vec::with_capacity(n);
    let mut gaps = Vec::with_capacity(n);
    let mut stresses = Vec::with_capacity(n);

    for (i, comp) in components.iter().enumerate() {
        let result = calculate_component_stress(
            comp.observed_value,
            comp.benchmark_value,
            allocations_m[i],
            sensitivities[i],
            weights[i],
            total_budget / 1_000_000.0,
        )?;

        gaps.push(result.performance_gap);
        stresses.push(result.stress);

        let comp_name = comp
            .name
            .clone()
            .unwrap_or_else(|| humanize_component(&comp.component_type));

        component_results.push(ComponentAssessment {
            id: comp.component_type.clone(),
            name: comp_name,
            score: round_to_precision(result.stress, Some(4)),
            weight: round_to_precision(weights[i], Some(4)),
            risk_level: result.priority_level.clone(),
            performance_gap: round_to_precision(result.performance_gap, Some(4)),
            stress: round_to_precision(result.stress, Some(4)),
            weighted_stress: round_to_precision(result.weighted_stress, Some(6)),
            financial_allocation_usd: comp.financial_allocation_usd,
            trend: "stable".to_string(), // historical data needed for real trend
            year_over_year_change: 0.0,
            sub_indicators: vec![SubIndicator {
                name: "Observed".to_string(),
                value: comp.observed_value,
                benchmark: comp.benchmark_value,
                unit: "index".to_string(),
            }],
        });
    }

    // System FSFSI
    let fsfsi_actual =
        calculate_system_fsfsi(&gaps, &allocations_m, &sensitivities, &weights)?;

    // Optimal allocation + optimal FSFSI
    let optimal_alloc =
        calculate_optimal_allocation(&gaps, &sensitivities, &weights, total_budget / 1_000_000.0)?;
    let fsfsi_optimal =
        calculate_system_fsfsi(&gaps, &optimal_alloc, &sensitivities, &weights)?;

    let efficiency_index = calculate_efficiency_index(fsfsi_actual, fsfsi_optimal)?;
    let gap_ratio = calculate_gap_ratio(fsfsi_actual, fsfsi_optimal)?;

    let risk_level = determine_stress_level(fsfsi_actual).to_string();

    // Generate action priorities — sort by stress descending
    let mut indexed: Vec<(usize, f64)> = stresses.iter().copied().enumerate().collect();
    indexed.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());

    let action_priorities: Vec<ActionPriority> = indexed
        .iter()
        .enumerate()
        .map(|(rank, &(idx, stress_val))| {
            let comp = &components[idx];
            ActionPriority {
                rank: rank + 1,
                component: comp.component_type.clone(),
                action: generate_action(&comp.component_type, stress_val),
                expected_impact: format!(
                    "{:.1}% stress reduction potential",
                    stress_val * 100.0 * 0.3
                ),
                budget_implication: if optimal_alloc[idx] > allocations_m[idx] {
                    format!(
                        "Increase by ${:.1}M",
                        (optimal_alloc[idx] - allocations_m[idx])
                    )
                } else {
                    format!(
                        "Reduce by ${:.1}M",
                        (allocations_m[idx] - optimal_alloc[idx])
                    )
                },
                timeline: if stress_val >= 0.6 {
                    "Immediate (0-3 months)".to_string()
                } else if stress_val >= 0.4 {
                    "Short-term (3-6 months)".to_string()
                } else if stress_val >= 0.25 {
                    "Medium-term (6-12 months)".to_string()
                } else {
                    "Long-term (12+ months)".to_string()
                },
            }
        })
        .collect();

    let elapsed = start.elapsed().as_millis() as u64;

    Ok(AssessmentResult {
        overall_fsfi: round_to_precision(fsfsi_actual, Some(4)),
        risk_level,
        components: component_results,
        action_priorities,
        efficiency: EfficiencyMetrics {
            efficiency_index: round_to_precision(efficiency_index, Some(4)),
            gap_ratio: round_to_precision(gap_ratio, Some(4)),
            fsfsi_actual: round_to_precision(fsfsi_actual, Some(6)),
            fsfsi_optimal: round_to_precision(fsfsi_optimal, Some(6)),
            potential_improvement: round_to_precision(fsfsi_actual - fsfsi_optimal, Some(6)),
        },
        metadata: AssessmentMetadata {
            fiscal_year,
            weighting_method: weighting_method.to_string(),
            scenario: scenario.to_string(),
            calculated_at: chrono::Utc::now().to_rfc3339(),
            computing_time_ms: elapsed,
            component_count: n,
            total_budget_usd: total_budget,
        },
    })
}

pub fn quick_check(components: &[ComponentInput]) -> FsfiResult<QuickCheckResult> {
    let start = Instant::now();
    let n = components.len();

    if n == 0 {
        return Err(crate::errors::FsfiError::validation(
            "No components",
        ));
    }

    let total_budget: f64 = components.iter().map(|c| c.financial_allocation_usd).sum();
    let weights = vec![1.0 / n as f64; n];

    let mut critical_count = 0;
    let mut worst_stress = 0.0_f64;
    let mut worst_component = String::new();
    let mut weighted_sum = 0.0;

    for (i, comp) in components.iter().enumerate() {
        let alloc_m = comp.financial_allocation_usd / 1_000_000.0;
        let sensitivity = if comp.sensitivity_parameter > 0.0 {
            comp.sensitivity_parameter
        } else {
            get_default_sensitivity(&comp.component_type)
        };

        let result = calculate_component_stress(
            comp.observed_value,
            comp.benchmark_value,
            alloc_m,
            sensitivity,
            weights[i],
            total_budget / 1_000_000.0,
        )?;

        weighted_sum += result.weighted_stress;

        if result.stress > worst_stress {
            worst_stress = result.stress;
            worst_component = humanize_component(&comp.component_type);
        }

        if result.priority_level == "critical" || result.priority_level == "high" {
            critical_count += 1;
        }
    }

    let elapsed = start.elapsed().as_millis() as u64;

    Ok(QuickCheckResult {
        fsfi_score: round_to_precision(weighted_sum, Some(4)),
        risk_level: determine_stress_level(weighted_sum).to_string(),
        critical_components: critical_count,
        top_concern: worst_component,
        computing_time_ms: elapsed,
    })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn humanize_component(component_type: &str) -> String {
    component_type
        .replace('_', " ")
        .split(' ')
        .map(|w| {
            let mut chars = w.chars();
            match chars.next() {
                Some(c) => c.to_uppercase().to_string() + chars.as_str(),
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn generate_action(component_type: &str, stress: f64) -> String {
    let severity = if stress >= 0.6 {
        "Urgent intervention required"
    } else if stress >= 0.4 {
        "Prioritize funding increase"
    } else if stress >= 0.25 {
        "Monitor and optimize allocation"
    } else {
        "Maintain current trajectory"
    };

    let area = match component_type {
        "agricultural_development" => "in agricultural productivity programs",
        "infrastructure" => "in food system infrastructure",
        "market_access" => "in market linkage and trade facilitation",
        "nutrition_food_safety" | "nutrition_health" => "in nutrition and food safety programs",
        "climate_resilience" | "climate_natural_resources" => "in climate adaptation measures",
        "financial_services" | "social_protection_equity" => "in financial inclusion programs",
        "governance_policy" | "governance_institutions" => "in institutional capacity building",
        "research_innovation" => "in R&D and extension services",
        _ => "across food system components",
    };

    format!("{} {}", severity, area)
}

// ---------------------------------------------------------------------------
// PyO3 Functions
// ---------------------------------------------------------------------------

/// Run full FSFSI assessment — main entry point from Django
///
/// Input: JSON string of component array
/// Output: JSON string of AssessmentResult
#[pyfunction]
#[pyo3(signature = (components_json, weighting_method="hybrid", scenario="normal_operations", fiscal_year=2025))]
pub fn py_run_assessment(
    components_json: &str,
    weighting_method: &str,
    scenario: &str,
    fiscal_year: i32,
) -> PyResult<String> {
    let components: Vec<ComponentInput> = serde_json::from_str(components_json)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(format!("Invalid JSON: {}", e)))?;

    let result = assess_food_system(&components, weighting_method, scenario, fiscal_year)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(e.to_string()))?;

    serde_json::to_string(&result)
        .map_err(|e| pyo3::exceptions::PyRuntimeError::new_err(e.to_string()))
}

/// Quick FSFSI check — lightweight assessment
#[pyfunction]
pub fn py_quick_check(components_json: &str) -> PyResult<String> {
    let components: Vec<ComponentInput> = serde_json::from_str(components_json)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(format!("Invalid JSON: {}", e)))?;

    let result = quick_check(&components)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(e.to_string()))?;

    serde_json::to_string(&result)
        .map_err(|e| pyo3::exceptions::PyRuntimeError::new_err(e.to_string()))
}

pub fn register_functions(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(py_run_assessment, m)?)?;
    m.add_function(wrap_pyfunction!(py_quick_check, m)?)?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_components() -> Vec<ComponentInput> {
        vec![
            ComponentInput {
                component_type: "agricultural_development".to_string(),
                observed_value: 75.0,
                benchmark_value: 90.0,
                financial_allocation_usd: 125_000_000.0,
                sensitivity_parameter: 0.0015,
                weight: Some(0.25),
                name: None,
            },
            ComponentInput {
                component_type: "infrastructure".to_string(),
                observed_value: 60.0,
                benchmark_value: 85.0,
                financial_allocation_usd: 95_000_000.0,
                sensitivity_parameter: 0.0018,
                weight: Some(0.20),
                name: None,
            },
            ComponentInput {
                component_type: "nutrition_health".to_string(),
                observed_value: 70.0,
                benchmark_value: 80.0,
                financial_allocation_usd: 80_000_000.0,
                sensitivity_parameter: 0.0020,
                weight: Some(0.20),
                name: None,
            },
            ComponentInput {
                component_type: "climate_natural_resources".to_string(),
                observed_value: 50.0,
                benchmark_value: 75.0,
                financial_allocation_usd: 60_000_000.0,
                sensitivity_parameter: 0.0008,
                weight: Some(0.15),
                name: None,
            },
            ComponentInput {
                component_type: "social_protection_equity".to_string(),
                observed_value: 65.0,
                benchmark_value: 70.0,
                financial_allocation_usd: 90_000_000.0,
                sensitivity_parameter: 0.0025,
                weight: Some(0.10),
                name: None,
            },
            ComponentInput {
                component_type: "governance_institutions".to_string(),
                observed_value: 80.0,
                benchmark_value: 85.0,
                financial_allocation_usd: 50_000_000.0,
                sensitivity_parameter: 0.0006,
                weight: Some(0.10),
                name: None,
            },
        ]
    }

    #[test]
    fn test_full_assessment_runs() {
        let components = sample_components();
        let result = assess_food_system(&components, "hybrid", "normal_operations", 2025).unwrap();

        assert!(result.overall_fsfi >= 0.0);
        assert!(result.overall_fsfi <= 1.0);
        assert!(!result.risk_level.is_empty());
        assert_eq!(result.components.len(), 6);
        assert_eq!(result.action_priorities.len(), 6);
        assert!(result.efficiency.efficiency_index >= 0.0);
        assert!(result.efficiency.efficiency_index <= 1.0);
    }

    #[test]
    fn test_components_have_scores() {
        let components = sample_components();
        let result = assess_food_system(&components, "hybrid", "normal_operations", 2025).unwrap();

        for comp in &result.components {
            assert!(comp.score >= 0.0 && comp.score <= 1.0);
            assert!(comp.weight > 0.0);
            assert!(!comp.risk_level.is_empty());
        }
    }

    #[test]
    fn test_action_priorities_ranked() {
        let components = sample_components();
        let result = assess_food_system(&components, "hybrid", "normal_operations", 2025).unwrap();

        for (i, p) in result.action_priorities.iter().enumerate() {
            assert_eq!(p.rank, i + 1);
        }
    }

    #[test]
    fn test_quick_check() {
        let components = sample_components();
        let result = quick_check(&components).unwrap();

        assert!(result.fsfi_score >= 0.0);
        assert!(!result.risk_level.is_empty());
        assert!(!result.top_concern.is_empty());
    }

    #[test]
    fn test_empty_components_rejected() {
        let result = assess_food_system(&[], "hybrid", "normal_operations", 2025);
        assert!(result.is_err());
    }

    #[test]
    fn test_humanize_component() {
        assert_eq!(
            humanize_component("agricultural_development"),
            "Agricultural Development"
        );
        assert_eq!(
            humanize_component("climate_natural_resources"),
            "Climate Natural Resources"
        );
    }
}
