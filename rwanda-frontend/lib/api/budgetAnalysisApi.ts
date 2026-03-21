/**
 * Budget analysis API — multi-year financial history (IndicatorData).
 * GET /api/budget-analysis/history/
 * GET /api/budget-analysis/snapshot/?fiscal_year=
 */

import axios, { AxiosInstance } from 'axios';
import type { BudgetHistoryPayload, BudgetSnapshotPayload } from '@/lib/types/budgetAnalysis';

const RWANDA_API_BASE_URL =
  process.env.NEXT_PUBLIC_RWANDA_API_URL || 'http://localhost:8000';
const TOKEN_KEY = 'rw_auth_token';

const client: AxiosInstance = axios.create({
  baseURL: `${RWANDA_API_BASE_URL}/api/budget-analysis`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 120000,
});

client.interceptors.request.use((config) => {
  const tokenData = localStorage.getItem(TOKEN_KEY);
  if (tokenData) {
    try {
      const parsed = JSON.parse(tokenData);
      config.headers['Authorization'] = `Bearer ${parsed.token}`;
    } catch {
      /* ignore */
    }
  }
  return config;
});

client.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('rw_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

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
