/// FSFVI Permission System
/// =======================
///
/// Defines granular permissions for FSFVI operations.
/// Integrates with existing role-based access control.

use serde::{Deserialize, Serialize};
use crate::models::user::UserRole;

/// FSFVI-specific permissions
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum FsfviPermission {
    // Read Operations
    ViewAssessments,
    ViewMatrices,
    ViewReports,

    // Analysis Operations
    RunAssessment,
    RunScenarioSimulation,
    RunSensitivityAnalysis,
    RunPerformanceGapAnalysis,

    // Planning Operations (Restricted)
    GenerateStrategicPlan,      // Multi-year planning
    OptimizeBudget,              // Budget optimization
    GenerateMTEF,                // Medium-term expenditure framework

    // Decision Support Operations
    GeneratePolicyRecommendations,  // Generate policy recommendations
    GenerateCrisisResponse,          // Emergency crisis response
    ViewProgressTracking,            // Track progress over time
    GenerateStakeholderBrief,        // Stakeholder communication briefs

    // Administrative Operations (Highly Restricted)
    CustomizeMatrices,           // Modify AHP/network matrices
    ManageBenchmarks,            // Update benchmark values
    ExportData,                  // Export sensitive data

    // System Operations (Admin only)
    ViewAuditLogs,
    ManageApiKeys,
}

impl FsfviPermission {
    /// Check if permission is allowed for a given user role
    pub fn is_allowed_for_role(&self, role: &UserRole) -> bool {
        match role {
            UserRole::Admin => true, // FSFI Admin has all permissions
            UserRole::Developer => self.government_permissions(), // Government users have full FSFVI API access
        }
    }

    fn government_permissions(&self) -> bool {
        // Government Developer role has full access to all FSFVI features
        matches!(
            self,
            FsfviPermission::ViewAssessments
                | FsfviPermission::ViewMatrices
                | FsfviPermission::ViewReports
                | FsfviPermission::RunAssessment
                | FsfviPermission::RunScenarioSimulation
                | FsfviPermission::RunSensitivityAnalysis
                | FsfviPermission::RunPerformanceGapAnalysis
                | FsfviPermission::GenerateStrategicPlan
                | FsfviPermission::OptimizeBudget
                | FsfviPermission::GenerateMTEF
                | FsfviPermission::GeneratePolicyRecommendations
                | FsfviPermission::GenerateCrisisResponse
                | FsfviPermission::ViewProgressTracking
                | FsfviPermission::GenerateStakeholderBrief
                | FsfviPermission::CustomizeMatrices
                | FsfviPermission::ExportData
        )
    }
}

/// Permission check helper macro
#[macro_export]
macro_rules! require_permission {
    ($claims:expr, $permission:expr) => {
        if !$permission.is_allowed_for_role(&$claims.role) {
            return Err(crate::utils::error::AppError::AuthorizationError(
                format!("Insufficient permissions for {:?}", $permission)
            ));
        }
    };
}
