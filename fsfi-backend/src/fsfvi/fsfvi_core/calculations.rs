/// FSFVI Core Calculations
/// ========================
///
/// Core calculation functions for FSFVI analysis.
/// Handles vulnerability calculations using the mathematical framework.
///
/// Mathematical Formula: FSFVI = Σᵢ ωᵢ · υᵢ(fᵢ) = Σᵢ ωᵢ · δᵢ · [1/(1 + αᵢfᵢ)]

use crate::fsfvi::config::FSFVI_CONFIG;
use crate::fsfvi::errors::{FsfviError, FsfviResult};
use serde::{Deserialize, Serialize};

/// Calculate performance gap using FSFVI mathematical framework
///
/// Mathematical Formula:
/// δᵢ = {
///     max(0, (x̄ᵢ - xᵢ)/xᵢ)  if prefer_higher=True and xᵢ < x̄ᵢ
///     max(0, (xᵢ - x̄ᵢ)/xᵢ)  if prefer_higher=False and xᵢ > x̄ᵢ
///     0                       otherwise (meeting/exceeding benchmark)
/// }
///
/// Performance gap only exists when underperforming:
/// - For metrics where higher is better: gap only when observed < benchmark
/// - For metrics where lower is better: gap only when observed > benchmark
///
/// Mathematical Properties:
/// - δᵢ ∈ [0,1] (bounded, dimensionless)
/// - δᵢ = 0 when performance meets or exceeds benchmark
/// - δᵢ represents fractional underperformance relative to current level
pub fn calculate_performance_gap(
    observed: f64,
    benchmark: f64,
    prefer_higher: bool,
) -> FsfviResult<f64> {
    // Quick validation using config tolerances
    if observed.abs() < FSFVI_CONFIG.tolerance && benchmark.abs() < FSFVI_CONFIG.tolerance {
        return Ok(0.0);
    }

    if observed <= 0.0 {
        // Edge case: If observed is 0 or negative but benchmark is positive
        return Ok(if benchmark > 0.0 { 1.0 } else { 0.0 });
    }

    if benchmark <= 0.0 {
        // Edge case: If benchmark is 0 or negative, no meaningful gap
        return Ok(0.0);
    }

    // Core performance gap calculation
    let gap = if prefer_higher {
        // Higher values are better (e.g., income, yields, capacity)
        if observed < benchmark {
            ((benchmark - observed) / observed).max(0.0)
        } else {
            0.0
        }
    } else {
        // Lower values are better (e.g., costs, pollution, inefficiency)
        if observed > benchmark {
            ((observed - benchmark) / observed).max(0.0)
        } else {
            0.0
        }
    };

    // Apply configuration-based capping
    Ok(gap.min(1.0))
}

/// Calculate FSFVI vulnerability using exact mathematical specification
///
/// Mathematical Formula: υᵢ(fᵢ) = δᵢ · 1/(1 + αᵢfᵢ)
///
/// This is the core FSFVI vulnerability function representing how financial allocation
/// affects component vulnerability with diminishing returns.
///
/// Mathematical Properties:
/// - δᵢ = 0 → υᵢ = 0 (no gap = no vulnerability)
/// - fᵢ → ∞ → υᵢ → 0 (infinite funding eliminates vulnerability)
/// - αᵢ = 0 → υᵢ = δᵢ (no responsiveness to funding)
/// - αᵢfᵢ: dimensionless financial effectiveness factor
///
/// Unit Analysis:
/// - δᵢ: dimensionless [0,1]
/// - αᵢ: [1/financial_units]
/// - fᵢ: [financial_units]
/// - αᵢfᵢ: dimensionless (units cancel)
/// - υᵢ: dimensionless [0,1]
pub fn calculate_vulnerability(
    gap: f64,
    allocation: f64,
    sensitivity: f64,
) -> FsfviResult<f64> {
    // Streamlined input validation using config tolerances
    if allocation < 0.0 {
        return Err(FsfviError::calculation(format!(
            "Financial allocation must be non-negative: {}",
            allocation
        )));
    }

    if sensitivity < 0.0 {
        return Err(FsfviError::calculation(format!(
            "Sensitivity parameter must be non-negative: {}",
            sensitivity
        )));
    }

    // Clamp gap to valid range using config tolerance
    let clamped_gap = clamp(gap, 0.0, 1.0);

    // Core FSFVI vulnerability calculation: υᵢ(fᵢ) = δᵢ · 1/(1 + αᵢfᵢ)
    // IMPORTANT: allocation parameter is already in millions USD (converted in models.rs:84)
    // Sensitivity parameters are calibrated for allocations in millions
    let financial_effectiveness = sensitivity * allocation; // αᵢfᵢ (dimensionless)
    let mut denominator = 1.0 + financial_effectiveness;

    // Prevent division by zero and ensure denominator is reasonable
    if denominator <= FSFVI_CONFIG.tolerance {
        denominator = FSFVI_CONFIG.tolerance;
    }

    let vulnerability = clamped_gap / denominator;

    // Mathematical verification using config tolerance
    if denominator <= FSFVI_CONFIG.tolerance {
        return Err(FsfviError::calculation(format!(
            "Invalid denominator: {}",
            denominator
        )));
    }

    // Return validated result
    Ok(clamp(vulnerability, 0.0, 1.0))
}

/// Calculate weighted vulnerability: ωᵢ · υᵢ
pub fn calculate_weighted_vulnerability(vulnerability: f64, weight: f64) -> FsfviResult<f64> {
    if !(0.0..=1.0).contains(&weight) {
        return Err(FsfviError::calculation(format!(
            "Weight must be between 0 and 1, got {}",
            weight
        )));
    }

    Ok(weight * vulnerability)
}

/// Calculate resource efficiency index as percentage
///
/// Formula: Efficiency = (1 - vulnerability) / allocation × 100
///
/// This measures effectiveness per million USD invested:
/// - Higher values = better resource effectiveness
/// - Typical range: 0.1% to 50% depending on allocation size
/// - Interpretation: % effectiveness gained per $1M invested
///
/// IMPORTANT: allocation parameter must be in MILLIONS USD
/// (already converted in models.rs From<ComponentInput> trait implementation)
pub fn calculate_efficiency_index(vulnerability: f64, allocation: f64) -> FsfviResult<f64> {
    if allocation == 0.0 {
        return Ok(0.0);
    }

    // Efficiency = (1 - vulnerability) / allocation × 100 (percentage per million USD)
    // FIXED: allocation parameter is already in millions USD, no conversion needed
    let efficiency = safe_divide(clamp(1.0 - vulnerability, 0.0, 1.0) * 100.0, allocation, 0.0);
    Ok(efficiency)
}

/// Determine priority level using robust multi-factor risk assessment
///
/// Risk is primarily determined by vulnerability (which already incorporates performance gap),
/// but adjusted for financial exposure and system importance to provide more nuanced risk assessment.
///
/// Mathematical Foundation:
/// - Primary Risk = vulnerability score [0,1]
/// - Financial Risk Multiplier = allocation_share^0.5 (square root for diminishing effect)
/// - System Importance Multiplier = weight^0.3 (cube root for moderate effect)
/// - Composite Risk = Primary Risk × (1 + 0.3×Financial_Multiplier + 0.2×Importance_Multiplier)
pub fn determine_priority_level(
    vulnerability: f64,
    financial_allocation: f64,
    weight: f64,
    total_budget: f64,
) -> &'static str {
    // Primary risk is the vulnerability score
    let primary_risk = vulnerability;

    // Financial exposure adjustment
    let allocation_share = if total_budget > 0.0 {
        safe_divide(financial_allocation, total_budget, 0.0)
    } else {
        0.0
    };
    let financial_multiplier = allocation_share.sqrt(); // Square root for diminishing effect

    // System importance adjustment
    let importance_multiplier = weight.powf(0.3); // Cube root for moderate effect

    // Composite risk score with weighted adjustments
    let composite_risk = primary_risk * (1.0 + 0.3 * financial_multiplier + 0.2 * importance_multiplier);

    // Risk thresholds based on composite score
    if composite_risk >= 0.6 {
        "critical"
    } else if composite_risk >= 0.4 {
        "high"
    } else if composite_risk >= 0.25 {
        "medium"
    } else {
        "low"
    }
}

/// Determine overall risk level based on FSFVI score
pub fn determine_risk_level(fsfvi_score: f64) -> &'static str {
    FSFVI_CONFIG.determine_risk_level(fsfvi_score)
}

/// Component FSFVI calculation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentFsfviResult {
    pub performance_gap: f64,
    pub vulnerability: f64,
    pub weighted_vulnerability: f64,
    pub efficiency_index: f64,
    pub priority_level: String,
}

/// Calculate complete FSFVI metrics for a single component
pub fn calculate_component_fsfvi(
    observed_value: f64,
    benchmark_value: f64,
    financial_allocation: f64,
    sensitivity_parameter: f64,
    weight: f64,
    prefer_higher: bool,
) -> FsfviResult<ComponentFsfviResult> {
    // Calculate core metrics with correct performance direction
    let gap = calculate_performance_gap(observed_value, benchmark_value, prefer_higher)?;
    let vulnerability = calculate_vulnerability(gap, financial_allocation, sensitivity_parameter)?;
    let weighted_vulnerability = calculate_weighted_vulnerability(vulnerability, weight)?;
    let efficiency = calculate_efficiency_index(vulnerability, financial_allocation)?;
    let priority = determine_priority_level(
        vulnerability,
        financial_allocation,
        weight,
        financial_allocation,
    );

    Ok(ComponentFsfviResult {
        performance_gap: gap,
        vulnerability,
        weighted_vulnerability,
        efficiency_index: efficiency,
        priority_level: priority.to_string(),
    })
}

/// Utility function to round to configured precision
pub fn round_to_precision(value: f64, precision: Option<u32>) -> f64 {
    let prec = precision.unwrap_or(FSFVI_CONFIG.precision);
    let multiplier = 10_f64.powi(prec as i32);
    (value * multiplier).round() / multiplier
}

/// Safely divide two numbers
pub fn safe_divide(numerator: f64, denominator: f64, default: f64) -> f64 {
    if denominator.abs() < FSFVI_CONFIG.tolerance {
        default
    } else {
        numerator / denominator
    }
}

/// Clamp value between min and max bounds
pub fn clamp(value: f64, min_val: f64, max_val: f64) -> f64 {
    value.max(min_val).min(max_val)
}

/// Normalize a list of values to sum to 1.0
///
/// Note: Currently unused but reserved for future weight normalization features.
/// Similar functionality exists in the weighting modules (see `weighting::normalize_weights()`),
/// but this function provides a generic utility for normalizing any numeric values.
///
/// Potential future uses:
/// - Multi-criteria decision analysis weight normalization
/// - Alternative weighting schemes
/// - Statistical standardization of vulnerability scores
#[allow(dead_code)]
pub fn normalize_values(values: &[f64]) -> Vec<f64> {
    let total: f64 = values.iter().sum();
    if total <= 0.0 {
        let equal_weight = 1.0 / values.len() as f64;
        vec![equal_weight; values.len()]
    } else {
        values.iter().map(|v| v / total).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_performance_gap_higher_is_better() {
        // When observed < benchmark, there should be a gap
        let gap = calculate_performance_gap(80.0, 100.0, true).unwrap();
        assert!(gap > 0.0);
        assert!(gap <= 1.0);

        // When observed >= benchmark, gap should be 0
        let gap = calculate_performance_gap(100.0, 80.0, true).unwrap();
        assert_eq!(gap, 0.0);
    }

    #[test]
    fn test_performance_gap_lower_is_better() {
        // When observed > benchmark, there should be a gap
        let gap = calculate_performance_gap(100.0, 80.0, false).unwrap();
        assert!(gap > 0.0);
        assert!(gap <= 1.0);

        // When observed <= benchmark, gap should be 0
        let gap = calculate_performance_gap(80.0, 100.0, false).unwrap();
        assert_eq!(gap, 0.0);
    }

    #[test]
    fn test_vulnerability_calculation() {
        let vulnerability = calculate_vulnerability(0.5, 1000.0, 0.001).unwrap();
        assert!(vulnerability > 0.0);
        assert!(vulnerability <= 0.5); // Should be less than gap due to funding effect
    }

    #[test]
    fn test_weighted_vulnerability() {
        let weighted = calculate_weighted_vulnerability(0.3, 0.5).unwrap();
        assert_eq!(weighted, 0.15);
    }

    #[test]
    fn test_invalid_weight() {
        let result = calculate_weighted_vulnerability(0.3, 1.5);
        assert!(result.is_err());
    }

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
}
