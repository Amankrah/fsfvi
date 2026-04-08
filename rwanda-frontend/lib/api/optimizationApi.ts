/**
 * Rwanda FSFSI Optimization API Client
 * =====================================
 * API client for budget optimization endpoints
 *
 * Backend: Rwanda Django backend (http://localhost:8000/api/assessments/optimization/)
 * Engine: Rust fsfi_engine via PyO3
 */

import axios, { AxiosInstance } from 'axios';
import { attachAuthInterceptors } from '@/lib/api/attachAuthInterceptors';
import type {
  EfficiencyAnalysis,
  ReallocationPlan,
  RoiAnalysis,
} from '@/lib/types/optimization';
import type { IndicatorComponent } from '@/lib/types/assessment';

// ============================================================================
// Configuration
// ============================================================================

const RWANDA_API_BASE_URL =
  process.env.NEXT_PUBLIC_RWANDA_API_URL || 'http://localhost:8000';

// ============================================================================
// Axios Instance
// ============================================================================

const optimizationClient: AxiosInstance = axios.create({
  baseURL: `${RWANDA_API_BASE_URL}/api/assessments/optimization`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000,
});

attachAuthInterceptors(optimizationClient);

// ============================================================================
// Component Input for Optimization
// ============================================================================

interface ComponentInput {
  component_type: IndicatorComponent;
  observed_value: number;
  benchmark_value: number;
  financial_allocation_lcu: number;
  weight?: number;
}

// ============================================================================
// Optimization API Methods
// ============================================================================

export const optimizationAPI = {
  // ==========================================================================
  // Assessment-based methods (preferred — assessment is source of truth)
  // ==========================================================================

  /**
   * Analyze efficiency using a saved assessment.
   * The assessment's FSFSI is the authoritative current score.
   *
   * GET /api/assessments/optimization/<assessment_id>/efficiency/
   */
  efficiencyForAssessment: async (
    assessmentId: string
  ): Promise<EfficiencyAnalysis> => {
    const response = await optimizationClient.get<EfficiencyAnalysis>(
      `/${assessmentId}/efficiency/`
    );
    return response.data;
  },

  /**
   * Generate reallocation plan using a saved assessment.
   *
   * GET /api/assessments/optimization/<assessment_id>/reallocation/
   */
  reallocationForAssessment: async (
    assessmentId: string,
    targetBudget?: number
  ): Promise<ReallocationPlan> => {
    const params = targetBudget ? { target_budget: targetBudget } : {};
    const response = await optimizationClient.get<ReallocationPlan>(
      `/${assessmentId}/reallocation/`,
      { params }
    );
    return response.data;
  },

  /**
   * Calculate ROI using a saved assessment.
   *
   * GET /api/assessments/optimization/<assessment_id>/roi/
   */
  roiForAssessment: async (assessmentId: string): Promise<RoiAnalysis> => {
    const response = await optimizationClient.get<RoiAnalysis>(
      `/${assessmentId}/roi/`
    );
    return response.data;
  },

  // ==========================================================================
  // Legacy methods (raw component inputs)
  // ==========================================================================

  analyzeEfficiency: async (
    components: ComponentInput[]
  ): Promise<EfficiencyAnalysis> => {
    const response = await optimizationClient.post<EfficiencyAnalysis>('/efficiency/', {
      components,
    });
    return response.data;
  },

  generateReallocationPlan: async (
    components: ComponentInput[],
    targetBudget?: number
  ): Promise<ReallocationPlan> => {
    const response = await optimizationClient.post<ReallocationPlan>('/reallocation/', {
      components,
      target_budget: targetBudget,
    });
    return response.data;
  },

  calculateRoi: async (components: ComponentInput[]): Promise<RoiAnalysis> => {
    const response = await optimizationClient.post<RoiAnalysis>('/roi/', {
      components,
    });
    return response.data;
  },
};

export default optimizationAPI;
