/// FSFVI Custom Errors
/// ====================
///
/// Centralized error handling for the FSFVI system to provide consistent
/// error handling across all modules.

use std::collections::HashMap;
use thiserror::Error;

/// Base error type for all FSFVI-related errors
#[derive(Error, Debug)]
pub enum FsfviError {
    #[error("Validation error: {message}")]
    Validation {
        message: String,
        details: HashMap<String, String>,
    },

    #[error("Optimization error: {message}")]
    Optimization {
        message: String,
        details: HashMap<String, String>,
    },

    #[error("Calculation error: {message}")]
    Calculation {
        message: String,
        details: HashMap<String, String>,
    },

    #[error("Component error for {component_id}.{field}: {message}")]
    Component {
        component_id: String,
        field: String,
        message: String,
    },

    #[error("Weight validation error: sum={total_weight:.6}, expected={expected:.6}, tolerance={tolerance:.6}")]
    WeightValidation {
        total_weight: f64,
        expected: f64,
        tolerance: f64,
    },

    #[error("AHP validation error: {message}")]
    AhpValidation {
        message: String,
        consistency_ratio: Option<f64>,
    },

    #[error("Dependency matrix error: {message}")]
    DependencyMatrix {
        message: String,
        matrix_shape: Option<(usize, usize)>,
    },

    #[error("Budget constraint error: allocation={total_allocation:.2} exceeds budget={budget:.2}")]
    BudgetConstraint {
        total_allocation: f64,
        budget: f64,
    },
}

impl FsfviError {
    /// Create a validation error
    pub fn validation(message: impl Into<String>) -> Self {
        Self::Validation {
            message: message.into(),
            details: HashMap::new(),
        }
    }

    /// Create a component error
    pub fn component(
        component_id: impl Into<String>,
        field: impl Into<String>,
        message: impl Into<String>,
    ) -> Self {
        Self::Component {
            component_id: component_id.into(),
            field: field.into(),
            message: message.into(),
        }
    }

    /// Create a weight validation error
    pub fn weight_validation(total_weight: f64, expected: f64, tolerance: f64) -> Self {
        Self::WeightValidation {
            total_weight,
            expected,
            tolerance,
        }
    }

    /// Create an AHP validation error
    pub fn ahp_validation(message: impl Into<String>, consistency_ratio: Option<f64>) -> Self {
        Self::AhpValidation {
            message: message.into(),
            consistency_ratio,
        }
    }

    /// Create a calculation error
    pub fn calculation(message: impl Into<String>) -> Self {
        Self::Calculation {
            message: message.into(),
            details: HashMap::new(),
        }
    }

    /// Create an optimization error with diagnostic details
    ///
    /// For government-level systems, diagnostic details are critical for debugging
    /// failed budget optimizations that affect real-world policy decisions.
    /// The details HashMap should include context like budget amounts, component counts,
    /// allocation values, etc.
    pub fn optimization_with_details(
        message: impl Into<String>,
        details: HashMap<String, String>,
    ) -> Self {
        Self::Optimization {
            message: message.into(),
            details,
        }
    }

    /// Create a budget constraint error
    pub fn budget_constraint(total_allocation: f64, budget: f64) -> Self {
        Self::BudgetConstraint {
            total_allocation,
            budget,
        }
    }

    /// Create a dependency matrix error
    pub fn dependency_matrix(
        message: impl Into<String>,
        matrix_shape: Option<(usize, usize)>,
    ) -> Self {
        Self::DependencyMatrix {
            message: message.into(),
            matrix_shape,
        }
    }
}

/// Result type for FSFVI operations
pub type FsfviResult<T> = Result<T, FsfviError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_creation() {
        let err = FsfviError::validation("Test validation error");
        assert!(err.to_string().contains("Validation error"));

        let err = FsfviError::component("comp_1", "weight", "Invalid weight value");
        assert!(err.to_string().contains("comp_1"));
        assert!(err.to_string().contains("weight"));
    }
}
