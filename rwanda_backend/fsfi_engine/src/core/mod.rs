//! FSFI Core Module
//!
//! Contains the mathematical engine for the Food System Financing Stress Index (FSFSI):
//! calculations (gap, stress, FSFSI, optimal allocation) and sensitivity (αᵢ lookup and estimation).

pub mod calculations;
pub mod sensitivity;

use pyo3::prelude::*;

pub fn register_module(m: &Bound<'_, PyModule>) -> PyResult<()> {
    calculations::register_functions(m)?;
    sensitivity::register_functions(m)?;
    Ok(())
}
