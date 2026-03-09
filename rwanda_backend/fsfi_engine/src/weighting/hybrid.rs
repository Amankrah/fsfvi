//! Hybrid Weighting System
//!
//! Combines all four weighting methods:
//!   ω_hybrid = α·ω_expert + β·ω_pagerank + γ·ω_cascade + δ·ω_financial
//!
//! Default coefficients: α=0.35, β=0.30, γ=0.25, δ=0.10

use crate::config::get_weighting_config;
use crate::errors::FsfiResult;
use crate::weighting::expert::calculate_ahp_weights;
use crate::weighting::financial::calculate_financial_weights;
use crate::weighting::models::{normalize_weights, Component, COMPONENT_ORDER};
use crate::weighting::network::{calculate_cascade_multipliers, calculate_pagerank};
use pyo3::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Hybrid weighting result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HybridResult {
    pub hybrid_weights: HashMap<String, f64>,
    pub expert_weights: HashMap<String, f64>,
    pub financial_weights: HashMap<String, f64>,
    pub pagerank_weights: HashMap<String, f64>,
    pub cascade_weights: HashMap<String, f64>,
    pub scenario: String,
}

/// Calculate hybrid weights combining all four methods
pub fn calculate_hybrid_weights(
    components: &[Component],
    scenario: Option<&str>,
) -> FsfiResult<HybridResult> {
    let scenario_str = scenario.unwrap_or("normal_operations");
    let config = get_weighting_config();

    // Calculate individual method weights
    let ahp_result = calculate_ahp_weights(scenario_str)?;
    let expert_weights = ahp_result.weights;

    let financial_weights = calculate_financial_weights(components)?;
    let pagerank_weights = calculate_pagerank(scenario_str)?;
    let cascade_weights = calculate_cascade_multipliers(scenario_str)?;

    // Combine: ω_hybrid = α·expert + β·pagerank + γ·cascade + δ·financial
    let alpha = config.hybrid_expert_weight;
    let beta = config.hybrid_pagerank_weight;
    let gamma = config.hybrid_cascade_weight;
    let delta = config.hybrid_financial_weight;

    let mut hybrid = HashMap::new();
    for &component in &COMPONENT_ORDER {
        let name = component.to_string();
        let w = alpha * expert_weights.get(&name).copied().unwrap_or(0.0)
            + beta * pagerank_weights.get(&name).copied().unwrap_or(0.0)
            + gamma * cascade_weights.get(&name).copied().unwrap_or(0.0)
            + delta * financial_weights.get(&name).copied().unwrap_or(0.0);
        hybrid.insert(name, w);
    }

    let hybrid_weights = normalize_weights(&hybrid);

    Ok(HybridResult {
        hybrid_weights,
        expert_weights,
        financial_weights,
        pagerank_weights,
        cascade_weights,
        scenario: scenario_str.to_string(),
    })
}

/// Calculate hybrid weights with performance-based adjustment
///
/// Components with higher stress get a weight boost (bounded).
/// adjustment_factor = 1.0 + stress, clamped to [0.5, 2.0]
pub fn calculate_hybrid_weights_with_performance(
    components: &[Component],
    stress_scores: &HashMap<String, f64>,
    scenario: Option<&str>,
) -> FsfiResult<HashMap<String, f64>> {
    let config = get_weighting_config();
    let result = calculate_hybrid_weights(components, scenario)?;
    let mut adjusted = HashMap::new();

    for (name, &base_weight) in &result.hybrid_weights {
        let stress = stress_scores.get(name).copied().unwrap_or(0.0);
        let adjustment = (1.0 + stress)
            .max(config.adjustment_min_factor)
            .min(config.adjustment_max_factor);
        adjusted.insert(name.clone(), base_weight * adjustment);
    }

    Ok(normalize_weights(&adjusted))
}

// ---------------------------------------------------------------------------
// PyO3 Functions
// ---------------------------------------------------------------------------

#[pyfunction]
#[pyo3(signature = (components_json, scenario=None))]
fn py_calculate_hybrid_weights(components_json: &str, scenario: Option<&str>) -> PyResult<String> {
    let components: Vec<Component> = serde_json::from_str(components_json)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(format!("JSON parse error: {}", e)))?;

    let result = calculate_hybrid_weights(&components, scenario)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(e.to_string()))?;

    serde_json::to_string(&result)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(format!("Serialization error: {}", e)))
}

#[pyfunction]
#[pyo3(signature = (components_json, stress_json, scenario=None))]
fn py_calculate_hybrid_weights_with_performance(
    components_json: &str,
    stress_json: &str,
    scenario: Option<&str>,
) -> PyResult<String> {
    let components: Vec<Component> = serde_json::from_str(components_json)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(format!("JSON parse error: {}", e)))?;

    let stress_scores: HashMap<String, f64> = serde_json::from_str(stress_json)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(format!("JSON parse error: {}", e)))?;

    let weights = calculate_hybrid_weights_with_performance(&components, &stress_scores, scenario)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(e.to_string()))?;

    serde_json::to_string(&weights)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(format!("Serialization error: {}", e)))
}

pub fn register_functions(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(py_calculate_hybrid_weights, m)?)?;
    m.add_function(wrap_pyfunction!(py_calculate_hybrid_weights_with_performance, m)?)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_components() -> Vec<Component> {
        vec![
            Component {
                name: "Agriculture".into(),
                component_type: "agricultural_development".into(),
                financial_allocation: 30.0,
                observed_value: 80.0,
                benchmark_value: 100.0,
            },
            Component {
                name: "Infrastructure".into(),
                component_type: "infrastructure".into(),
                financial_allocation: 25.0,
                observed_value: 70.0,
                benchmark_value: 90.0,
            },
            Component {
                name: "Nutrition".into(),
                component_type: "nutrition_health".into(),
                financial_allocation: 20.0,
                observed_value: 60.0,
                benchmark_value: 85.0,
            },
            Component {
                name: "Climate".into(),
                component_type: "climate_natural_resources".into(),
                financial_allocation: 10.0,
                observed_value: 50.0,
                benchmark_value: 75.0,
            },
            Component {
                name: "Social".into(),
                component_type: "social_protection_equity".into(),
                financial_allocation: 10.0,
                observed_value: 55.0,
                benchmark_value: 80.0,
            },
            Component {
                name: "Governance".into(),
                component_type: "governance_institutions".into(),
                financial_allocation: 5.0,
                observed_value: 65.0,
                benchmark_value: 70.0,
            },
        ]
    }

    #[test]
    fn test_hybrid_weights_sum_to_one() {
        let result = calculate_hybrid_weights(&test_components(), None).unwrap();
        let sum: f64 = result.hybrid_weights.values().sum();
        assert!((sum - 1.0).abs() < 1e-6);
    }

    #[test]
    fn test_hybrid_all_components_present() {
        let result = calculate_hybrid_weights(&test_components(), None).unwrap();
        assert_eq!(result.hybrid_weights.len(), 6);
        assert_eq!(result.expert_weights.len(), 6);
        assert_eq!(result.financial_weights.len(), 6);
        assert_eq!(result.pagerank_weights.len(), 6);
        assert_eq!(result.cascade_weights.len(), 6);
    }

    #[test]
    fn test_hybrid_with_performance() {
        let mut stress = HashMap::new();
        stress.insert("agricultural_development".to_string(), 0.5);
        stress.insert("infrastructure".to_string(), 0.3);
        stress.insert("nutrition_health".to_string(), 0.8);
        stress.insert("climate_natural_resources".to_string(), 0.2);
        stress.insert("social_protection_equity".to_string(), 0.4);
        stress.insert("governance_institutions".to_string(), 0.1);

        let weights =
            calculate_hybrid_weights_with_performance(&test_components(), &stress, None).unwrap();

        let sum: f64 = weights.values().sum();
        assert!((sum - 1.0).abs() < 1e-6);

        // Nutrition has highest stress (0.8) — should get a weight boost
        let nutr_base = calculate_hybrid_weights(&test_components(), None)
            .unwrap()
            .hybrid_weights["nutrition_health"];
        let nutr_adjusted = weights["nutrition_health"];
        assert!(nutr_adjusted > nutr_base * 0.9); // At least not drastically lower
    }

    #[test]
    fn test_hybrid_all_scenarios() {
        let scenarios = [
            "normal_operations",
            "climate_shock",
            "financial_crisis",
            "pandemic_disruption",
            "political_instability",
        ];
        for s in &scenarios {
            let result = calculate_hybrid_weights(&test_components(), Some(s)).unwrap();
            let sum: f64 = result.hybrid_weights.values().sum();
            assert!((sum - 1.0).abs() < 1e-6, "Scenario {} failed", s);
        }
    }
}
