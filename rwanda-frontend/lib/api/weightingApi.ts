/**
 * Rwanda FSFSI Weighting API Client
 * ==================================
 * API client for weighting methodology endpoints
 *
 * Backend: Rwanda Django backend (http://localhost:8000/api/assessments/weighting/)
 * Engine: Rust fsfi_engine via PyO3
 */

import axios, { AxiosInstance } from 'axios';
import type {
  AhpWeights,
  HybridWeights,
  NetworkAnalysis,
} from '@/lib/types/optimization';
import type { IndicatorComponent, Scenario } from '@/lib/types/assessment';

// ============================================================================
// Configuration
// ============================================================================

const RWANDA_API_BASE_URL =
  process.env.NEXT_PUBLIC_RWANDA_API_URL || 'http://localhost:8000';

const TOKEN_KEY = 'rw_auth_token';

// ============================================================================
// Axios Instance
// ============================================================================

const weightingClient: AxiosInstance = axios.create({
  baseURL: `${RWANDA_API_BASE_URL}/api/assessments/weighting`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

// Request interceptor
weightingClient.interceptors.request.use(
  (config) => {
    const tokenData = localStorage.getItem(TOKEN_KEY);
    if (tokenData) {
      try {
        const parsed = JSON.parse(tokenData);
        config.headers['Authorization'] = `Bearer ${parsed.token}`;
      } catch {
        console.error('[WeightingAPI] Failed to parse auth token');
      }
    }
    console.log(`[WeightingAPI] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
weightingClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('rw_user');
      window.location.href = '/login';
    }
    console.error('[WeightingAPI] Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// ============================================================================
// Component Input for Weighting
// ============================================================================

interface ComponentInput {
  component_type: IndicatorComponent;
  observed_value: number;
  benchmark_value: number;
  financial_allocation_lcu: number;
  weight?: number;
}

// ============================================================================
// Weighting API Methods
// ============================================================================

export const weightingAPI = {
  /**
   * Get AHP expert weights
   *
   * GET /api/assessments/weighting/ahp/
   *
   * Returns Analytic Hierarchy Process weights calculated
   * from expert pairwise comparisons.
   *
   * @param scenario - Scenario for weight calculation
   * @returns AHP weights with consistency ratio
   */
  getAhpWeights: async (scenario: Scenario = 'normal_operations'): Promise<AhpWeights> => {
    console.log('[WeightingAPI] Getting AHP weights for scenario:', scenario);

    const params = new URLSearchParams();
    params.append('scenario', scenario);

    const response = await weightingClient.get<AhpWeights>(`/ahp/?${params.toString()}`);
    return response.data;
  },

  /**
   * Calculate hybrid weights
   *
   * POST /api/assessments/weighting/hybrid/
   *
   * Calculates hybrid weights combining:
   * - 35% Expert (AHP)
   * - 30% PageRank (network centrality)
   * - 25% Cascade (systemic impact)
   * - 10% Financial (budget allocation)
   *
   * @param components - Component data
   * @param scenario - Optional scenario
   * @returns Hybrid weights with all components
   */
  calculateHybridWeights: async (
    components: ComponentInput[],
    scenario?: Scenario
  ): Promise<HybridWeights> => {
    console.log('[WeightingAPI] Calculating hybrid weights');

    const response = await weightingClient.post<HybridWeights>('/hybrid/', {
      components,
      scenario,
    });
    return response.data;
  },

  /**
   * Get network analysis (PageRank)
   *
   * GET /api/assessments/weighting/network/
   *
   * Analyzes component dependencies using network
   * centrality measures (PageRank algorithm).
   *
   * @param scenario - Scenario for analysis
   * @returns Network analysis with centrality scores
   */
  getNetworkAnalysis: async (
    scenario: Scenario = 'normal_operations'
  ): Promise<NetworkAnalysis> => {
    console.log('[WeightingAPI] Getting network analysis for scenario:', scenario);

    const params = new URLSearchParams();
    params.append('scenario', scenario);

    const response = await weightingClient.get<NetworkAnalysis>(
      `/network/?${params.toString()}`
    );
    return response.data;
  },
};

export default weightingAPI;
