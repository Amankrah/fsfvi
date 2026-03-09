//! FSFI Engine - Food Systems Financial Intelligence
//!
//! Core computation library for the Food System Financing Stress Index (FSFSI).
//! Compiled as a Python extension module via PyO3/Maturin for Django integration.
//!
//! # Architecture
//! - Pure Rust computation core (no Python dependencies in math)
//! - PyO3 boundary layer for Python interop
//! - Django handles data management, this handles computation
//!
//! # Mathematical Foundation (FSFSI - Ulimwengu, IFPRI 2026)
//!
//! Performance Gap:     δᵢ = |xᵢ - x̄ᵢ| / max(xᵢ, x̄ᵢ)
//! Component Stress:    υᵢ(fᵢ) = δᵢ · e^(-αᵢfᵢ)
//! System Stress Index: FSFSI = Σᵢ ωᵢ · δᵢ · e^(-αᵢfᵢ)
//! Optimal Allocation:  fᵢ* = (1/αᵢ) · ln(ωᵢδᵢαᵢ/λ)
//!
//! # Weighting System (unchanged from FSFVI)
//! - Expert (AHP eigenvector)
//! - Financial (budget-based)
//! - Network (PageRank)
//! - Hybrid (0.35/0.30/0.25/0.10 blend)

pub mod auth;
pub mod config;
pub mod core;
pub mod errors;
pub mod services;
pub mod weighting;

use pyo3::prelude::*;

/// Python module initialization
#[pymodule]
fn fsfi_engine(m: &Bound<'_, PyModule>) -> PyResult<()> {
    // Register config functions
    config::register_module(m)?;

    // Register core FSFSI calculations
    core::register_module(m)?;

    // Register auth functions (password, JWT, encryption, MFA)
    auth::register_module(m)?;

    // Register weighting system functions
    weighting::register_module(m)?;

    // Register high-level services (assessment, optimization, gap analysis)
    services::register_module(m)?;

    Ok(())
}
