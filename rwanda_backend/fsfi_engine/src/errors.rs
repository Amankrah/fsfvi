//! FSFI Custom Errors
//!
//! Centralized error handling for the FSFI system to provide consistent
//! error handling across all modules.

use pyo3::exceptions::PyValueError;
use pyo3::prelude::*;
use std::collections::HashMap;
use thiserror::Error;

/// Base error type for all FSFI-related errors
#[derive(Error, Debug)]
pub enum FsfiError {
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

impl FsfiError {
    pub fn validation(message: impl Into<String>) -> Self {
        Self::Validation {
            message: message.into(),
            details: HashMap::new(),
        }
    }

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

    pub fn weight_validation(total_weight: f64, expected: f64, tolerance: f64) -> Self {
        Self::WeightValidation {
            total_weight,
            expected,
            tolerance,
        }
    }

    pub fn ahp_validation(message: impl Into<String>, consistency_ratio: Option<f64>) -> Self {
        Self::AhpValidation {
            message: message.into(),
            consistency_ratio,
        }
    }

    pub fn calculation(message: impl Into<String>) -> Self {
        Self::Calculation {
            message: message.into(),
            details: HashMap::new(),
        }
    }

    pub fn optimization_with_details(
        message: impl Into<String>,
        details: HashMap<String, String>,
    ) -> Self {
        Self::Optimization {
            message: message.into(),
            details,
        }
    }

    pub fn budget_constraint(total_allocation: f64, budget: f64) -> Self {
        Self::BudgetConstraint {
            total_allocation,
            budget,
        }
    }

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

/// Convert FsfiError to PyErr for Python interop
impl From<FsfiError> for PyErr {
    fn from(err: FsfiError) -> PyErr {
        PyValueError::new_err(err.to_string())
    }
}

/// Result type for FSFI operations
pub type FsfiResult<T> = Result<T, FsfiError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_creation() {
        let err = FsfiError::validation("Test validation error");
        assert!(err.to_string().contains("Validation error"));

        let err = FsfiError::component("comp_1", "weight", "Invalid weight value");
        assert!(err.to_string().contains("comp_1"));
        assert!(err.to_string().contains("weight"));
    }

    #[test]
    fn test_budget_constraint_error() {
        let err = FsfiError::budget_constraint(150.0, 100.0);
        let msg = err.to_string();
        assert!(msg.contains("150.00"));
        assert!(msg.contains("100.00"));
    }

    #[test]
    fn test_calculation_error() {
        let err = FsfiError::calculation("Division by zero");
        assert!(err.to_string().contains("Division by zero"));
    }
}
