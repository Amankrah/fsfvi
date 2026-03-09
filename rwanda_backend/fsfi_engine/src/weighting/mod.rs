//! FSFI Weighting System
//!
//! Four complementary weighting methods for component importance:
//! - Expert (AHP eigenvector from pairwise comparisons)
//! - Financial (budget-based proportional weights)
//! - Network (PageRank centrality from dependency matrix)
//! - Hybrid (weighted combination: 0.35/0.30/0.25/0.10)
//!
//! Unchanged from the proven FSFVI weighting system.

pub mod expert;
pub mod financial;
pub mod hybrid;
pub mod models;
pub mod network;

use pyo3::prelude::*;

pub fn register_module(m: &Bound<'_, PyModule>) -> PyResult<()> {
    expert::register_functions(m)?;
    financial::register_functions(m)?;
    network::register_functions(m)?;
    hybrid::register_functions(m)?;
    Ok(())
}
