/**
 * Budget analysis API — multi-year financial history (IndicatorData).
 * GET /api/budget-analysis/history/
 * GET /api/budget-analysis/snapshot/?fiscal_year=
 */

import axios, { AxiosInstance } from 'axios';
import { attachAuthInterceptors } from '@/lib/api/attachAuthInterceptors';
import type { BudgetHistoryPayload, BudgetSnapshotPayload } from '@/lib/types/budgetAnalysis';

const RWANDA_API_BASE_URL =
  process.env.NEXT_PUBLIC_RWANDA_API_URL || 'http://localhost:8000';

const client: AxiosInstance = axios.create({
  baseURL: `${RWANDA_API_BASE_URL}/api/budget-analysis`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 120000,
});

attachAuthInterceptors(client);

export const budgetAnalysisAPI = {
  getHistory: async (params?: {
    startYear?: number;
    endYear?: number;
    topMovers?: number;
  }): Promise<BudgetHistoryPayload> => {
    const response = await client.get<BudgetHistoryPayload>('/history/', {
      params: {
        ...(params?.startYear != null ? { start_year: params.startYear } : {}),
        ...(params?.endYear != null ? { end_year: params.endYear } : {}),
        ...(params?.topMovers != null ? { top_movers: params.topMovers } : {}),
      },
    });
    return response.data;
  },

  getSnapshot: async (fiscalYear: number): Promise<BudgetSnapshotPayload> => {
    const response = await client.get<BudgetSnapshotPayload>('/snapshot/', {
      params: { fiscal_year: fiscalYear },
    });
    return response.data;
  },
};

export default budgetAnalysisAPI;
