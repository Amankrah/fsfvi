/**
 * Rwanda FSFSI Performance Gap API Client
 * ========================================
 * API client for performance gap analysis endpoints
 *
 * Backend: Rwanda Django backend (http://localhost:8000/api/assessments/gaps/)
 * Engine: Rust fsfi_engine via PyO3
 */

import axios, { AxiosInstance } from 'axios';
import { attachAuthInterceptors } from '@/lib/api/attachAuthInterceptors';
import type {
  GapAnalysisReport,
  PeerComparisonReport,
  TargetRecommendationReport,
  ComponentPerformance,
  PeerCountry,
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

const gapClient: AxiosInstance = axios.create({
  baseURL: `${RWANDA_API_BASE_URL}/api/assessments/gaps`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000,
});

attachAuthInterceptors(gapClient);

// ============================================================================
// Component Input for Gap Analysis
// ============================================================================

interface ComponentInput {
  component_type: IndicatorComponent;
  observed_value: number;
  benchmark_value: number;
  financial_allocation_lcu: number;
  weight?: number;
}

// ============================================================================
// Performance Gap API Methods
// ============================================================================

export const performanceGapAPI = {
  /**
   * Analyze performance gaps
   *
   * POST /api/assessments/gaps/analyze/
   *
   * Identifies gaps between current performance and benchmarks
   * for each component, with prioritization scores.
   *
   * @param components - Component data for analysis
   * @returns Gap analysis report with prioritized gaps
   */
  analyzeGaps: async (components: ComponentInput[]): Promise<GapAnalysisReport> => {
    console.log('[PerformanceGapAPI] Analyzing gaps:', components.length, 'components');

    const response = await gapClient.post<GapAnalysisReport>('/analyze/', {
      components,
    });
    return response.data;
  },

  /**
   * Compare with peer countries
   *
   * POST /api/assessments/gaps/peers/
   *
   * Benchmarks Rwanda against peer countries in the region.
   *
   * @param rwanda - Rwanda's component performance data
   * @param peers - Peer countries' performance data
   * @returns Peer comparison report with rankings
   */
  compareToPeers: async (
    rwanda: ComponentPerformance[],
    peers: PeerCountry[]
  ): Promise<PeerComparisonReport> => {
    console.log('[PerformanceGapAPI] Comparing to', peers.length, 'peer countries');

    const response = await gapClient.post<PeerComparisonReport>('/peers/', {
      rwanda,
      peers,
    });
    return response.data;
  },

  /**
   * Get target recommendations
   *
   * POST /api/assessments/gaps/targets/
   *
   * Generates evidence-based target recommendations for
   * gap closure over specified timeline.
   *
   * @param components - Current component performance
   * @param targetYear - Target year for gap closure
   * @param currentYear - Current year (default: current)
   * @returns Target recommendations with milestones
   */
  recommendTargets: async (
    components: ComponentInput[],
    targetYear: number = 2029,
    currentYear: number = 2025
  ): Promise<TargetRecommendationReport> => {
    console.log('[PerformanceGapAPI] Recommending targets for', targetYear);

    const response = await gapClient.post<TargetRecommendationReport>('/targets/', {
      components,
      target_year: targetYear,
      current_year: currentYear,
    });
    return response.data;
  },
};

export default performanceGapAPI;
