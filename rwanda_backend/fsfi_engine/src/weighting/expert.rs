//! AHP Expert Weighting System
//!
//! Analytic Hierarchy Process (AHP) using power method eigenvector calculation.
//! Pairwise comparison matrices from IPC/FEWS NET frameworks.

use crate::config::get_weighting_config;
use crate::errors::{FsfiError, FsfiResult};
use crate::weighting::models::{get_expert_matrix, normalize_weights, COMPONENT_ORDER};
use pyo3::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Random Index values for consistency ratio calculation (Saaty, 1980)
const RANDOM_INDEX: [f64; 16] = [
    0.0, 0.0, 0.0, 0.58, 0.90, 1.12, 1.24, 1.32, 1.41, 1.45, 1.49, 1.51, 1.48, 1.56, 1.57, 1.59,
];

/// AHP calculation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AhpResult {
    pub weights: HashMap<String, f64>,
    pub lambda_max: f64,
    pub consistency_index: f64,
    pub consistency_ratio: f64,
    pub is_consistent: bool,
    pub scenario: String,
}

/// Calculate AHP weights from a pairwise comparison matrix using the power method
pub fn calculate_ahp_weights(scenario: &str) -> FsfiResult<AhpResult> {
    let matrix = get_expert_matrix(scenario);
    let n = matrix.len();

    // Validate matrix
    validate_ahp_matrix(&matrix)?;

    // Power method for principal eigenvector
    let (eigenvector, lambda_max) = power_method_eigenvector(&matrix)?;

    // Calculate consistency
    let ci = if n > 1 {
        (lambda_max - n as f64) / (n as f64 - 1.0)
    } else {
        0.0
    };

    let ri = if n < RANDOM_INDEX.len() {
        RANDOM_INDEX[n]
    } else {
        1.59
    };

    let cr = if ri > 0.0 { ci / ri } else { 0.0 };
    let config = get_weighting_config();
    let is_consistent = cr < config.ahp_consistency_threshold;

    // Map eigenvector to component names
    let mut weights = HashMap::new();
    for (i, &component) in COMPONENT_ORDER.iter().enumerate() {
        if i < eigenvector.len() {
            weights.insert(component.to_string(), eigenvector[i]);
        }
    }

    let weights = normalize_weights(&weights);

    Ok(AhpResult {
        weights,
        lambda_max,
        consistency_index: ci,
        consistency_ratio: cr,
        is_consistent,
        scenario: scenario.to_string(),
    })
}

/// Power method for computing principal eigenvector and eigenvalue
fn power_method_eigenvector(matrix: &[Vec<f64>]) -> FsfiResult<(Vec<f64>, f64)> {
    let n = matrix.len();
    let max_iter = 1000;
    let tolerance = 1e-10;

    // Initialize uniform eigenvector
    let mut vector: Vec<f64> = vec![1.0 / n as f64; n];

    let mut lambda_max = 0.0;

    for _ in 0..max_iter {
        // Matrix-vector multiplication
        let mut new_vector = vec![0.0; n];
        for i in 0..n {
            for j in 0..n {
                new_vector[i] += matrix[i][j] * vector[j];
            }
        }

        // Estimate eigenvalue: average of (new[i] / old[i])
        let mut lambda_sum = 0.0;
        let mut count = 0;
        for i in 0..n {
            if vector[i].abs() > 1e-15 {
                lambda_sum += new_vector[i] / vector[i];
                count += 1;
            }
        }
        lambda_max = if count > 0 {
            lambda_sum / count as f64
        } else {
            0.0
        };

        // Normalize (L1 norm)
        let norm: f64 = new_vector.iter().map(|x| x.abs()).sum();
        if norm > 0.0 {
            for x in &mut new_vector {
                *x /= norm;
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
            break;
        }
    }

    Ok((vector, lambda_max))
}

/// Validate AHP pairwise comparison matrix
fn validate_ahp_matrix(matrix: &[Vec<f64>]) -> FsfiResult<()> {
    let n = matrix.len();

    // Must be square
    for (i, row) in matrix.iter().enumerate() {
        if row.len() != n {
            return Err(FsfiError::ahp_validation(
                format!("Matrix not square: row {} has {} elements, expected {}", i, row.len(), n),
                None,
            ));
        }
    }

    // Diagonal must be 1.0
    for i in 0..n {
        if (matrix[i][i] - 1.0).abs() > 1e-6 {
            return Err(FsfiError::ahp_validation(
                format!("Diagonal element [{},{}] = {}, expected 1.0", i, i, matrix[i][i]),
                None,
            ));
        }
    }

    // Must be reciprocal: a[i][j] * a[j][i] ≈ 1.0
    for i in 0..n {
        for j in (i + 1)..n {
            let product = matrix[i][j] * matrix[j][i];
            if (product - 1.0).abs() > 0.01 {
                return Err(FsfiError::ahp_validation(
                    format!(
                        "Reciprocal property violated at [{},{}]: {} * {} = {}",
                        i, j, matrix[i][j], matrix[j][i], product
                    ),
                    None,
                ));
            }
        }
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// PyO3 Functions
// ---------------------------------------------------------------------------

#[pyfunction]
fn py_calculate_ahp_weights(scenario: &str) -> PyResult<String> {
    let result = calculate_ahp_weights(scenario).map_err(|e| {
        pyo3::exceptions::PyValueError::new_err(e.to_string())
    })?;
    serde_json::to_string(&result)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(format!("Serialization error: {}", e)))
}

pub fn register_functions(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(py_calculate_ahp_weights, m)?)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ahp_baseline_weights() {
        let result = calculate_ahp_weights("normal_operations").unwrap();
        assert!(result.is_consistent, "AHP baseline should be consistent");
        assert_eq!(result.weights.len(), 6);

        let sum: f64 = result.weights.values().sum();
        assert!((sum - 1.0).abs() < 1e-6);
    }

    #[test]
    fn test_ahp_climate_shock() {
        let result = calculate_ahp_weights("climate_shock").unwrap();
        assert_eq!(result.weights.len(), 6);

        // Climate component should be high in climate shock
        let climate_w = result.weights["climate_natural_resources"];
        assert!(climate_w > 0.1, "Climate weight should be elevated in climate shock");
    }

    #[test]
    fn test_ahp_consistency_ratio() {
        let result = calculate_ahp_weights("normal_operations").unwrap();
        assert!(result.consistency_ratio < 0.1, "CR should be < 0.1");
        assert!(result.consistency_ratio >= 0.0);
    }

    #[test]
    fn test_ahp_all_scenarios() {
        let scenarios = [
            "normal_operations",
            "climate_shock",
            "financial_crisis",
            "pandemic_disruption",
            "political_instability",
        ];
        for s in &scenarios {
            let result = calculate_ahp_weights(s).unwrap();
            assert_eq!(result.weights.len(), 6, "Scenario {} failed", s);
            let sum: f64 = result.weights.values().sum();
            assert!((sum - 1.0).abs() < 1e-6, "Scenario {} weights don't sum to 1", s);
        }
    }
}
