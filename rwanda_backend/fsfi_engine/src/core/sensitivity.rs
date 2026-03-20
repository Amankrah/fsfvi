//! Sensitivity Parameter (αᵢ) for FSFSI
//! ======================================
//!
//! Provides base values and optional estimation for the sensitivity parameter αᵢ
//! used in the stress model: υᵢ(fᵢ) = δᵢ · e^(-αᵢfᵢ).
//!
//! - **Base lookup**: Component-type-specific defaults (legacy 6-component and
//!   indicator 8-component names).
//! - **Estimation**: Optional adjustment by performance gap and allocation scale,
//!   clamped to config bounds. Used when no component-level α is provided.

use crate::config::get_validation_config;
use crate::core::calculations::calculate_performance_gap;
use crate::errors::FsfiResult;
use pyo3::prelude::*;

/// Maximum sensitivity for clamping (from empirical range in literature).
const MAX_SENSITIVITY: f64 = 0.005;

/// Minimum allocation (millions LCU) for applying estimation adjustments; below this use base only.
const MIN_ALLOCATION_FOR_ADJUSTMENT: f64 = 5.0;

// ---------------------------------------------------------------------------
// Base sensitivity by component type (legacy + indicator names)
// ---------------------------------------------------------------------------

/// Base sensitivity values for legacy 6-component and indicator 8-component types.
/// Used when no component-level sensitivity_parameter is provided.
/// Values chosen for allocations in millions LCU; α ∈ [0.0005, 0.005].
fn base_sensitivity_table(component_type: &str) -> f64 {
    match component_type {
        // Legacy 6-component (and aliases)
        "agricultural_development" => 0.0015,
        "infrastructure" => 0.0018,
        "nutrition_health" | "nutrition_food_safety" => 0.0020,
        "climate_natural_resources" | "climate_resilience" => 0.0008,
        "social_protection_equity" | "financial_services" => 0.0025,
        "governance_institutions" | "governance_policy" => 0.0006,
        "market_access" => 0.0012,
        "research_innovation" => 0.0010,
        // Indicator 8-component
        "markets" => 0.0012,
        "crop_production" => 0.0015,
        "nutrition" => 0.0020,
        "research" => 0.0010,
        "post_harvest" => 0.0014,
        "environment" => 0.0008,
        "animal_systems" => 0.0016,
        "finance" => 0.0018,
        _ => 0.0015,
    }
}

/// Get base sensitivity α for a component type (legacy or indicator name).
/// This is the value used in the index when no per-component α is supplied.
pub fn get_base_sensitivity(component_type: &str) -> f64 {
    base_sensitivity_table(component_type)
}

/// Estimate sensitivity parameter with optional performance/scale adjustments.
///
/// - Uses base value for the component type.
/// - If allocation is above threshold, applies small adjustments for performance
///   gap and scale, then clamps to [min_sensitivity_parameter, MAX_SENSITIVITY].
/// - Allocation should be in **millions LCU** (same as used in stress formula).
pub fn estimate_sensitivity_parameter(
    component_type: &str,
    observed_value: f64,
    benchmark_value: f64,
    allocation_millions_lcu: f64,
) -> FsfiResult<f64> {
    let val = get_validation_config();
    let mut alpha = get_base_sensitivity(component_type);

    if allocation_millions_lcu >= MIN_ALLOCATION_FOR_ADJUSTMENT
        && observed_value >= 0.0
        && benchmark_value >= 0.0
    {
        let gap = calculate_performance_gap(observed_value, benchmark_value)?;
        // Slight reduction for high gap (structural issues)
        if gap > 0.5 {
            let penalty = (gap.min(1.0) - 0.5) * 0.0003;
            alpha = alpha - penalty;
        }
        // Slight scale economy for large allocations
        if allocation_millions_lcu > 100.0 {
            let bonus = (allocation_millions_lcu / 1000.0).min(0.5) * 0.0002;
            alpha = alpha + bonus;
        }
    }

    Ok(alpha
        .max(val.min_sensitivity_parameter)
        .min(MAX_SENSITIVITY))
}

// ---------------------------------------------------------------------------
// PyO3
// ---------------------------------------------------------------------------

/// Python: estimate sensitivity parameter α for a component.
/// Allocation in millions LCU. Returns float.
#[pyfunction]
#[pyo3(signature = (component_type, observed_value, benchmark_value, allocation_millions_lcu))]
pub fn py_estimate_sensitivity(
    component_type: &str,
    observed_value: f64,
    benchmark_value: f64,
    allocation_millions_lcu: f64,
) -> PyResult<f64> {
    estimate_sensitivity_parameter(
        component_type,
        observed_value,
        benchmark_value,
        allocation_millions_lcu,
    )
    .map_err(|e| pyo3::exceptions::PyValueError::new_err(e.to_string()))
}

pub fn register_functions(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_function(pyo3::wrap_pyfunction!(py_estimate_sensitivity, m)?)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_base_sensitivity() {
        assert_eq!(get_base_sensitivity("markets"), 0.0012);
        assert_eq!(get_base_sensitivity("crop_production"), 0.0015);
        assert_eq!(get_base_sensitivity("nutrition"), 0.0020);
        assert_eq!(get_base_sensitivity("agricultural_development"), 0.0015);
        assert_eq!(get_base_sensitivity("unknown"), 0.0015);
    }

    #[test]
    fn test_estimate_clamped() {
        let a = estimate_sensitivity_parameter("markets", 80.0, 100.0, 10.0).unwrap();
        assert!(a >= 0.0005 && a <= MAX_SENSITIVITY);
    }
}
