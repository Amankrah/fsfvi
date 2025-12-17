/// FSFVI Core Module
/// ==================
///
/// Core calculation engine for the FSFVI system.
/// Provides mathematical functions for vulnerability analysis.

pub mod calculations;
pub mod metrics;
pub mod sensitivity;

// Re-export commonly used items
pub use calculations::calculate_component_fsfvi;

pub use metrics::{
    calculate_system_fsfvi, ComponentResult, SystemFsfviResult,
};

pub use sensitivity::estimate_sensitivity;
