/**
 * Rwanda FSFSI Assessment API Client
 * ====================================
 * API client for Rwanda FSFSI Assessment endpoints.
 *
 * CRITICAL: All assessment data must be fetched from the backend only.
 * Do not compute scores, stress_level, or priority_level in the frontend.
 * This module only calls backend APIs and returns their responses.
 *
 * Backend: Rwanda Django backend (http://localhost:8000/api/assessments/)
 * Engine: Rust fsfi_engine via PyO3
 */

import axios, { AxiosInstance } from 'axios';
import { attachAuthInterceptors } from '@/lib/api/attachAuthInterceptors';
import type {
  AssessmentRequest,
  AssessmentResult,
  QuickCheckResult,
  SavedAssessment,
  DashboardSummary,
  AssessmentHistory,
  FsfsiConfig,
  WeightingMethod,
  Scenario,
  IndicatorInput,
} from '@/lib/types/assessment';

// ============================================================================
// Configuration
// ============================================================================

const RWANDA_API_BASE_URL =
  process.env.NEXT_PUBLIC_RWANDA_API_URL || 'http://localhost:8000';

// ============================================================================
// Axios Instance
// ============================================================================

const assessmentClient: AxiosInstance = axios.create({
  baseURL: `${RWANDA_API_BASE_URL}/api/assessments`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000, // 2 minutes for complex calculations
});

attachAuthInterceptors(assessmentClient);

// ============================================================================
// Assessment API Methods
// ============================================================================

export const assessmentAPI = {
  /**
   * Run full FSFSI assessment
   *
   * POST /api/assessments/run/
   *
   * Runs complete indicator-based assessment with 37 indicators
   * across 8 components. All computation via Rust fsfi_engine.
   *
   * @param request - Assessment request with indicators
   * @returns Assessment result with FSFSI score and analysis
   */
  runAssessment: async (request: AssessmentRequest): Promise<AssessmentResult> => {
    console.log('[AssessmentAPI] Running assessment:', {
      fiscal_year: request.fiscal_year,
      indicators: request.indicators.length,
      weighting_method: request.weighting_method || 'hybrid',
      scenario: request.scenario || 'normal_operations',
    });

    const response = await assessmentClient.post<AssessmentResult>('/run/', request);
    return response.data;
  },

  /**
   * Run assessment for a fiscal year (indicators loaded from backend DB).
   *
   * POST /api/assessments/run-for-year/
   *
   * @param fiscalYear - Fiscal year to assess
   * @param assessmentName - Optional name
   * @returns Full assessment result (saved to DB)
   */
  runForYear: async (
    fiscalYear: number,
    assessmentName?: string,
    weightingMethod: string = 'hybrid',
    scenario: string = 'normal_operations',
  ): Promise<AssessmentResult> => {
    const response = await assessmentClient.post<AssessmentResult>(
      '/run-for-year/',
      {
        fiscal_year: fiscalYear,
        assessment_name: assessmentName ?? `FY${fiscalYear} assessment`,
        weighting_method: weightingMethod,
        scenario,
      }
    );
    return response.data;
  },

  /**
   * Run quick FSFSI check
   *
   * POST /api/assessments/quick-check/
   *
   * Lightweight assessment for dashboard displays.
   *
   * @param indicators - Indicator data for quick check
   * @returns Quick check result with FSFSI score
   */
  quickCheck: async (indicators: IndicatorInput[]): Promise<QuickCheckResult> => {
    console.log('[AssessmentAPI] Running quick check:', indicators.length, 'indicators');

    const response = await assessmentClient.post<QuickCheckResult>('/quick-check/', {
      indicators,
    });
    return response.data;
  },

  /**
   * List saved assessments
   *
   * GET /api/assessments/
   *
   * @param fiscalYear - Optional filter by fiscal year
   * @param limit - Optional limit (default 50)
   * @returns List of saved assessments
   */
  listAssessments: async (
    fiscalYear?: number,
    limit: number = 50
  ): Promise<SavedAssessment[]> => {
    const params = new URLSearchParams();
    if (fiscalYear) params.append('fiscal_year', fiscalYear.toString());
    params.append('limit', limit.toString());

    const response = await assessmentClient.get<SavedAssessment[]>(
      `/?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get assessment details
   *
   * GET /api/assessments/<id>/
   *
   * @param assessmentId - Assessment UUID
   * @returns Full assessment with component and indicator results
   */
  getAssessment: async (assessmentId: string): Promise<SavedAssessment> => {
    const response = await assessmentClient.get<SavedAssessment>(`/${assessmentId}/`);
    return response.data;
  },

  /**
   * Get dashboard summary
   *
   * GET /api/assessments/dashboard/
   *
   * @param fiscalYear - Optional fiscal year filter
   * @returns Dashboard summary for national overview
   */
  getDashboardSummary: async (fiscalYear?: number): Promise<DashboardSummary> => {
    const params = new URLSearchParams();
    if (fiscalYear) params.append('fiscal_year', fiscalYear.toString());

    const response = await assessmentClient.get<DashboardSummary>(
      `/dashboard/?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get fiscal years that have at least one saved assessment (latest first).
   *
   * GET /api/assessments/available-years/
   */
  getAvailableFiscalYears: async (): Promise<number[]> => {
    const response = await assessmentClient.get<{ fiscal_years: number[] }>(
      '/available-years/'
    );
    return response.data.fiscal_years;
  },

  /**
   * Get assessment history for trends
   *
   * GET /api/assessments/history/
   *
   * @param startYear - Optional start year
   * @param endYear - Optional end year
   * @returns Assessment history for trend analysis
   */
  getHistory: async (
    startYear?: number,
    endYear?: number
  ): Promise<AssessmentHistory[]> => {
    const params = new URLSearchParams();
    if (startYear) params.append('start_year', startYear.toString());
    if (endYear) params.append('end_year', endYear.toString());

    const response = await assessmentClient.get<AssessmentHistory[]>(
      `/history/?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get FSFSI configuration
   *
   * GET /api/assessments/config/
   *
   * @returns FSFSI configuration and indicator components
   */
  getConfig: async (): Promise<FsfsiConfig> => {
    const response = await assessmentClient.get<FsfsiConfig>('/config/');
    return response.data;
  },

  /**
   * Get stress level for a score
   *
   * GET /api/assessments/stress-level/
   *
   * @param score - FSFSI score (0-1)
   * @returns Stress level classification
   */
  getStressLevel: async (score: number): Promise<{ score: number; stress_level: string }> => {
    const params = new URLSearchParams();
    params.append('score', score.toString());

    const response = await assessmentClient.get<{ score: number; stress_level: string }>(
      `/stress-level/?${params.toString()}`
    );
    return response.data;
  },

  // Persistence config (cumulative stress parameters)
  getPersistenceConfigs: async () => {
    const response = await assessmentClient.get('/persistence-config/');
    return response.data;
  },

  updatePersistenceConfigs: async (configs: Array<{ component: string; rho_up: number; rho_down: number }>) => {
    const response = await assessmentClient.put('/persistence-config/', configs);
    return response.data;
  },
};

export default assessmentAPI;
