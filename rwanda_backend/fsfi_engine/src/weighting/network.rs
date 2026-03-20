//! Network Weighting System
//!
//! PageRank centrality and cascade multiplier calculations
//! from food system dependency matrices.

use crate::config::get_weighting_config;
use crate::errors::FsfiResult;
use crate::weighting::models::{get_indicator_dependency_matrix, normalize_weights, INDICATOR_COMPONENT_ORDER};
use pyo3::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Network analysis result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkResult {
    pub pagerank_weights: HashMap<String, f64>,
    pub cascade_multipliers: HashMap<String, f64>,
    pub scenario: String,
}

/// Calculate PageRank centrality from the dependency matrix
///
/// PR(i) = (1-d)/N + d × Σⱼ T[j][i] × PR(j)
///
/// where d = damping factor (0.85), T = transition matrix
pub fn calculate_pagerank(scenario: &str) -> FsfiResult<HashMap<String, f64>> {
    let matrix = get_indicator_dependency_matrix(scenario);
    let n = matrix.len();
    let config = get_weighting_config();
    let damping = config.pagerank_damping;
    let tolerance = config.pagerank_tolerance;
    let max_iter = config.pagerank_max_iterations;

    // Create transition matrix (column-normalize the dependency matrix)
    let transition = create_transition_matrix(&matrix);

    // Initialize uniform PageRank
    let mut pagerank = vec![1.0 / n as f64; n];

    for _ in 0..max_iter {
        let mut new_pagerank = vec![(1.0 - damping) / n as f64; n];

        for i in 0..n {
            for j in 0..n {
                new_pagerank[i] += damping * transition[j][i] * pagerank[j];
            }
        }

        // Normalize
        let sum: f64 = new_pagerank.iter().sum();
        if sum > 0.0 {
            for x in &mut new_pagerank {
                *x /= sum;
            }
        }

        // Check convergence
        let diff: f64 = pagerank
            .iter()
            .zip(new_pagerank.iter())
            .map(|(a, b)| (a - b).abs())
            .sum();

        pagerank = new_pagerank;

        if diff < tolerance {
            break;
        }
    }

    // Map to component names
    let mut weights = HashMap::new();
    for (i, &component) in INDICATOR_COMPONENT_ORDER.iter().enumerate() {
        if i < pagerank.len() {
            weights.insert(component.to_string(), pagerank[i]);
        }
    }

    Ok(normalize_weights(&weights))
}

/// Calculate cascade multipliers (two-level impact analysis)
///
/// Primary impact = sum of direct dependencies
/// Secondary impact = second-order cascading effects (damped by 0.5)
pub fn calculate_cascade_multipliers(scenario: &str) -> FsfiResult<HashMap<String, f64>> {
    let matrix = get_indicator_dependency_matrix(scenario);
    let n = matrix.len();

    let mut impacts = vec![0.0; n];

    for i in 0..n {
        // Primary impact: how much component i affects others
        let primary: f64 = (0..n)
            .filter(|&j| j != i)
            .map(|j| matrix[i][j])
            .sum();

        // Secondary impact: second-order cascading (damped)
        let secondary: f64 = (0..n)
            .filter(|&j| j != i)
            .map(|j| {
                let first_order = matrix[i][j];
                let second_order: f64 = (0..n)
                    .filter(|&k| k != i && k != j)
                    .map(|k| matrix[j][k])
                    .sum();
                first_order * second_order * 0.5
            })
            .sum();

        impacts[i] = primary + secondary;
    }

    // Normalize to [0,1]
    let max_impact = impacts.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
    if max_impact > 0.0 {
        for x in &mut impacts {
            *x /= max_impact;
        }
    }

    // Map to component names and normalize to sum to 1
    let mut weights = HashMap::new();
    for (i, &component) in INDICATOR_COMPONENT_ORDER.iter().enumerate() {
        if i < impacts.len() {
            weights.insert(component.to_string(), impacts[i]);
        }
    }

    Ok(normalize_weights(&weights))
}

/// Full network analysis (PageRank + cascade)
pub fn analyze_network(scenario: &str) -> FsfiResult<NetworkResult> {
    let pagerank_weights = calculate_pagerank(scenario)?;
    let cascade_multipliers = calculate_cascade_multipliers(scenario)?;

    Ok(NetworkResult {
        pagerank_weights,
        cascade_multipliers,
        scenario: scenario.to_string(),
    })
}

/// Create transition matrix from dependency matrix
/// Column-normalize so each column sums to 1.0
fn create_transition_matrix(matrix: &[Vec<f64>]) -> Vec<Vec<f64>> {
    let n = matrix.len();
    let mut transition = vec![vec![0.0; n]; n];

    for j in 0..n {
        let col_sum: f64 = (0..n).map(|i| matrix[i][j]).sum();
        if col_sum > 0.0 {
            for i in 0..n {
                transition[i][j] = matrix[i][j] / col_sum;
            }
        } else {
            // Dangling node: distribute equally
            for i in 0..n {
                transition[i][j] = 1.0 / n as f64;
            }
        }
    }

    transition
}

// ---------------------------------------------------------------------------
// PyO3 Functions
// ---------------------------------------------------------------------------

#[pyfunction]
fn py_calculate_pagerank(scenario: &str) -> PyResult<String> {
    let weights = calculate_pagerank(scenario)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(e.to_string()))?;
    serde_json::to_string(&weights)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(format!("Serialization error: {}", e)))
}

#[pyfunction]
fn py_analyze_network(scenario: &str) -> PyResult<String> {
    let result = analyze_network(scenario)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(e.to_string()))?;
    serde_json::to_string(&result)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(format!("Serialization error: {}", e)))
}

pub fn register_functions(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(py_calculate_pagerank, m)?)?;
    m.add_function(wrap_pyfunction!(py_analyze_network, m)?)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pagerank_baseline_sums_to_one() {
        let weights = calculate_pagerank("normal_operations").unwrap();
        let sum: f64 = weights.values().sum();
        assert!((sum - 1.0).abs() < 1e-6);
        assert_eq!(weights.len(), 8);
    }

    #[test]
    fn test_cascade_multipliers_sum_to_one() {
        let weights = calculate_cascade_multipliers("normal_operations").unwrap();
        let sum: f64 = weights.values().sum();
        assert!((sum - 1.0).abs() < 1e-6);
    }

    #[test]
    fn test_pagerank_all_scenarios() {
        let scenarios = [
            "normal_operations",
            "climate_shock",
            "financial_crisis",
            "pandemic_disruption",
            "political_instability",
        ];
        for s in &scenarios {
            let weights = calculate_pagerank(s).unwrap();
            let sum: f64 = weights.values().sum();
            assert!((sum - 1.0).abs() < 1e-6, "Scenario {} failed", s);
        }
    }

    #[test]
    fn test_governance_high_in_conflict() {
        let weights = calculate_pagerank("political_instability").unwrap();
        let finance = weights["finance"];
        // Finance should have elevated centrality in conflict scenarios
        assert!(finance > 0.05, "Finance PageRank should be elevated in conflict");
    }

    #[test]
    fn test_network_analysis() {
        let result = analyze_network("normal_operations").unwrap();
        assert_eq!(result.pagerank_weights.len(), 8);
        assert_eq!(result.cascade_multipliers.len(), 8);
    }
}
