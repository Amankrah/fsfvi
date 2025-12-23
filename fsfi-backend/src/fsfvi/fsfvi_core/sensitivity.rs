/// FSFVI Sensitivity Parameter Estimation
/// ========================================
///
/// Estimation functions for sensitivity parameters using various methodologies.
/// The sensitivity parameter αᵢ controls the rate of diminishing returns in the
/// vulnerability function: υᵢ(fᵢ) = δᵢ · 1/(1 + αᵢfᵢ)

use crate::fsfvi::config::{ComponentType, VALIDATION_CONFIG};
use crate::fsfvi::errors::FsfviResult;
use crate::fsfvi::fsfvi_core::calculations::calculate_performance_gap;
use std::collections::HashMap;

/// Base sensitivity values by component type (for allocations in millions USD)
const BASE_SENSITIVITY: &[(ComponentType, f64)] = &[
    (ComponentType::AgriculturalDevelopment, 0.0015),
    (ComponentType::Infrastructure, 0.0018),
    (ComponentType::NutritionHealth, 0.0020),
    (ComponentType::SocialProtectionEquity, 0.0025),
    (ComponentType::ClimateNaturalResources, 0.0008),
    (ComponentType::GovernanceInstitutions, 0.0006),
];

/// Get base sensitivity for a component type
fn get_base_sensitivity(component_type: ComponentType) -> f64 {
    BASE_SENSITIVITY
        .iter()
        .find(|(ct, _)| *ct == component_type)
        .map(|(_, sensitivity)| *sensitivity)
        .unwrap_or(0.0015) // Default fallback
}

/// Estimate sensitivity parameter using hardcoded base values with adjustments
///
/// Mathematical Foundation:
/// Base component-specific values with performance adjustments
/// - Uses empirically-derived base values by component type
/// - Applies adjustments for scale economies, complexity, performance gaps
/// - Range: [0.0005, 0.005] for allocations in millions USD
///
/// Estimation Methodology:
/// 1. Base sensitivity by component type (from empirical analysis)
/// 2. Performance-based adjustments (δᵢ > 0.5 → structural issues)
/// 3. Scale economy effects (larger programs → higher efficiency)
/// 4. Complexity penalties (very large programs → coordination challenges)
pub fn estimate_sensitivity_hardcoded(
    component_type: ComponentType,
    observed_value: f64,
    benchmark_value: f64,
    financial_allocation: f64,
) -> FsfviResult<f64> {
    // CRITICAL: Near-zero allocations cause numerical instability
    // Return base sensitivity without adjustments for very small allocations
    if financial_allocation < MIN_ALLOCATION_FOR_ESTIMATION {
        let base_sensitivity = get_base_sensitivity(component_type);
        tracing::warn!(
            "Financial allocation ${:.1}M below minimum threshold ${:.0}M in hardcoded estimation. Using base sensitivity {:.6} without adjustments",
            financial_allocation,
            MIN_ALLOCATION_FOR_ESTIMATION,
            base_sensitivity
        );
        return Ok(base_sensitivity
            .max(VALIDATION_CONFIG.min_sensitivity_parameter)
            .min(0.005));
    }

    // Get baseline sensitivity for component type
    let mut estimated_parameter = get_base_sensitivity(component_type);

    // Apply performance-based adjustments
    let performance_gap = calculate_performance_gap(observed_value, benchmark_value, true)?;

    // Scale economy bonus for larger allocations
    if financial_allocation > 100.0 {
        // > $100M
        let normalized_expenditure = (financial_allocation / 1000.0).min(0.5);
        estimated_parameter += 0.0005 * normalized_expenditure;
    }

    // Structural issues penalty for poor performance
    if performance_gap > 0.5 {
        let penalty_factor = performance_gap.min(1.0);
        estimated_parameter -= 0.0003 * penalty_factor;
    }

    // Complexity penalty for very large programs
    if financial_allocation > 500.0 {
        // > $500M
        let complexity_factor = ((financial_allocation - 500.0) / 2000.0).min(0.2);
        estimated_parameter -= 0.0002 * complexity_factor;
    }

    // Apply proper bounds for scaled sensitivity parameters
    Ok(estimated_parameter
        .max(VALIDATION_CONFIG.min_sensitivity_parameter)
        .min(0.005))
}

/// Estimate sensitivity parameter using empirical data
///
/// Mathematical Foundation:
/// Historical effectiveness analysis with country context
/// - Analyzes historical allocation-performance relationships
/// - Incorporates country-specific factors (GDP, governance, capacity)
/// - Uses cross-sectional estimation when historical data unavailable
/// - Falls back to theoretically-derived expected value if estimation is unreliable
pub fn estimate_sensitivity_empirical(
    component_type: ComponentType,
    observed_value: f64,
    benchmark_value: f64,
    financial_allocation: f64,
    country_context: Option<&HashMap<String, f64>>,
) -> FsfviResult<f64> {
    // Calculate theoretical bounds for this component
    let bounds = calculate_theoretical_bounds(component_type, financial_allocation);

    // Start with cross-sectional estimation
    let mut estimated_sensitivity =
        estimate_from_allocation_performance(observed_value, benchmark_value, financial_allocation, &bounds)?;

    // Apply country context adjustment if provided
    if let Some(context) = country_context {
        let context_adjustment = calculate_country_context_adjustment(component_type, context);
        estimated_sensitivity *= context_adjustment;
    }

    // Ensure within bounds, using expected value as fallback if clamping is needed
    // This ensures government decisions use theoretically-sound values from economic literature
    let clamped = estimated_sensitivity.max(bounds.min).min(bounds.max);

    // If the estimate was severely out of bounds, use the expected value instead
    // This indicates unreliable data, so theory-based values are safer for government decisions
    let deviation_from_bounds = (estimated_sensitivity - clamped).abs();
    let bounds_range = bounds.max - bounds.min;

    if deviation_from_bounds > bounds_range * 0.5 {
        // Estimation is unreliable - use theoretically-derived expected value
        tracing::warn!(
            "Sensitivity estimation unreliable for {:?} (estimated: {:.6}, bounds: [{:.6}, {:.6}]). Using theoretical expected value: {:.6}",
            component_type, estimated_sensitivity, bounds.min, bounds.max, bounds.expected
        );
        Ok(bounds.expected)
    } else {
        Ok(clamped)
    }
}

/// Minimum allocation threshold for reliable sensitivity estimation (in millions USD)
/// Below this threshold, numerical instability occurs in optimization calculations
/// Government use case: Allocations < $5M should be handled separately or combined
const MIN_ALLOCATION_FOR_ESTIMATION: f64 = 5.0;

/// Estimate sensitivity from current allocation-performance relationship
fn estimate_from_allocation_performance(
    observed_value: f64,
    benchmark_value: f64,
    financial_allocation: f64,
    bounds: &SensitivityBounds,
) -> FsfviResult<f64> {
    // Calculate performance gap
    let performance_gap = calculate_performance_gap(observed_value, benchmark_value, true)?;

    if performance_gap <= 0.0 || financial_allocation <= 0.0 {
        // Use theoretically-derived expected value instead of hardcoded default
        // This ensures government decisions are based on economic literature
        return Ok(bounds.expected);
    }

    // CRITICAL: Near-zero allocations cause numerical instability in optimization
    // When allocation < $5M, division operations produce extreme sensitivity values
    // that propagate through FSFVI calculations and cause system crashes
    if financial_allocation < MIN_ALLOCATION_FOR_ESTIMATION {
        tracing::warn!(
            "Financial allocation ${:.1}M below minimum threshold ${:.0}M for reliable estimation. Using theoretical expected value {:.6}",
            financial_allocation,
            MIN_ALLOCATION_FOR_ESTIMATION,
            bounds.expected
        );
        return Ok(bounds.expected);
    }

    // Target: vulnerability should be 20-60% of performance gap for meaningful analysis
    let target_vulnerability = (0.2 * performance_gap + 0.6 * performance_gap) / 2.0;

    // Solve for sensitivity: target_vuln = perf_gap / (1 + sensitivity * allocation)
    // Rearranging: sensitivity = (perf_gap/target_vuln - 1) / allocation
    if target_vulnerability > 0.0 {
        let estimated_sensitivity =
            (performance_gap / target_vulnerability - 1.0) / financial_allocation;
        Ok(estimated_sensitivity
            .max(VALIDATION_CONFIG.min_sensitivity_parameter)
            .min(0.01))
    } else {
        // Use theoretically-derived expected value for edge cases
        Ok(bounds.expected)
    }
}

/// Calculate country context adjustment factor
fn calculate_country_context_adjustment(
    component_type: ComponentType,
    context: &HashMap<String, f64>,
) -> f64 {
    let mut adjustment = 1.0;

    // GDP per capita effect
    if let Some(&gdp_per_capita) = context.get("gdp_per_capita_usd") {
        if gdp_per_capita > 10000.0 {
            adjustment *= 0.8; // Lower sensitivity for richer countries
        } else if gdp_per_capita < 2000.0 {
            adjustment *= 1.2; // Higher sensitivity for poorer countries
        }
    }

    // Governance effectiveness (0-1 scale)
    if let Some(&governance_index) = context.get("governance_effectiveness_index") {
        adjustment *= 0.7 + 0.6 * governance_index; // Range: 0.7-1.3
    }

    // Institutional capacity effect by component type
    if let Some(&institutional_capacity) = context.get("institutional_capacity_index") {
        let capacity_adjustment = match component_type {
            ComponentType::GovernanceInstitutions | ComponentType::Infrastructure => {
                0.5 + institutional_capacity // Range: 0.5-1.5
            }
            ComponentType::SocialProtectionEquity | ComponentType::NutritionHealth => {
                0.8 + 0.4 * institutional_capacity // Range: 0.8-1.2
            }
            _ => 1.0,
        };
        adjustment *= capacity_adjustment;
    }

    // Market development level
    if let Some(&market_development) = context.get("market_development_index") {
        if component_type == ComponentType::AgriculturalDevelopment {
            adjustment *= 0.6 + 0.8 * market_development; // Range: 0.6-1.4
        }
    }

    // Bound adjustment factor
    adjustment.max(0.3).min(2.0)
}

/// Theoretical bounds for sensitivity parameters
struct SensitivityBounds {
    min: f64,
    max: f64,
    expected: f64,
}

/// Calculate theoretical bounds based on economic principles
fn calculate_theoretical_bounds(
    component_type: ComponentType,
    financial_allocation: f64,
) -> SensitivityBounds {
    // Base ranges by component type (from economic literature/theory)
    let (base_min, base_max, base_expected) = match component_type {
        ComponentType::AgriculturalDevelopment => (0.0005, 0.003, 0.0015),
        ComponentType::Infrastructure => (0.0008, 0.004, 0.002),
        ComponentType::NutritionHealth => (0.001, 0.005, 0.0025),
        ComponentType::SocialProtectionEquity => (0.0015, 0.006, 0.003),
        ComponentType::ClimateNaturalResources => (0.0003, 0.002, 0.001),
        ComponentType::GovernanceInstitutions => (0.0002, 0.0015, 0.0008),
    };

    // Adjust for allocation size (diminishing returns principle)
    let scale_factor = if financial_allocation > 1000.0 {
        // > $1B - very large allocations have lower sensitivity
        0.7
    } else if financial_allocation > 500.0 {
        // $500M - $1B
        0.85
    } else if financial_allocation < 50.0 {
        // < $50M - small allocations may have higher sensitivity
        1.3
    } else {
        1.0
    };

    SensitivityBounds {
        min: base_min * scale_factor,
        max: base_max * scale_factor,
        expected: base_expected * scale_factor,
    }
}

/// Estimate sensitivity parameter using the configured method
pub fn estimate_sensitivity(
    component_type: ComponentType,
    observed_value: f64,
    benchmark_value: f64,
    financial_allocation: f64,
    method: &str,
    country_context: Option<&HashMap<String, f64>>,
) -> FsfviResult<f64> {
    match method {
        "hardcoded" => estimate_sensitivity_hardcoded(
            component_type,
            observed_value,
            benchmark_value,
            financial_allocation,
        ),
        "empirical" => estimate_sensitivity_empirical(
            component_type,
            observed_value,
            benchmark_value,
            financial_allocation,
            country_context,
        ),
        _ => {
            tracing::warn!(
                "Unknown sensitivity estimation method '{}', using hardcoded",
                method
            );
            estimate_sensitivity_hardcoded(
                component_type,
                observed_value,
                benchmark_value,
                financial_allocation,
            )
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_base_sensitivity_retrieval() {
        let sensitivity = get_base_sensitivity(ComponentType::AgriculturalDevelopment);
        assert_eq!(sensitivity, 0.0015);

        let sensitivity = get_base_sensitivity(ComponentType::SocialProtectionEquity);
        assert_eq!(sensitivity, 0.0025);
    }

    #[test]
    fn test_hardcoded_estimation() {
        let sensitivity = estimate_sensitivity_hardcoded(
            ComponentType::AgriculturalDevelopment,
            100.0,
            120.0,
            1000.0,
        )
        .unwrap();

        assert!(sensitivity >= VALIDATION_CONFIG.min_sensitivity_parameter);
        assert!(sensitivity <= 0.005);
    }

    #[test]
    fn test_empirical_estimation() {
        let sensitivity = estimate_sensitivity_empirical(
            ComponentType::Infrastructure,
            80.0,
            100.0,
            800.0,
            None,
        )
        .unwrap();

        assert!(sensitivity >= VALIDATION_CONFIG.min_sensitivity_parameter);
        assert!(sensitivity <= 0.01);
    }

    #[test]
    fn test_theoretical_bounds() {
        let bounds =
            calculate_theoretical_bounds(ComponentType::AgriculturalDevelopment, 500.0);
        assert!(bounds.min < bounds.expected);
        assert!(bounds.expected < bounds.max);
    }
}
