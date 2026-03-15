//! FSFI High-Level Services
//!
//! Service-layer functions that orchestrate core calculations, weighting systems,
//! and scenario analysis into complete analytical workflows.
//!
//! These are the main entry points called from Django views.

pub mod assessment;
pub mod optimization;
pub mod performance_gap;
pub mod planning;

use pyo3::prelude::*;

pub fn register_module(m: &Bound<'_, PyModule>) -> PyResult<()> {
    assessment::register_functions(m)?;
    optimization::register_functions(m)?;
    performance_gap::register_functions(m)?;
    planning::register_functions(m)?;
    Ok(())
}
