/**
 * Rwanda FSFSI Planning API Client
 * =================================
 * Multi-year strategic planning and MTEF endpoints.
 * Backend: POST /api/planning/multi-year/, POST /api/planning/mtef/
 */

import axios, { AxiosInstance } from 'axios';
import type {
  MultiYearPlanRequest,
  MultiYearStrategicPlan,
  MtefPlan,
  PlanningComponentInput,
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
  /**
   * Generate multi-year strategic plan to reach target FSFSI.
   * POST /api/planning/multi-year/
   */
  generateMultiYearPlan: async (
    request: MultiYearPlanRequest
  ): Promise<MultiYearStrategicPlan> => {
    const response = await planningClient.post<MultiYearStrategicPlan>(
      '/multi-year/',
      request
    );
    return response.data;
  },

  /**
   * Generate 3-year MTEF plan with target improvement % and budget growth.
   * POST /api/planning/mtef/
   */
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
