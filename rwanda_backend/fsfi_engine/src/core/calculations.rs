//! FSFSI Core Calculations
//! =======================
//!
//! Core calculation functions for the Food System Financing Stress Index (FSFSI).
//!
//! Based on: Ulimwengu, J.M. (2026). "Food System Financing Stress Index (FSFSI)."
//!           IFPRI Technical Note, January 2026.
//!
//! # Mathematical Foundation
//!
//! Performance Gap:     δᵢ = |xᵢ - x̄ᵢ| / max(xᵢ, x̄ᵢ),  δᵢ ∈ (0, 1)
//! Component Stress:    υᵢ(fᵢ) = δᵢ · e^(-αᵢfᵢ),          υᵢ ∈ (0, 1)
//! System Stress Index: FSFSI = Σᵢ ωᵢ · δᵢ · e^(-αᵢfᵢ)
//! Optimal Allocation:  fᵢ* = (1/αᵢ) · ln(ωᵢδᵢαᵢ/λ)
//!
//! # Key Properties
//! - Bounded: 0 < υᵢ(fᵢ) < 1 (exponential guarantees strict bounds)
//! - Monotonic: ∂υᵢ/∂fᵢ < 0 (more funding reduces stress)
//! - Diminishing returns: ∂²υᵢ/∂fᵢ² > 0 (marginal reduction declines)
//! - Convex optimization: unique global solution exists

use crate::config::get_config;
use crate::errors::{FsfiError, FsfiResult};
use pyo3::prelude::*;
use serde::{Deserialize, Serialize};

// ---------------------------------------------------------------------------
// Performance Gap
// ---------------------------------------------------------------------------

/// Calculate the normalized performance gap (FSFSI formulation)
///
/// Formula: δᵢ = |xᵢ - x̄ᵢ| / max(xᵢ, x̄ᵢ)
///
/// Key difference from FSFVI: uses absolute difference normalized by max,
/// producing a symmetric, bounded gap measure in (0, 1).
/// The gap does not directly determine stress — it influences optimal allocation.
pub fn calculate_performance_gap(observed: f64, benchmark: f64) -> FsfiResult<f64> {
    calculate_performance_gap_directional(observed, benchmark, None)
}

/// Directional performance gap (FSFSI + direction from Food System Financing Stress Index).
///
/// When `higher_is_better` is:
/// - **Some(true)** (e.g. yield): gap = 0 when observed >= benchmark; else shortfall (benchmark−observed)/benchmark.
/// - **Some(false)** (e.g. stunting rate): gap = 0 when observed <= benchmark; else excess (observed−benchmark)/observed.
/// - **None**: symmetric gap |observed−benchmark|/max(observed,benchmark).
pub fn calculate_performance_gap_directional(
    observed: f64,
    benchmark: f64,
    higher_is_better: Option<bool>,
) -> FsfiResult<f64> {
    let config = get_config();

    if observed.abs() < config.tolerance && benchmark.abs() < config.tolerance {
        return Ok(0.0);
    }
    if observed < 0.0 || benchmark < 0.0 {
        return Err(FsfiError::calculation(format!(
            "Observed ({}) and benchmark ({}) must be non-negative",
            observed, benchmark
        )));
    }

    let gap = match higher_is_better {
        Some(true) => {
            // Higher is better (e.g. crop yield): good when observed >= benchmark
            if observed >= benchmark {
                0.0
            } else {
                let shortfall = (benchmark - observed) / benchmark;
                shortfall.clamp(0.0, 1.0)
            }
        }
        Some(false) => {
            // Lower is better (e.g. stunting rate): good when observed <= benchmark
            if observed <= benchmark {
                0.0
            } else if observed < config.tolerance {
                0.0
            } else {
                let excess = (observed - benchmark) / observed;
                excess.clamp(0.0, 1.0)
            }
        }
        None => {
            let max_val = observed.max(benchmark);
            if max_val < config.tolerance {
                0.0
            } else {
                (observed - benchmark).abs() / max_val
            }
        }
    };

    Ok(gap.clamp(0.0, 1.0))
}

// ---------------------------------------------------------------------------
// Component Financing Stress
// ---------------------------------------------------------------------------

/// Calculate component financing stress using the FSFSI exponential model
///
/// Formula: υᵢ(fᵢ) = δᵢ · e^(-αᵢfᵢ)
///
/// Properties:
/// - Bounded: υᵢ ∈ (0, 1)
/// - Monotonic: more funding reduces stress (∂υᵢ/∂fᵢ < 0)
/// - Diminishing returns: ∂²υᵢ/∂fᵢ² > 0
/// - Structural scaling: higher gaps proportionally increase residual stress
///
/// Arguments:
/// - `gap`: Performance gap δᵢ ∈ [0, 1]
/// - `allocation`: Financial allocation fᵢ > 0 (in millions LCU)
/// - `sensitivity`: Sensitivity parameter αᵢ > 0
pub fn calculate_stress(gap: f64, allocation: f64, sensitivity: f64) -> FsfiResult<f64> {
    if allocation < 0.0 {
        return Err(FsfiError::calculation(format!(
            "Financial allocation must be non-negative: {}",
            allocation
        )));
    }

    if sensitivity < 0.0 {
        return Err(FsfiError::calculation(format!(
            "Sensitivity parameter must be non-negative: {}",
            sensitivity
        )));
    }

    let clamped_gap = gap.clamp(0.0, 1.0);

    // No gap means no stress regardless of allocation
    if clamped_gap == 0.0 {
        return Ok(0.0);
    }

    // υᵢ(fᵢ) = δᵢ · e^(-αᵢfᵢ)
    let exponent = -sensitivity * allocation;
    let stress = clamped_gap * exponent.exp();

    // Result is naturally bounded in (0, δᵢ] ⊂ (0, 1] but clamp for safety
    Ok(stress.clamp(0.0, 1.0))
}

/// Calculate weighted stress: ωᵢ · υᵢ
///
/// This is the contribution of component i to the system-level FSFSI.
pub fn calculate_weighted_stress(stress: f64, weight: f64) -> FsfiResult<f64> {
    if !(0.0..=1.0).contains(&weight) {
        return Err(FsfiError::calculation(format!(
            "Weight must be between 0 and 1, got {}",
            weight
        )));
    }

    Ok(weight * stress)
}

// ---------------------------------------------------------------------------
// System-Level FSFSI
// ---------------------------------------------------------------------------

/// Calculate the system-level Food System Financing Stress Index
///
/// Formula: FSFSI = Σᵢ ωᵢ · δᵢ · e^(-αᵢfᵢ)
///
/// Interpretation:
/// - Low FSFSI → well-aligned and efficient financial allocation
/// - High FSFSI → persistent structural stress due to gaps or misallocation
pub fn calculate_system_fsfsi(
    gaps: &[f64],
    allocations: &[f64],
    sensitivities: &[f64],
    weights: &[f64],
) -> FsfiResult<f64> {
    let n = gaps.len();
    if n == 0 {
        return Err(FsfiError::calculation("No components provided"));
    }
    if allocations.len() != n || sensitivities.len() != n || weights.len() != n {
        return Err(FsfiError::calculation(format!(
            "Array length mismatch: gaps={}, allocations={}, sensitivities={}, weights={}",
            n,
            allocations.len(),
            sensitivities.len(),
            weights.len()
        )));
    }

    let mut fsfsi = 0.0;
    for i in 0..n {
        let stress = calculate_stress(gaps[i], allocations[i], sensitivities[i])?;
        let weighted = calculate_weighted_stress(stress, weights[i])?;
        fsfsi += weighted;
    }

    Ok(fsfsi)
}

// ---------------------------------------------------------------------------
// Optimal Allocation (Closed-Form Solution)
// ---------------------------------------------------------------------------

/// Calculate optimal financial allocation using the FSFSI closed-form solution
///
/// From Lagrangian optimization:
///   fᵢ* = (1/αᵢ) · ln(ωᵢδᵢαᵢ/λ)
///
/// where λ is the Lagrange multiplier determined by the budget constraint Σfᵢ = F.
///
/// λ is found by substituting the optimal allocation formula into the budget constraint
/// and solving numerically (bisection method).
///
/// Arguments:
/// - `gaps`: Performance gaps δᵢ
/// - `sensitivities`: Sensitivity parameters αᵢ
/// - `weights`: Component weights ωᵢ
/// - `total_budget`: Total budget F
///
/// Returns: Vector of optimal allocations fᵢ*
pub fn calculate_optimal_allocation(
    gaps: &[f64],
    sensitivities: &[f64],
    weights: &[f64],
    total_budget: f64,
) -> FsfiResult<Vec<f64>> {
    let n = gaps.len();
    if n == 0 {
        return Err(FsfiError::calculation("No components provided"));
    }
    if sensitivities.len() != n || weights.len() != n {
        return Err(FsfiError::calculation("Array length mismatch"));
    }
    if total_budget <= 0.0 {
        return Err(FsfiError::budget_constraint(0.0, total_budget));
    }

    let config = get_config();

    // Compute ωᵢδᵢαᵢ products for each component
    let products: Vec<f64> = (0..n)
        .map(|i| weights[i] * gaps[i].clamp(0.0, 1.0) * sensitivities[i])
        .collect();

    // Filter out components with zero product (no gap or zero weight/sensitivity)
    // These get zero allocation
    let active: Vec<usize> = (0..n)
        .filter(|&i| products[i] > config.tolerance)
        .collect();

    if active.is_empty() {
        // No meaningful gaps — distribute budget equally
        return Ok(vec![total_budget / n as f64; n]);
    }

    // Find λ using bisection on the budget constraint:
    // Σᵢ (1/αᵢ) · ln(ωᵢδᵢαᵢ/λ) = F  (summed over active components)
    //
    // f(λ) = Σᵢ (1/αᵢ) · ln(ωᵢδᵢαᵢ/λ) - F = 0
    //
    // As λ → 0⁺, f(λ) → +∞
    // As λ → max(ωᵢδᵢαᵢ), f(λ) → -∞ (ln becomes negative)

    let max_product = active
        .iter()
        .map(|&i| products[i])
        .fold(f64::NEG_INFINITY, f64::max);

    let mut lambda_low = config.tolerance;
    let mut lambda_high = max_product;

    // Ensure the search bracket is valid
    let sum_at_low: f64 = active
        .iter()
        .map(|&i| (1.0 / sensitivities[i]) * (products[i] / lambda_low).ln())
        .sum();

    if sum_at_low < total_budget {
        // Budget is very large relative to gaps — allocate proportionally
        let total_product: f64 = active.iter().map(|&i| products[i]).sum();
        let mut result = vec![0.0; n];
        for &i in &active {
            result[i] = total_budget * (products[i] / total_product);
        }
        return Ok(result);
    }

    // Bisection method to find λ
    for _ in 0..config.max_iterations {
        let lambda_mid = (lambda_low + lambda_high) / 2.0;

        let total_allocation: f64 = active
            .iter()
            .map(|&i| {
                let fi = (1.0 / sensitivities[i]) * (products[i] / lambda_mid).ln();
                fi.max(0.0) // fᵢ ≥ 0
            })
            .sum();

        if (total_allocation - total_budget).abs() < config.tolerance {
            break;
        }

        if total_allocation > total_budget {
            // Need larger λ to reduce allocations
            lambda_low = lambda_mid;
        } else {
            lambda_high = lambda_mid;
        }

        if (lambda_high - lambda_low) < config.tolerance * lambda_low {
            break;
        }
    }

    let lambda_star = (lambda_low + lambda_high) / 2.0;

    // Compute optimal allocations
    let mut result = vec![0.0; n];
    let mut total_allocated = 0.0;

    for &i in &active {
        let fi = (1.0 / sensitivities[i]) * (products[i] / lambda_star).ln();
        result[i] = fi.max(0.0);
        total_allocated += result[i];
    }

    // Normalize to exactly match budget (correct any numerical drift)
    if total_allocated > config.tolerance {
        let scale = total_budget / total_allocated;
        for &i in &active {
            result[i] *= scale;
        }
    }

    Ok(result)
}

// ---------------------------------------------------------------------------
// Efficiency and Gap Metrics
// ---------------------------------------------------------------------------

/// Calculate the FSFSI efficiency index
///
/// Formula: Efficiency = FSFSI_optimal / FSFSI_actual
///
/// An efficiency value close to 1 indicates near-optimal allocation.
/// Values less than 1 indicate misallocation (actual stress exceeds optimal).
pub fn calculate_efficiency_index(fsfsi_actual: f64, fsfsi_optimal: f64) -> FsfiResult<f64> {
    if fsfsi_actual <= 0.0 {
        return Ok(1.0); // Perfect — no actual stress
    }

    if fsfsi_optimal < 0.0 {
        return Err(FsfiError::calculation(
            "Optimal FSFSI cannot be negative".to_string(),
        ));
    }

    Ok((fsfsi_optimal / fsfsi_actual).clamp(0.0, 1.0))
}

/// Calculate the absolute gap between actual and optimal FSFSI
///
/// Formula: Gap = FSFSI_actual - FSFSI_optimal
pub fn calculate_absolute_gap(fsfsi_actual: f64, fsfsi_optimal: f64) -> f64 {
    (fsfsi_actual - fsfsi_optimal).max(0.0)
}

/// Calculate the normalized gap ratio
///
/// Formula: Gap Ratio = (FSFSI_actual - FSFSI_optimal) / FSFSI_optimal
///
/// Measures the relative distance from optimal allocation.
pub fn calculate_gap_ratio(fsfsi_actual: f64, fsfsi_optimal: f64) -> FsfiResult<f64> {
    let config = get_config();

    if fsfsi_optimal.abs() < config.tolerance {
        return Ok(0.0); // Both near zero — optimal
    }

    Ok(((fsfsi_actual - fsfsi_optimal) / fsfsi_optimal).max(0.0))
}

// ---------------------------------------------------------------------------
// Priority Level Determination
// ---------------------------------------------------------------------------

/// Determine priority level using multi-factor stress assessment
///
/// Uses composite stress score considering:
/// - Primary stress from the component financing stress function
/// - Financial exposure (allocation share)
/// - System importance (component weight)
pub fn determine_priority_level(
    stress: f64,
    _financial_allocation: f64,
    _weight: f64,
    _total_budget: f64,
) -> &'static str {
    // Use the same thresholds as the overall FSFSI classification
    // so that component and system-level categories are consistent.
    determine_stress_level(stress)
}

/// Determine overall stress level based on system FSFSI score
pub fn determine_stress_level(fsfsi_score: f64) -> &'static str {
    get_config().determine_stress_level(fsfsi_score)
}

// ---------------------------------------------------------------------------
// Component-Level Complete Calculation
// ---------------------------------------------------------------------------

/// Component FSFSI calculation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentStressResult {
    pub performance_gap: f64,
    pub stress: f64,
    pub weighted_stress: f64,
    pub priority_level: String,
}

/// Calculate complete FSFSI metrics for a single component.
/// When `higher_is_better` is Some, uses directional gap (zero when on the "good" side of benchmark).
pub fn calculate_component_stress(
    observed_value: f64,
    benchmark_value: f64,
    financial_allocation: f64,
    sensitivity_parameter: f64,
    weight: f64,
    total_budget: f64,
    higher_is_better: Option<bool>,
) -> FsfiResult<ComponentStressResult> {
    let gap = calculate_performance_gap_directional(
        observed_value,
        benchmark_value,
        higher_is_better,
    )?;
    let stress = calculate_stress(gap, financial_allocation, sensitivity_parameter)?;
    let weighted_stress = calculate_weighted_stress(stress, weight)?;
    let priority = determine_priority_level(stress, financial_allocation, weight, total_budget);

    Ok(ComponentStressResult {
        performance_gap: gap,
        stress,
        weighted_stress,
        priority_level: priority.to_string(),
    })
}

// ---------------------------------------------------------------------------
// Utility Functions
// ---------------------------------------------------------------------------

pub fn round_to_precision(value: f64, precision: Option<u32>) -> f64 {
    let prec = precision.unwrap_or(get_config().precision);
    let multiplier = 10_f64.powi(prec as i32);
    (value * multiplier).round() / multiplier
}

pub fn safe_divide(numerator: f64, denominator: f64, default: f64) -> f64 {
    if denominator.abs() < get_config().tolerance {
        default
    } else {
        numerator / denominator
    }
}

pub fn normalize_values(values: &[f64]) -> Vec<f64> {
    let total: f64 = values.iter().sum();
    if total <= 0.0 {
        let equal_weight = 1.0 / values.len() as f64;
        vec![equal_weight; values.len()]
    } else {
        values.iter().map(|v| v / total).collect()
    }
}

// ---------------------------------------------------------------------------
// PyO3 Function Registration
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// PyO3 Functions
// ---------------------------------------------------------------------------

/// Calculate performance gap: δᵢ = |xᵢ - x̄ᵢ| / max(xᵢ, x̄ᵢ)
#[pyfunction]
fn py_performance_gap(observed: f64, benchmark: f64) -> PyResult<f64> {
    calculate_performance_gap(observed, benchmark).map_err(Into::into)
}

/// Calculate component financing stress: υᵢ(fᵢ) = δᵢ · e^(-αᵢfᵢ)
#[pyfunction]
fn py_component_stress(gap: f64, allocation: f64, sensitivity: f64) -> PyResult<f64> {
    calculate_stress(gap, allocation, sensitivity).map_err(Into::into)
}

/// Calculate weighted stress contribution: ωᵢ · υᵢ
#[pyfunction]
fn py_weighted_stress(stress: f64, weight: f64) -> PyResult<f64> {
    calculate_weighted_stress(stress, weight).map_err(Into::into)
}

/// Calculate system-level FSFSI: Σᵢ ωᵢ · δᵢ · e^(-αᵢfᵢ)
#[pyfunction]
fn py_system_fsfsi(
    gaps: Vec<f64>,
    allocations: Vec<f64>,
    sensitivities: Vec<f64>,
    weights: Vec<f64>,
) -> PyResult<f64> {
    calculate_system_fsfsi(&gaps, &allocations, &sensitivities, &weights).map_err(Into::into)
}

/// Calculate optimal allocation using closed-form solution
#[pyfunction]
fn py_optimal_allocation(
    gaps: Vec<f64>,
    sensitivities: Vec<f64>,
    weights: Vec<f64>,
    total_budget: f64,
) -> PyResult<Vec<f64>> {
    calculate_optimal_allocation(&gaps, &sensitivities, &weights, total_budget).map_err(Into::into)
}

/// Calculate FSFSI efficiency: FSFSI_optimal / FSFSI_actual
#[pyfunction]
fn py_efficiency_index(fsfsi_actual: f64, fsfsi_optimal: f64) -> PyResult<f64> {
    calculate_efficiency_index(fsfsi_actual, fsfsi_optimal).map_err(Into::into)
}

/// Calculate gap ratio: (FSFSI_actual - FSFSI_optimal) / FSFSI_optimal
#[pyfunction]
fn py_gap_ratio(fsfsi_actual: f64, fsfsi_optimal: f64) -> PyResult<f64> {
    calculate_gap_ratio(fsfsi_actual, fsfsi_optimal).map_err(Into::into)
}

/// Full component stress calculation returning JSON result
#[pyfunction]
fn py_full_component_stress(
    observed: f64,
    benchmark: f64,
    allocation: f64,
    sensitivity: f64,
    weight: f64,
    total_budget: f64,
) -> PyResult<String> {
    let result = calculate_component_stress(
        observed,
        benchmark,
        allocation,
        sensitivity,
        weight,
        total_budget,
        None,
    )
    .map_err(|e| pyo3::exceptions::PyValueError::new_err(e.to_string()))?;

    serde_json::to_string(&result).map_err(|e| {
        pyo3::exceptions::PyValueError::new_err(format!("Serialization error: {}", e))
    })
}

pub fn register_functions(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(py_performance_gap, m)?)?;
    m.add_function(wrap_pyfunction!(py_component_stress, m)?)?;
    m.add_function(wrap_pyfunction!(py_weighted_stress, m)?)?;
    m.add_function(wrap_pyfunction!(py_system_fsfsi, m)?)?;
    m.add_function(wrap_pyfunction!(py_optimal_allocation, m)?)?;
    m.add_function(wrap_pyfunction!(py_efficiency_index, m)?)?;
    m.add_function(wrap_pyfunction!(py_gap_ratio, m)?)?;
    m.add_function(wrap_pyfunction!(py_full_component_stress, m)?)?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    // ---- Performance Gap Tests ----

    #[test]
    fn test_performance_gap_equal_values() {
        let gap = calculate_performance_gap(100.0, 100.0).unwrap();
        assert_eq!(gap, 0.0);
    }

    #[test]
    fn test_performance_gap_observed_below_benchmark() {
        // δ = |80 - 100| / max(80, 100) = 20/100 = 0.2
        let gap = calculate_performance_gap(80.0, 100.0).unwrap();
        assert!((gap - 0.2).abs() < 1e-10);
    }

    #[test]
    fn test_performance_gap_observed_above_benchmark() {
        // δ = |120 - 100| / max(120, 100) = 20/120 = 0.1667
        let gap = calculate_performance_gap(120.0, 100.0).unwrap();
        assert!((gap - 20.0 / 120.0).abs() < 1e-10);
    }

    #[test]
    fn test_performance_gap_symmetric_property() {
        // Note: FSFSI gap is NOT symmetric because max(x, x̄) differs
        // |80-100|/max(80,100) = 0.2
        // |100-80|/max(100,80) = 0.2
        // Actually it IS symmetric: |a-b|/max(a,b) == |b-a|/max(b,a)
        let gap1 = calculate_performance_gap(80.0, 100.0).unwrap();
        let gap2 = calculate_performance_gap(100.0, 80.0).unwrap();
        assert!((gap1 - gap2).abs() < 1e-10);
    }

    #[test]
    fn test_performance_gap_bounded() {
        // Gap should always be in [0, 1]
        let gap = calculate_performance_gap(1.0, 1000.0).unwrap();
        assert!(gap >= 0.0 && gap <= 1.0);

        let gap = calculate_performance_gap(1000.0, 1.0).unwrap();
        assert!(gap >= 0.0 && gap <= 1.0);
    }

    #[test]
    fn test_performance_gap_zero_observed() {
        // |0 - 100| / max(0, 100) = 100/100 = 1.0 (maximum gap)
        let gap = calculate_performance_gap(0.0, 100.0).unwrap();
        assert!((gap - 1.0).abs() < 1e-10);
    }

    #[test]
    fn test_performance_gap_both_zero() {
        let gap = calculate_performance_gap(0.0, 0.0).unwrap();
        assert_eq!(gap, 0.0);
    }

    #[test]
    fn test_performance_gap_negative_rejected() {
        let result = calculate_performance_gap(-5.0, 100.0);
        assert!(result.is_err());
    }

    // ---- Stress Function Tests ----

    #[test]
    fn test_stress_zero_gap() {
        let stress = calculate_stress(0.0, 100.0, 0.01).unwrap();
        assert_eq!(stress, 0.0);
    }

    #[test]
    fn test_stress_zero_allocation() {
        // υᵢ(0) = δᵢ · e^0 = δᵢ
        let stress = calculate_stress(0.5, 0.0, 0.01).unwrap();
        assert!((stress - 0.5).abs() < 1e-10);
    }

    #[test]
    fn test_stress_decreases_with_allocation() {
        let stress_low = calculate_stress(0.5, 10.0, 0.1).unwrap();
        let stress_high = calculate_stress(0.5, 50.0, 0.1).unwrap();
        assert!(stress_high < stress_low);
    }

    #[test]
    fn test_stress_bounded() {
        // Should always be in [0, 1]
        let stress = calculate_stress(1.0, 0.0, 0.0).unwrap();
        assert!(stress >= 0.0 && stress <= 1.0);

        let stress = calculate_stress(0.9, 1000.0, 0.01).unwrap();
        assert!(stress >= 0.0 && stress <= 1.0);
    }

    #[test]
    fn test_stress_exponential_decay() {
        // Verify exponential decay: υ = 0.5 * e^(-0.1 * 10) = 0.5 * e^(-1)
        let stress = calculate_stress(0.5, 10.0, 0.1).unwrap();
        let expected = 0.5 * (-1.0_f64).exp();
        assert!((stress - expected).abs() < 1e-10);
    }

    #[test]
    fn test_stress_negative_allocation_rejected() {
        let result = calculate_stress(0.5, -10.0, 0.1);
        assert!(result.is_err());
    }

    // ---- Weighted Stress Tests ----

    #[test]
    fn test_weighted_stress() {
        let weighted = calculate_weighted_stress(0.3, 0.5).unwrap();
        assert!((weighted - 0.15).abs() < 1e-10);
    }

    #[test]
    fn test_weighted_stress_invalid_weight() {
        let result = calculate_weighted_stress(0.3, 1.5);
        assert!(result.is_err());
    }

    // ---- System FSFSI Tests ----

    #[test]
    fn test_system_fsfsi_basic() {
        let gaps = vec![0.3, 0.5];
        let allocations = vec![10.0, 20.0];
        let sensitivities = vec![0.1, 0.05];
        let weights = vec![0.6, 0.4];

        let fsfsi =
            calculate_system_fsfsi(&gaps, &allocations, &sensitivities, &weights).unwrap();
        assert!(fsfsi > 0.0);
        assert!(fsfsi < 1.0);

        // Manually verify: Σ ωᵢ · δᵢ · e^(-αᵢfᵢ)
        let expected = 0.6 * 0.3 * (-0.1 * 10.0_f64).exp()
            + 0.4 * 0.5 * (-0.05 * 20.0_f64).exp();
        assert!((fsfsi - expected).abs() < 1e-10);
    }

    #[test]
    fn test_system_fsfsi_length_mismatch() {
        let result = calculate_system_fsfsi(&[0.3], &[10.0, 20.0], &[0.1], &[1.0]);
        assert!(result.is_err());
    }

    // ---- Optimal Allocation Tests ----

    #[test]
    fn test_optimal_allocation_sums_to_budget() {
        let gaps = vec![0.3, 0.5, 0.2];
        let sensitivities = vec![0.1, 0.05, 0.08];
        let weights = vec![0.4, 0.35, 0.25];
        let budget = 100.0;

        let alloc =
            calculate_optimal_allocation(&gaps, &sensitivities, &weights, budget).unwrap();

        let sum: f64 = alloc.iter().sum();
        assert!((sum - budget).abs() < 0.01);
    }

    #[test]
    fn test_optimal_allocation_higher_gap_gets_more() {
        let gaps = vec![0.8, 0.1]; // Component 0 has much larger gap
        let sensitivities = vec![0.1, 0.1]; // Same sensitivity
        let weights = vec![0.5, 0.5]; // Same weight
        let budget = 100.0;

        let alloc =
            calculate_optimal_allocation(&gaps, &sensitivities, &weights, budget).unwrap();

        // Component with larger gap should get more funding
        assert!(alloc[0] > alloc[1]);
    }

    #[test]
    fn test_optimal_allocation_non_negative() {
        let gaps = vec![0.3, 0.5, 0.1];
        let sensitivities = vec![0.1, 0.05, 0.2];
        let weights = vec![0.4, 0.35, 0.25];
        let budget = 50.0;

        let alloc =
            calculate_optimal_allocation(&gaps, &sensitivities, &weights, budget).unwrap();

        for &a in &alloc {
            assert!(a >= 0.0);
        }
    }

    // ---- Efficiency & Gap Tests ----

    #[test]
    fn test_efficiency_index_perfect() {
        let eff = calculate_efficiency_index(0.1, 0.1).unwrap();
        assert!((eff - 1.0).abs() < 1e-10);
    }

    #[test]
    fn test_efficiency_index_suboptimal() {
        // Actual is worse than optimal
        let eff = calculate_efficiency_index(0.4, 0.2).unwrap();
        assert!((eff - 0.5).abs() < 1e-10);
    }

    #[test]
    fn test_gap_ratio_zero_when_optimal() {
        let ratio = calculate_gap_ratio(0.1, 0.1).unwrap();
        assert!((ratio - 0.0).abs() < 1e-10);
    }

    #[test]
    fn test_gap_ratio_positive_when_suboptimal() {
        let ratio = calculate_gap_ratio(0.3, 0.1).unwrap();
        assert!((ratio - 2.0).abs() < 1e-10); // (0.3 - 0.1) / 0.1 = 2.0
    }

    // ---- Component Stress Tests ----

    #[test]
    fn test_component_stress_full_calculation() {
        let result = calculate_component_stress(
            80.0, 100.0, 10.0, 0.1, 0.5, 100.0, None,
        )
        .unwrap();

        assert!(result.performance_gap > 0.0);
        assert!(result.stress > 0.0);
        assert!(result.weighted_stress > 0.0);
        assert!(!result.priority_level.is_empty());
    }

    // ---- Utility Tests ----

    #[test]
    fn test_round_to_precision() {
        let rounded = round_to_precision(3.14159265, Some(2));
        assert_eq!(rounded, 3.14);

        let rounded = round_to_precision(3.14159265, Some(4));
        assert_eq!(rounded, 3.1416);
    }

    #[test]
    fn test_normalize_values() {
        let values = vec![0.2, 0.3, 0.5];
        let normalized = normalize_values(&values);
        let sum: f64 = normalized.iter().sum();
        assert!((sum - 1.0).abs() < 1e-10);
    }

    #[test]
    fn test_safe_divide() {
        assert_eq!(safe_divide(10.0, 2.0, 0.0), 5.0);
        assert_eq!(safe_divide(10.0, 0.0, -1.0), -1.0);
    }
}
