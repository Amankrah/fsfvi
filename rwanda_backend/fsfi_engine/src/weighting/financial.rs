//! Financial Weighting System
//!
//! Budget-based proportional weights with cost-effectiveness adjustments.
//! Includes funding gap analysis and concentration metrics.

use crate::errors::{FsfiError, FsfiResult};
use crate::weighting::models::{
    get_cost_effectiveness_multipliers, normalize_weights, Component,
};
use pyo3::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Financial analysis result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FinancialAnalysisResult {
    pub raw_weights: HashMap<String, f64>,
    pub effective_weights: HashMap<String, f64>,
    pub concentration_index: f64,
    pub underfunded_components: Vec<String>,
    pub scenario: Option<String>,
}

/// Calculate raw financial weights: ωᵢ = fᵢ / Σⱼfⱼ
pub fn calculate_financial_weights(components: &[Component]) -> FsfiResult<HashMap<String, f64>> {
    if components.is_empty() {
        return Err(FsfiError::calculation("No components provided"));
    }

    let total: f64 = components.iter().map(|c| c.financial_allocation).sum();
    if total <= 0.0 {
        // Equal weights if no budget data
        let equal = 1.0 / components.len() as f64;
        return Ok(components
            .iter()
            .map(|c| (c.component_type.clone(), equal))
            .collect());
    }

    Ok(components
        .iter()
        .map(|c| (c.component_type.clone(), c.financial_allocation / total))
        .collect())
}

/// Calculate cost-effectiveness adjusted weights
///
/// ω_eff_i = (fᵢ × eᵢ) / Σⱼ(fⱼ × eⱼ)
/// where eᵢ is cost-effectiveness multiplier
pub fn calculate_effective_weights(
    components: &[Component],
    scenario: Option<&str>,
) -> FsfiResult<HashMap<String, f64>> {
    let multipliers = get_cost_effectiveness_multipliers(scenario.unwrap_or("normal_operations"));

    let mut effective: HashMap<String, f64> = HashMap::new();
    for c in components {
        let mult = multipliers.get(&c.component_type).copied().unwrap_or(1.0);
        effective.insert(c.component_type.clone(), c.financial_allocation * mult);
    }

    Ok(normalize_weights(&effective))
}

/// Calculate Herfindahl-Hirschman Index (allocation concentration)
///
/// HHI = Σᵢ(sᵢ²) where sᵢ is the allocation share
/// HHI close to 1/n = balanced, close to 1.0 = concentrated
pub fn calculate_concentration_index(components: &[Component]) -> FsfiResult<f64> {
    let weights = calculate_financial_weights(components)?;
    let hhi: f64 = weights.values().map(|w| w * w).sum();
    Ok(hhi)
}

/// Identify underfunded components based on minimum thresholds
pub fn identify_underfunded(
    components: &[Component],
    is_crisis: bool,
) -> FsfiResult<Vec<String>> {
    let weights = calculate_financial_weights(components)?;
    let thresholds = if is_crisis {
        get_crisis_thresholds()
    } else {
        get_normal_thresholds()
    };

    let underfunded: Vec<String> = weights
        .iter()
        .filter(|(comp, &weight)| {
            thresholds
                .get(comp.as_str())
                .map_or(false, |&threshold| weight < threshold)
        })
        .map(|(comp, _)| comp.clone())
        .collect();

    Ok(underfunded)
}

/// Full financial analysis
pub fn analyze_financial_allocations(
    components: &[Component],
    scenario: Option<&str>,
    is_crisis: bool,
) -> FsfiResult<FinancialAnalysisResult> {
    let raw_weights = calculate_financial_weights(components)?;
    let effective_weights = calculate_effective_weights(components, scenario)?;
    let concentration_index = calculate_concentration_index(components)?;
    let underfunded_components = identify_underfunded(components, is_crisis)?;

    Ok(FinancialAnalysisResult {
        raw_weights,
        effective_weights,
        concentration_index,
        underfunded_components,
        scenario: scenario.map(String::from),
    })
}

fn get_normal_thresholds() -> HashMap<&'static str, f64> {
    let mut t = HashMap::new();
    t.insert("agricultural_development", 0.15);
    t.insert("infrastructure", 0.10);
    t.insert("nutrition_health", 0.12);
    t.insert("climate_natural_resources", 0.05);
    t.insert("social_protection_equity", 0.08);
    t.insert("governance_institutions", 0.03);
    t
}

fn get_crisis_thresholds() -> HashMap<&'static str, f64> {
    let mut t = HashMap::new();
    t.insert("agricultural_development", 0.12);
    t.insert("infrastructure", 0.08);
    t.insert("nutrition_health", 0.18);
    t.insert("climate_natural_resources", 0.03);
    t.insert("social_protection_equity", 0.15);
    t.insert("governance_institutions", 0.02);
    t
}

// ---------------------------------------------------------------------------
// PyO3 Functions
// ---------------------------------------------------------------------------

#[pyfunction]
fn py_calculate_financial_weights(components_json: &str) -> PyResult<String> {
    let components: Vec<Component> = serde_json::from_str(components_json)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(format!("JSON parse error: {}", e)))?;

    let weights = calculate_financial_weights(&components)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(e.to_string()))?;

    serde_json::to_string(&weights)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(format!("Serialization error: {}", e)))
}

#[pyfunction]
#[pyo3(signature = (components_json, scenario=None, is_crisis=false))]
fn py_analyze_financial(components_json: &str, scenario: Option<&str>, is_crisis: bool) -> PyResult<String> {
    let components: Vec<Component> = serde_json::from_str(components_json)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(format!("JSON parse error: {}", e)))?;

    let result = analyze_financial_allocations(&components, scenario, is_crisis)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(e.to_string()))?;

    serde_json::to_string(&result)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(format!("Serialization error: {}", e)))
}

pub fn register_functions(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(py_calculate_financial_weights, m)?)?;
    m.add_function(wrap_pyfunction!(py_analyze_financial, m)?)?;
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
    fn test_financial_weights_sum_to_one() {
        let weights = calculate_financial_weights(&test_components()).unwrap();
        let sum: f64 = weights.values().sum();
        assert!((sum - 1.0).abs() < 1e-10);
    }

    #[test]
    fn test_effective_weights_sum_to_one() {
        let weights = calculate_effective_weights(&test_components(), None).unwrap();
        let sum: f64 = weights.values().sum();
        assert!((sum - 1.0).abs() < 1e-10);
    }

    #[test]
    fn test_concentration_index() {
        let hhi = calculate_concentration_index(&test_components()).unwrap();
        // HHI must be between 1/n and 1.0
        assert!(hhi >= 1.0 / 6.0 - 0.01);
        assert!(hhi <= 1.0);
    }

    #[test]
    fn test_financial_analysis() {
        let result = analyze_financial_allocations(&test_components(), None, false).unwrap();
        assert_eq!(result.raw_weights.len(), 6);
        assert_eq!(result.effective_weights.len(), 6);
    }
}
