/**
 * Rwanda FSFSI Optimization API Client
 * =====================================
 * API client for budget optimization endpoints
 *
 * Backend: Rwanda Django backend (http://localhost:8000/api/assessments/optimization/)
 * Engine: Rust fsfi_engine via PyO3
 */

import axios, { AxiosInstance } from 'axios';
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

const TOKEN_KEY = 'rw_auth_token';

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

// Request interceptor
optimizationClient.interceptors.request.use(
  (config) => {
    const tokenData = localStorage.getItem(TOKEN_KEY);
    if (tokenData) {
      try {
        const parsed = JSON.parse(tokenData);
        config.headers['Authorization'] = `Bearer ${parsed.token}`;
      } catch {
        console.error('[OptimizationAPI] Failed to parse auth token');
      }
    }
    console.log(`[OptimizationAPI] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
optimizationClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('rw_user');
      window.location.href = '/login';
    }
    const msg =
      (error.response?.data as { error?: string })?.error ||
      error.message ||
      (error.response?.status ? `Request failed (${error.response.status})` : 'Request failed');
    console.error('[OptimizationAPI] Error:', msg, error.response?.data);
    return Promise.reject(error);
  }
);

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
