//! Budget Optimization Service
//!
//! Implements FSFSI-based budget optimization using the closed-form solution.
//! The exponential stress model yields: fᵢ* = (1/αᵢ) · ln(ωᵢδᵢαᵢ/λ)
//!
//! Services:
//! - Efficiency analysis (current vs optimal allocation)
//! - Reallocation plan generation
//! - ROI analysis per component
//! - Constrained optimization with min/max bounds

use crate::core::calculations::{
    calculate_optimal_allocation, calculate_performance_gap, calculate_stress,
    calculate_system_fsfsi, round_to_precision, safe_divide,
};
use crate::errors::FsfiResult;
use crate::services::assessment::{resolve_sensitivity, ComponentInput};
use pyo3::prelude::*;
use serde::{Deserialize, Serialize};
use std::time::Instant;

// ---------------------------------------------------------------------------
// Data Structures
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EfficiencyAnalysis {
    pub current_fsfsi: f64,
    pub optimal_fsfsi: f64,
    pub efficiency_index: f64,
    pub waste_ratio: f64,
    pub components: Vec<ComponentEfficiency>,
    pub total_budget_lcu: f64,
    pub computing_time_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentEfficiency {
    pub component_type: String,
    pub current_allocation_lcu: f64,
    pub optimal_allocation_lcu: f64,
    pub allocation_gap_lcu: f64,
    pub allocation_gap_pct: f64,
    pub current_stress: f64,
    pub optimal_stress: f64,
    pub stress_reduction: f64,
    pub is_underfunded: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReallocationPlan {
    pub components: Vec<ReallocationItem>,
    pub current_fsfsi: f64,
    pub projected_fsfsi: f64,
    pub projected_improvement: f64,
    pub projected_improvement_pct: f64,
    pub total_budget_lcu: f64,
    pub computing_time_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReallocationItem {
    pub component_type: String,
    pub current_allocation_lcu: f64,
    pub recommended_allocation_lcu: f64,
    pub change_lcu: f64,
    pub change_pct: f64,
    pub priority: usize,
    pub projected_impact: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoiAnalysis {
    pub components: Vec<ComponentRoi>,
    pub best_roi_component: String,
    pub worst_roi_component: String,
    pub total_budget_lcu: f64,
    pub computing_time_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentRoi {
    pub component_type: String,
    pub current_stress: f64,
    pub marginal_benefit: f64,
    pub roi_per_million: f64,
    pub rank: usize,
}

// ---------------------------------------------------------------------------
// Service Functions
// ---------------------------------------------------------------------------

pub fn analyze_efficiency(components: &[ComponentInput]) -> FsfiResult<EfficiencyAnalysis> {
    let start = Instant::now();
    let n = components.len();
    let total_budget: f64 = components.iter().map(|c| c.financial_allocation_lcu).sum();

    let (gaps, allocs_m, sensitivities, weights) = prepare_vectors(components)?;

    let current_fsfsi = calculate_system_fsfsi(&gaps, &allocs_m, &sensitivities, &weights)?;
    let optimal_allocs =
        calculate_optimal_allocation(&gaps, &sensitivities, &weights, total_budget / 1_000_000.0)?;
    let optimal_fsfsi = calculate_system_fsfsi(&gaps, &optimal_allocs, &sensitivities, &weights)?;

    let efficiency_index = if current_fsfsi > 0.0 {
        (optimal_fsfsi / current_fsfsi).clamp(0.0, 1.0)
    } else {
        1.0
    };

    let mut comp_results = Vec::with_capacity(n);
    for i in 0..n {
        let current_stress = calculate_stress(gaps[i], allocs_m[i], sensitivities[i])?;
        let optimal_stress = calculate_stress(gaps[i], optimal_allocs[i], sensitivities[i])?;
        let optimal_lcu = optimal_allocs[i] * 1_000_000.0;
        let current_lcu = components[i].financial_allocation_lcu;
        let gap_lcu = optimal_lcu - current_lcu;

        comp_results.push(ComponentEfficiency {
            component_type: components[i].component_type.clone(),
            current_allocation_lcu: current_lcu,
            optimal_allocation_lcu: round_to_precision(optimal_lcu, Some(0)),
            allocation_gap_lcu: round_to_precision(gap_lcu, Some(0)),
            allocation_gap_pct: round_to_precision(
                safe_divide(gap_lcu, current_lcu, 0.0) * 100.0,
                Some(1),
            ),
            current_stress: round_to_precision(current_stress, Some(4)),
            optimal_stress: round_to_precision(optimal_stress, Some(4)),
            stress_reduction: round_to_precision(current_stress - optimal_stress, Some(4)),
            is_underfunded: gap_lcu > 0.0,
        });
    }

    Ok(EfficiencyAnalysis {
        current_fsfsi: round_to_precision(current_fsfsi, Some(4)),
        optimal_fsfsi: round_to_precision(optimal_fsfsi, Some(4)),
        efficiency_index: round_to_precision(efficiency_index, Some(4)),
        waste_ratio: round_to_precision(1.0 - efficiency_index, Some(4)),
        components: comp_results,
        total_budget_lcu: total_budget,
        computing_time_ms: start.elapsed().as_millis() as u64,
    })
}

pub fn generate_reallocation_plan(
    components: &[ComponentInput],
    target_budget: Option<f64>,
) -> FsfiResult<ReallocationPlan> {
    let start = Instant::now();
    let total_budget = target_budget
        .unwrap_or_else(|| components.iter().map(|c| c.financial_allocation_lcu).sum());

    let (gaps, allocs_m, sensitivities, weights) = prepare_vectors(components)?;

    let current_fsfsi = calculate_system_fsfsi(&gaps, &allocs_m, &sensitivities, &weights)?;
    let optimal_allocs =
        calculate_optimal_allocation(&gaps, &sensitivities, &weights, total_budget / 1_000_000.0)?;
    let projected_fsfsi =
        calculate_system_fsfsi(&gaps, &optimal_allocs, &sensitivities, &weights)?;

    let improvement = current_fsfsi - projected_fsfsi;
    let improvement_pct = safe_divide(improvement, current_fsfsi, 0.0) * 100.0;

    // Sort by absolute change descending for priority
    let mut indexed: Vec<(usize, f64)> = (0..components.len())
        .map(|i| {
            let change = (optimal_allocs[i] * 1_000_000.0) - components[i].financial_allocation_lcu;
            (i, change.abs())
        })
        .collect();
    indexed.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());

    let items: Vec<ReallocationItem> = indexed
        .iter()
        .enumerate()
        .map(|(rank, &(idx, _))| {
            let current_lcu = components[idx].financial_allocation_lcu;
            let recommended_lcu = optimal_allocs[idx] * 1_000_000.0;
            let change = recommended_lcu - current_lcu;

            ReallocationItem {
                component_type: components[idx].component_type.clone(),
                current_allocation_lcu: current_lcu,
                recommended_allocation_lcu: round_to_precision(recommended_lcu, Some(0)),
                change_lcu: round_to_precision(change, Some(0)),
                change_pct: round_to_precision(safe_divide(change, current_lcu, 0.0) * 100.0, Some(1)),
                priority: rank + 1,
                projected_impact: if change > 0.0 {
                    "Increase funding to reduce stress".to_string()
                } else {
                    "Reallocate surplus to higher-need areas".to_string()
                },
            }
        })
        .collect();

    Ok(ReallocationPlan {
        components: items,
        current_fsfsi: round_to_precision(current_fsfsi, Some(4)),
        projected_fsfsi: round_to_precision(projected_fsfsi, Some(4)),
        projected_improvement: round_to_precision(improvement, Some(4)),
        projected_improvement_pct: round_to_precision(improvement_pct, Some(1)),
        total_budget_lcu: total_budget,
        computing_time_ms: start.elapsed().as_millis() as u64,
    })
}

pub fn calculate_roi(components: &[ComponentInput]) -> FsfiResult<RoiAnalysis> {
    let start = Instant::now();
    let total_budget: f64 = components.iter().map(|c| c.financial_allocation_lcu).sum();
    let (gaps, allocs_m, sensitivities, weights) = prepare_vectors(components)?;

    // Marginal benefit = -∂FSFSI/∂fᵢ = ωᵢ · δᵢ · αᵢ · e^(-αᵢfᵢ)
    let mut roi_items: Vec<ComponentRoi> = Vec::with_capacity(components.len());

    for i in 0..components.len() {
        let stress = calculate_stress(gaps[i], allocs_m[i], sensitivities[i])?;
        let marginal = weights[i] * gaps[i] * sensitivities[i] * (-sensitivities[i] * allocs_m[i]).exp();
        let roi = marginal * 1_000_000.0; // per $1M

        roi_items.push(ComponentRoi {
            component_type: components[i].component_type.clone(),
            current_stress: round_to_precision(stress, Some(4)),
            marginal_benefit: round_to_precision(marginal, Some(6)),
            roi_per_million: round_to_precision(roi, Some(4)),
            rank: 0,
        });
    }

    // Rank by ROI descending
    roi_items.sort_by(|a, b| b.roi_per_million.partial_cmp(&a.roi_per_million).unwrap());
    for (i, item) in roi_items.iter_mut().enumerate() {
        item.rank = i + 1;
    }

    let best = roi_items.first().map(|r| r.component_type.clone()).unwrap_or_default();
    let worst = roi_items.last().map(|r| r.component_type.clone()).unwrap_or_default();

    Ok(RoiAnalysis {
        components: roi_items,
        best_roi_component: best,
        worst_roi_component: worst,
        total_budget_lcu: total_budget,
        computing_time_ms: start.elapsed().as_millis() as u64,
    })
}

// ---------------------------------------------------------------------------
// Helpers (prepare_vectors is also used by planning service)
// ---------------------------------------------------------------------------

/// Public for use by planning service: (gaps, allocations_millions, sensitivities, weights).
pub fn get_component_vectors(
    components: &[ComponentInput],
) -> FsfiResult<(Vec<f64>, Vec<f64>, Vec<f64>, Vec<f64>)> {
    prepare_vectors(components)
}

fn prepare_vectors(
    components: &[ComponentInput],
) -> FsfiResult<(Vec<f64>, Vec<f64>, Vec<f64>, Vec<f64>)> {
    let n = components.len();
    let mut gaps = Vec::with_capacity(n);
    let mut allocs = Vec::with_capacity(n);
    let mut sensitivities = Vec::with_capacity(n);

    for comp in components {
        let gap = calculate_performance_gap(comp.observed_value, comp.benchmark_value)?;
        gaps.push(gap);
        allocs.push(comp.financial_allocation_lcu / 1_000_000.0);
        sensitivities.push(resolve_sensitivity(comp));
    }

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

    Ok((gaps, allocs, sensitivities, weights))
}

// ---------------------------------------------------------------------------
// PyO3 Functions
// ---------------------------------------------------------------------------

#[pyfunction]
pub fn py_analyze_efficiency(components_json: &str) -> PyResult<String> {
    let components: Vec<ComponentInput> = serde_json::from_str(components_json)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(format!("Invalid JSON: {}", e)))?;

    let result = analyze_efficiency(&components)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(e.to_string()))?;

    serde_json::to_string(&result)
        .map_err(|e| pyo3::exceptions::PyRuntimeError::new_err(e.to_string()))
}

#[pyfunction]
#[pyo3(signature = (components_json, target_budget=None))]
pub fn py_generate_reallocation_plan(
    components_json: &str,
    target_budget: Option<f64>,
) -> PyResult<String> {
    let components: Vec<ComponentInput> = serde_json::from_str(components_json)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(format!("Invalid JSON: {}", e)))?;

    let result = generate_reallocation_plan(&components, target_budget)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(e.to_string()))?;

    serde_json::to_string(&result)
        .map_err(|e| pyo3::exceptions::PyRuntimeError::new_err(e.to_string()))
}

#[pyfunction]
pub fn py_calculate_roi(components_json: &str) -> PyResult<String> {
    let components: Vec<ComponentInput> = serde_json::from_str(components_json)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(format!("Invalid JSON: {}", e)))?;

    let result = calculate_roi(&components)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(e.to_string()))?;

    serde_json::to_string(&result)
        .map_err(|e| pyo3::exceptions::PyRuntimeError::new_err(e.to_string()))
}

pub fn register_functions(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(py_analyze_efficiency, m)?)?;
    m.add_function(wrap_pyfunction!(py_generate_reallocation_plan, m)?)?;
    m.add_function(wrap_pyfunction!(py_calculate_roi, m)?)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample() -> Vec<ComponentInput> {
        vec![
            ComponentInput {
                component_type: "agricultural_development".into(),
                observed_value: 75.0, benchmark_value: 90.0,
                financial_allocation_lcu: 125_000_000.0,
                sensitivity_parameter: Some(0.0015), weight: Some(0.35), name: None,
            },
            ComponentInput {
                component_type: "infrastructure".into(),
                observed_value: 60.0, benchmark_value: 85.0,
                financial_allocation_lcu: 95_000_000.0,
                sensitivity_parameter: Some(0.0018), weight: Some(0.30), name: None,
            },
            ComponentInput {
                component_type: "nutrition_health".into(),
                observed_value: 70.0, benchmark_value: 80.0,
                financial_allocation_lcu: 80_000_000.0,
                sensitivity_parameter: Some(0.0020), weight: Some(0.20), name: None,
            },
            ComponentInput {
                component_type: "climate_natural_resources".into(),
                observed_value: 50.0, benchmark_value: 75.0,
                financial_allocation_lcu: 60_000_000.0,
                sensitivity_parameter: Some(0.0008), weight: Some(0.15), name: None,
            },
        ]
    }

    #[test]
    fn test_efficiency_analysis() {
        let result = analyze_efficiency(&sample()).unwrap();
        assert!(result.current_fsfsi > 0.0);
        assert!(result.optimal_fsfsi <= result.current_fsfsi);
        assert!(result.efficiency_index > 0.0 && result.efficiency_index <= 1.0);
        assert_eq!(result.components.len(), 4);
    }

    #[test]
    fn test_reallocation_plan() {
        let result = generate_reallocation_plan(&sample(), None).unwrap();
        assert!(result.projected_improvement >= 0.0);
        assert_eq!(result.components.len(), 4);
        // Check priorities are 1-4
        let priorities: Vec<usize> = result.components.iter().map(|c| c.priority).collect();
        assert!(priorities.contains(&1));
        assert!(priorities.contains(&4));
    }

    #[test]
    fn test_roi_analysis() {
        let result = calculate_roi(&sample()).unwrap();
        assert_eq!(result.components.len(), 4);
        assert!(!result.best_roi_component.is_empty());
        // Ranks should be 1-4
        for item in &result.components {
            assert!(item.rank >= 1 && item.rank <= 4);
            assert!(item.roi_per_million >= 0.0);
        }
    }
}
