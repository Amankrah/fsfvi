/**
 * Rwanda FSFSI Planning API Client
 * =================================
 * Multi-year strategic planning and MTEF endpoints.
 * Backend: POST /api/planning/multi-year/, POST /api/planning/mtef/
 */

import axios, { AxiosInstance } from 'axios';
import type {
  AllocationSimulateRequest,
  AllocationSimulateResponse,
  MultiYearPlanRequest,
  MultiYearStrategicPlan,
  MtefPlan,
  PlanningComponentInput,
  PlanYearActual,
  PlanYearActualSummary,
  SavedStrategicPlanFull,
  SavedStrategicPlanSummary,
  SaveYearActualRequest,
} from '@/lib/types/planning';

const RWANDA_API_BASE_URL =
  process.env.NEXT_PUBLIC_RWANDA_API_URL || 'http://localhost:8000';
const TOKEN_KEY = 'rw_auth_token';

const planningClient: AxiosInstance = axios.create({
  baseURL: `${RWANDA_API_BASE_URL}/api/planning`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 120000,
});

planningClient.interceptors.request.use(
  (config) => {
    const tokenData = localStorage.getItem(TOKEN_KEY);
    if (tokenData) {
      try {
        const parsed = JSON.parse(tokenData);
        config.headers['Authorization'] = `Bearer ${parsed.token}`;
      } catch {
        console.error('[PlanningAPI] Failed to parse auth token');
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

planningClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('rw_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const planningAPI = {
  // ==========================================================================
  // Assessment-based (preferred — cumulative stress as baseline)
  // ==========================================================================

  /**
   * Generate multi-year plan using a saved assessment.
   * Uses cumulative FSFSI as baseline. All insights are data-driven.
   *
   * GET /api/planning/<assessment_id>/multi-year/
   */
  planForAssessment: async (
    assessmentId: string,
    planningYears: number = 5,
    targetFsfvi: number = 0.30,
    growthRate: number = 0.05,
    targetCurve: string = 'smoothstep',
    weightingMethod: string = 'hybrid',
    scenario: string = 'normal_operations',
    planningStartFiscalYear?: number,
  ): Promise<MultiYearStrategicPlan> => {
    const response = await planningClient.get<MultiYearStrategicPlan>(
      `/${assessmentId}/multi-year/`,
      {
        params: {
          planning_years: planningYears,
          target_fsfvi: targetFsfvi,
          growth_rate: growthRate,
          target_curve: targetCurve,
          weighting_method: weightingMethod,
          scenario,
          ...(planningStartFiscalYear != null
            ? { planning_start_fiscal_year: planningStartFiscalYear }
            : {}),
        },
      },
    );
    return response.data;
  },

  /**
   * Generate 3-year MTEF using a saved assessment.
   *
   * GET /api/planning/<assessment_id>/mtef/
   */
  /**
   * Counterfactual cumulative FSFSI for a user budget mix (same dynamics as planning).
   * POST /api/planning/<assessment_id>/simulate-allocation/
   */
  simulateAllocation: async (
    assessmentId: string,
    body: AllocationSimulateRequest,
  ): Promise<AllocationSimulateResponse> => {
    const response = await planningClient.post<AllocationSimulateResponse>(
      `/${assessmentId}/simulate-allocation/`,
      body,
    );
    return response.data;
  },

  mtefForAssessment: async (
    assessmentId: string,
    improvementPercent: number = 20,
    growthRate: number = 0.05,
    weightingMethod: string = 'hybrid',
    scenario: string = 'normal_operations',
  ): Promise<MtefPlan> => {
    const response = await planningClient.get<MtefPlan>(
      `/${assessmentId}/mtef/`,
      {
        params: {
          improvement_percent: improvementPercent,
          growth_rate: growthRate,
          weighting_method: weightingMethod,
          scenario,
        },
      }
    );
    return response.data;
  },

  // ==========================================================================
  // Legacy (raw component inputs)
  // ==========================================================================

  // ==========================================================================
  // Saved plans
  // ==========================================================================

  savePlan: async (request: {
    assessment_id: string;
    plan_name: string;
    planning_years: number;
    target_fsfvi: number;
    target_reduction_pct: number;
    yearly_budget_growth_rate: number;
    target_curve: string;
    weighting_method?: string;
    scenario?: string;
    planning_start_fiscal_year?: number;
  }): Promise<SavedStrategicPlanFull> => {
    const response = await planningClient.post<SavedStrategicPlanFull>('/saved-plans/', request);
    return response.data;
  },

  /** Update an existing saved plan (regenerates plan_json when planning parameters change). */
  updateSavedPlan: async (
    planId: string,
    request: {
      plan_name?: string;
      assessment_id?: string;
      planning_years?: number;
      target_fsfvi?: number;
      target_reduction_pct?: number;
      yearly_budget_growth_rate?: number;
      target_curve?: string;
      weighting_method?: string;
      scenario?: string;
      planning_start_fiscal_year?: number;
    },
  ): Promise<SavedStrategicPlanFull> => {
    const response = await planningClient.patch<SavedStrategicPlanFull>(
      `/saved-plans/${planId}/`,
      request,
    );
    return response.data;
  },

  /** List saved plans; optional fiscal_year filter. */
  listSavedPlans: async (fiscalYear?: number): Promise<SavedStrategicPlanSummary[]> => {
    const response = await planningClient.get<SavedStrategicPlanSummary[]>('/saved-plans/', {
      params: fiscalYear != null ? { fiscal_year: fiscalYear } : undefined,
    });
    return response.data;
  },

  /** Full saved plan including plan_json (multi-year trajectory). */
  getSavedPlan: async (planId: string): Promise<SavedStrategicPlanFull> => {
    const response = await planningClient.get<SavedStrategicPlanFull>(`/saved-plans/${planId}/`);
    return response.data;
  },

  /** Mark plan as the active one for National Overview (same fiscal year). */
  activateSavedPlan: async (planId: string): Promise<SavedStrategicPlanFull> => {
    const response = await planningClient.post<SavedStrategicPlanFull>(`/saved-plans/${planId}/activate/`);
    return response.data;
  },

  /** Permanently delete a saved plan. */
  deleteSavedPlan: async (planId: string): Promise<void> => {
    await planningClient.delete(`/saved-plans/${planId}/`);
  },

  getActivePlan: async (fiscalYear: number) => {
    const response = await planningClient.get('/active-plan/', {
      params: { fiscal_year: fiscalYear },
      validateStatus: (s: number) => s === 200 || s === 204,
    });
    if (response.status === 204) return null;
    return response.data;
  },

  // ==========================================================================
  // Plan Year Actuals — Record actual budget allocations per year
  // ==========================================================================

  /** List all actuals for a saved plan. */
  listPlanActuals: async (planId: string): Promise<PlanYearActualSummary[]> => {
    const response = await planningClient.get<PlanYearActualSummary[]>(
      `/saved-plans/${planId}/actuals/`,
    );
    return response.data;
  },

  /** Save or update actual allocation for a plan year. */
  saveYearActual: async (
    planId: string,
    request: SaveYearActualRequest,
  ): Promise<PlanYearActual> => {
    const response = await planningClient.post<PlanYearActual>(
      `/saved-plans/${planId}/actuals/`,
      request,
    );
    return response.data;
  },

  /** Get full actual record for a specific plan year. */
  getYearActual: async (planId: string, planYear: number): Promise<PlanYearActual> => {
    const response = await planningClient.get<PlanYearActual>(
      `/saved-plans/${planId}/actuals/${planYear}/`,
    );
    return response.data;
  },

  /** Delete actual for a specific plan year. */
  deleteYearActual: async (planId: string, planYear: number): Promise<void> => {
    await planningClient.delete(`/saved-plans/${planId}/actuals/${planYear}/`);
  },

  // ==========================================================================
  // Legacy (raw component inputs)
  // ==========================================================================

  generateMultiYearPlan: async (
    request: MultiYearPlanRequest
  ): Promise<MultiYearStrategicPlan> => {
    const response = await planningClient.post<MultiYearStrategicPlan>(
      '/multi-year/',
      request
    );
    return response.data;
  },

  generateMtef: async (
    components: PlanningComponentInput[],
    targetFsfviImprovementPercent: number = 20,
    yearlyBudgetGrowthRate: number = 0.05
  ): Promise<MtefPlan> => {
    const response = await planningClient.post<MtefPlan>('/mtef/', {
      components,
      target_fsfvi_improvement_percent: targetFsfviImprovementPercent,
      yearly_budget_growth_rate: yearlyBudgetGrowthRate,
    });
    return response.data;
  },
};

export default planningAPI;
