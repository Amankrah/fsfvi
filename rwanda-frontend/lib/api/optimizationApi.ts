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
  financial_allocation_usd: number;
  weight?: number;
}

// ============================================================================
// Optimization API Methods
// ============================================================================

export const optimizationAPI = {
  /**
   * Analyze allocation efficiency
   *
   * POST /api/assessments/optimization/efficiency/
   *
   * Identifies over/under-allocated components relative to
   * their vulnerability and impact on food system resilience.
   *
   * @param components - Component data for analysis
   * @returns Efficiency analysis with reallocation recommendations
   */
  analyzeEfficiency: async (
    components: ComponentInput[]
  ): Promise<EfficiencyAnalysis> => {
    console.log('[OptimizationAPI] Analyzing efficiency:', components.length, 'components');

    const response = await optimizationClient.post<EfficiencyAnalysis>('/efficiency/', {
      components,
    });
    return response.data;
  },

  /**
   * Generate reallocation plan
   *
   * POST /api/assessments/optimization/reallocation/
   *
   * Creates step-by-step implementation plan to transition
   * from current allocations to optimized allocations.
   *
   * @param components - Component data
   * @param targetBudget - Optional target total budget
   * @returns Reallocation plan with implementation phases
   */
  generateReallocationPlan: async (
    components: ComponentInput[],
    targetBudget?: number
  ): Promise<ReallocationPlan> => {
    console.log('[OptimizationAPI] Generating reallocation plan');

    const response = await optimizationClient.post<ReallocationPlan>('/reallocation/', {
      components,
      target_budget: targetBudget,
    });
    return response.data;
  },

  /**
   * Calculate ROI per component
   *
   * POST /api/assessments/optimization/roi/
   *
   * Analyzes return on investment for budget allocations
   * to identify highest-impact investment opportunities.
   *
   * @param components - Component data
   * @returns ROI analysis for each component
   */
  calculateRoi: async (components: ComponentInput[]): Promise<RoiAnalysis> => {
    console.log('[OptimizationAPI] Calculating ROI:', components.length, 'components');

    const response = await optimizationClient.post<RoiAnalysis>('/roi/', {
      components,
    });
    return response.data;
  },
};

export default optimizationAPI;
