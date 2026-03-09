//! FSFI Core Calculations Module
//!
//! Contains the mathematical engine for the Food System Financing Stress Index (FSFSI).

pub mod calculations;

use pyo3::prelude::*;

pub fn register_module(m: &Bound<'_, PyModule>) -> PyResult<()> {
    calculations::register_functions(m)?;
    Ok(())
}
