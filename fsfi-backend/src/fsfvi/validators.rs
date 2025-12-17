/// FSFVI Validators
/// =================
///
/// Validation functions for FSFVI calculations and data.
/// Ensures data integrity and calculation correctness.

use crate::fsfvi::config::{
    normalize_component_type, Scenario, WeightingMethod, FSFVI_CONFIG,
    VALIDATION_CONFIG,
};
use crate::fsfvi::errors::{FsfviError, FsfviResult};
use serde::{Deserialize, Serialize};

/// Component data structure for validation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Component {
    pub component_id: Option<String>,
    pub component_type: String,
    pub observed_value: f64,
    pub benchmark_value: f64,
    pub financial_allocation: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub weight: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sensitivity_parameter: Option<f64>,
}

/// Validate component data structure and values
pub fn validate_component_data(components: &mut Vec<Component>) -> FsfviResult<()> {
    if components.is_empty() {
        return Err(FsfviError::validation("No components provided"));
    }

    for (i, comp) in components.iter_mut().enumerate() {
        let comp_id = comp
            .component_id
            .clone()
            .unwrap_or_else(|| format!("component_{}", i));

        // Validate numeric fields
        validate_numeric_field(&comp_id, "observed_value", comp.observed_value)?;
        validate_numeric_field(&comp_id, "benchmark_value", comp.benchmark_value)?;
        validate_numeric_field(&comp_id, "financial_allocation", comp.financial_allocation)?;

        // Check specific constraints
        if comp.observed_value < VALIDATION_CONFIG.min_observed_value {
            return Err(FsfviError::component(
                &comp_id,
                "observed_value",
                format!(
                    "value {} below minimum {}",
                    comp.observed_value, VALIDATION_CONFIG.min_observed_value
                ),
            ));
        }

        if comp.benchmark_value < VALIDATION_CONFIG.min_benchmark_value {
            return Err(FsfviError::component(
                &comp_id,
                "benchmark_value",
                format!(
                    "value {} below minimum {}",
                    comp.benchmark_value, VALIDATION_CONFIG.min_benchmark_value
                ),
            ));
        }

        if comp.financial_allocation < VALIDATION_CONFIG.min_financial_allocation {
            return Err(FsfviError::component(
                &comp_id,
                "financial_allocation",
                format!(
                    "value {} below minimum {}",
                    comp.financial_allocation, VALIDATION_CONFIG.min_financial_allocation
                ),
            ));
        }

        if let Some(sensitivity) = comp.sensitivity_parameter {
            if sensitivity < VALIDATION_CONFIG.min_sensitivity_parameter {
                return Err(FsfviError::component(
                    &comp_id,
                    "sensitivity_parameter",
                    format!(
                        "value {} below minimum {}",
                        sensitivity, VALIDATION_CONFIG.min_sensitivity_parameter
                    ),
                ));
            }
        }

        if let Some(weight) = comp.weight {
            if !(0.0..=1.0).contains(&weight) {
                return Err(FsfviError::component(
                    &comp_id,
                    "weight",
                    format!("weight {} must be between 0 and 1", weight),
                ));
            }
        }

        // Normalize component type
        let normalized_type = normalize_component_type(&comp.component_type);
        comp.component_type = normalized_type.as_str().to_string();
    }

    Ok(())
}

/// Validate that component weights sum to approximately 1.0
pub fn validate_component_weights(components: &[Component]) -> FsfviResult<()> {
    let weights: Vec<f64> = components
        .iter()
        .map(|c| c.weight.unwrap_or(0.0))
        .collect();
    let total_weight: f64 = weights.iter().sum();

    let tolerance = FSFVI_CONFIG.weight_sum_tolerance;
    if !(1.0 - tolerance..=1.0 + tolerance).contains(&total_weight) {
        return Err(FsfviError::weight_validation(total_weight, 1.0, tolerance));
    }

    // Check for extreme concentrations
    if let Some(&max_weight) = weights.iter().max_by(|a, b| a.partial_cmp(b).unwrap()) {
        if max_weight > VALIDATION_CONFIG.max_weight_concentration {
            tracing::warn!(
                "High weight concentration: max weight = {:.3}",
                max_weight
            );
        }
    }

    Ok(())
}

/// Normalize component weights to sum to 1.0
pub fn normalize_component_weights(components: &mut Vec<Component>) {
    let weights: Vec<f64> = components
        .iter()
        .map(|c| c.weight.unwrap_or(0.0))
        .collect();
    let total_weight: f64 = weights.iter().sum();

    if total_weight <= 0.0 {
        // Assign equal weights if no weights exist
        let equal_weight = 1.0 / components.len() as f64;
        for comp in components.iter_mut() {
            comp.weight = Some(equal_weight);
        }
        tracing::info!("Assigned equal weights to all components");
    } else {
        // Normalize existing weights
        for comp in components.iter_mut() {
            if let Some(weight) = comp.weight {
                comp.weight = Some(weight / total_weight);
            }
        }
        tracing::info!(
            "Normalized weights from total {:.6} to 1.0",
            total_weight
        );
    }
}

/// Validate AHP matrix consistency and properties
pub fn validate_ahp_matrix(matrix: &[Vec<f64>]) -> FsfviResult<()> {
    let n = matrix.len();

    if n == 0 {
        return Err(FsfviError::ahp_validation(
            "Matrix is empty".to_string(),
            None,
        ));
    }

    // Check if matrix is square
    for row in matrix.iter() {
        if row.len() != n {
            return Err(FsfviError::ahp_validation(
                format!("Matrix must be square, got {}x{}", n, row.len()),
                None,
            ));
        }
    }

    // Check reciprocal property
    for i in 0..n {
        for j in 0..n {
            let product = matrix[i][j] * matrix[j][i];
            if (product - 1.0).abs() > 1e-6 {
                return Err(FsfviError::ahp_validation(
                    format!(
                        "Matrix not reciprocal at ({},{}): {} * {} = {}",
                        i, j, matrix[i][j], matrix[j][i], product
                    ),
                    None,
                ));
            }
        }
    }

    // Check diagonal elements are 1.0
    for i in 0..n {
        if (matrix[i][i] - 1.0).abs() > 1e-6 {
            return Err(FsfviError::ahp_validation(
                format!(
                    "Diagonal element [{},{}] should be 1.0, got {}",
                    i, i, matrix[i][i]
                ),
                None,
            ));
        }
    }

    tracing::info!("AHP matrix validation passed");
    Ok(())
}

/// Validate dependency matrix properties
pub fn validate_dependency_matrix(matrix: &[Vec<f64>]) -> FsfviResult<()> {
    let n = matrix.len();

    if n == 0 {
        return Err(FsfviError::dependency_matrix(
            "Matrix is empty".to_string(),
            None,
        ));
    }

    // Check if matrix is square
    for row in matrix.iter() {
        if row.len() != n {
            return Err(FsfviError::dependency_matrix(
                format!("Matrix must be square, got {}x{}", n, row.len()),
                Some((n, row.len())),
            ));
        }
    }

    // Check diagonal is 1.0 (self-dependency)
    for i in 0..n {
        if (matrix[i][i] - 1.0).abs() > 1e-6 {
            return Err(FsfviError::dependency_matrix(
                format!(
                    "Diagonal element [{},{}] should be 1.0, got {}",
                    i, i, matrix[i][i]
                ),
                Some((n, n)),
            ));
        }
    }

    // Check values are in valid range [0, 1]
    for (i, row) in matrix.iter().enumerate() {
        for (j, &value) in row.iter().enumerate() {
            if !(VALIDATION_CONFIG.dependency_min_value..=VALIDATION_CONFIG.dependency_max_value)
                .contains(&value)
            {
                return Err(FsfviError::dependency_matrix(
                    format!(
                        "Dependency values must be in range [{}, {}], got {} at [{},{}]",
                        VALIDATION_CONFIG.dependency_min_value,
                        VALIDATION_CONFIG.dependency_max_value,
                        value,
                        i,
                        j
                    ),
                    Some((n, n)),
                ));
            }
        }
    }

    // Check for extreme asymmetries (warning only)
    for i in 0..n {
        for j in 0..n {
            if i != j && matrix[i][j] > 0.0 {
                let asymmetry_ratio = matrix[i][j] / (matrix[j][i] + 1e-6);
                if asymmetry_ratio > VALIDATION_CONFIG.dependency_asymmetry_threshold
                    || asymmetry_ratio < 1.0 / VALIDATION_CONFIG.dependency_asymmetry_threshold
                {
                    tracing::warn!(
                        "High asymmetry in dependency [{},{}]: {:.3} vs [{},{}]: {:.3}",
                        i,
                        j,
                        matrix[i][j],
                        j,
                        i,
                        matrix[j][i]
                    );
                }
            }
        }
    }

    tracing::info!("Dependency matrix validation completed successfully");
    Ok(())
}

/// Validate budget constraints
pub fn validate_budget_constraint(components: &[Component], budget: f64) -> FsfviResult<()> {
    if budget <= 0.0 {
        return Err(FsfviError::validation(format!(
            "Budget must be positive, got {}",
            budget
        )));
    }

    let total_allocation: f64 = components.iter().map(|c| c.financial_allocation).sum();

    // Allow slight over-allocation due to floating point precision
    let tolerance = budget * 0.001; // 0.1% tolerance

    if total_allocation > budget + tolerance {
        return Err(FsfviError::budget_constraint(total_allocation, budget));
    }

    if total_allocation <= 0.0 {
        return Err(FsfviError::validation("Total allocation must be positive"));
    }

    Ok(())
}

/// Comprehensive validation of calculation inputs
pub fn validate_calculation_inputs(
    components: &mut Vec<Component>,
    method: Option<WeightingMethod>,
    scenario: Option<Scenario>,
    budget: Option<f64>,
) -> FsfviResult<(WeightingMethod, Scenario)> {
    tracing::info!("=== VALIDATION START ===");
    tracing::info!(
        "Components: {}, Method: {:?}, Scenario: {:?}",
        components.len(),
        method,
        scenario
    );

    // 1. Validate components structure and values
    validate_component_data(components)?;
    tracing::info!("PASS: Component data validation passed");

    // 2. Handle component weights - normalize if needed
    let has_weights = components.iter().all(|c| c.weight.is_some());
    if has_weights {
        match validate_component_weights(components) {
            Ok(_) => tracing::info!("PASS: Component weights validation passed"),
            Err(FsfviError::WeightValidation { .. }) => {
                tracing::warn!("Weight validation failed. Auto-normalizing...");
                normalize_component_weights(components);
                tracing::info!("PASS: Component weights auto-normalized");
            }
            Err(e) => return Err(e),
        }
    } else {
        tracing::info!("No weights found, assigning equal weights");
        normalize_component_weights(components);
        tracing::info!("PASS: Equal weights assigned");
    }

    // 3. Set defaults for method and scenario
    let validated_method = method.unwrap_or(FSFVI_CONFIG.default_weighting);
    let validated_scenario = scenario.unwrap_or(FSFVI_CONFIG.default_scenario);
    tracing::info!(
        "PASS: Method: {:?}, Scenario: {:?}",
        validated_method,
        validated_scenario
    );

    // 4. Validate budget constraint if provided
    if let Some(budget_val) = budget {
        validate_budget_constraint(components, budget_val)?;
        tracing::info!("PASS: Budget constraint validated: ${:.1}M", budget_val / 1e6);
    }

    tracing::info!("=== VALIDATION COMPLETE ===");
    Ok((validated_method, validated_scenario))
}

/// Helper function to validate numeric fields
fn validate_numeric_field(comp_id: &str, field: &str, value: f64) -> FsfviResult<()> {
    if !value.is_finite() {
        return Err(FsfviError::component(
            comp_id,
            field,
            format!("invalid numeric value: {}", value),
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_component_validation() {
        let mut components = vec![Component {
            component_id: Some("test_1".to_string()),
            component_type: "agricultural_development".to_string(),
            observed_value: 100.0,
            benchmark_value: 120.0,
            financial_allocation: 1000.0,
            weight: Some(0.5),
            sensitivity_parameter: Some(0.001),
        }];

        assert!(validate_component_data(&mut components).is_ok());
    }

    #[test]
    fn test_weight_normalization() {
        let mut components = vec![
            Component {
                component_id: Some("test_1".to_string()),
                component_type: "agricultural_development".to_string(),
                observed_value: 100.0,
                benchmark_value: 120.0,
                financial_allocation: 1000.0,
                weight: Some(0.3),
                sensitivity_parameter: Some(0.001),
            },
            Component {
                component_id: Some("test_2".to_string()),
                component_type: "infrastructure".to_string(),
                observed_value: 80.0,
                benchmark_value: 100.0,
                financial_allocation: 800.0,
                weight: Some(0.3),
                sensitivity_parameter: Some(0.001),
            },
        ];

        normalize_component_weights(&mut components);

        let total: f64 = components.iter().filter_map(|c| c.weight).sum();
        assert!((total - 1.0).abs() < 1e-6);
    }
}
