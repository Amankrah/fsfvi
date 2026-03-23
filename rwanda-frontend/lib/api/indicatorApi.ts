/**
 * Rwanda FSFSI Indicator Data API Client
 * =======================================
 * API client for indicator data entry and management.
 * Backend: GET/POST /api/indicators/
 */

import axios, { AxiosInstance } from 'axios';

const RWANDA_API_BASE_URL =
  process.env.NEXT_PUBLIC_RWANDA_API_URL || 'http://localhost:8000';
const TOKEN_KEY = 'rw_auth_token';

const indicatorClient: AxiosInstance = axios.create({
  baseURL: `${RWANDA_API_BASE_URL}/api/indicators`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
});

indicatorClient.interceptors.request.use(
  (config) => {
    const tokenData = localStorage.getItem(TOKEN_KEY);
    if (tokenData) {
      try {
        const parsed = JSON.parse(tokenData);
        config.headers['Authorization'] = `Bearer ${parsed.token}`;
      } catch {
        console.error('[IndicatorAPI] Failed to parse auth token');
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

indicatorClient.interceptors.response.use(
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

// =============================================================================
// Types
// =============================================================================

export interface Indicator {
  id: string;
  code: string;
  name: string;
  component: string;
  component_display: string;
  description: string;
  unit: string;
  higher_is_better: boolean;
  default_sensitivity: number;
  display_order: number;
  is_active: boolean;
}

export interface IndicatorData {
  id: string;
  indicator_id: string;
  indicator_code: string;
  indicator_name: string;
  component: string;
  component_display: string;
  higher_is_better: boolean;
  unit: string;
  fiscal_year: number;
  records_count: number;
  gross_lcu_bn: number;
  weighted_lcu_bn: number;
  share_weighted_percent: number;
  observed_value: number | null;
  benchmark_value: number | null;
  benchmark_used_type: string;
  financial_allocation_usd: number | null;
  sensitivity_parameter: number | null;
  performance_gap: number | null;
  stress_value: number | null;
  status: 'draft' | 'submitted' | 'under_review' | 'validated' | 'rejected';
  created_by_username: string | null;
  created_at: string;
  updated_at: string;
}

export interface IndicatorDataInput {
  indicator_id: string;
  gross_lcu_bn: number;
  weighted_lcu_bn: number;
  observed_value?: number | null;
  benchmark_value?: number | null;
  records_count?: number;
  share_weighted_percent?: number;
  benchmark_used_type?: string;
  financial_allocation_usd?: number | null;
  sensitivity_parameter?: number | null;
}

export interface BulkSaveResult {
  fiscal_year: number;
  created: number;
  updated: number;
  errors: Array<{ index: number; error: string; indicator_id?: string }>;
  total_processed: number;
}

export interface ComponentSummary {
  component: string;
  component_display: string;
  total_indicators: number;
  indicators_with_data: number;
  gross_lcu_bn: number;
  weighted_lcu_bn: number;
}

export interface FiscalYearSummary {
  fiscal_year: number;
  total_indicators: number;
  indicators_with_data: number;
  total_gross_lcu_bn: number;
  total_weighted_lcu_bn: number;
  status_counts: Record<string, number>;
  components_summary: ComponentSummary[];
}

export interface CopyResult {
  source_fiscal_year: number;
  target_fiscal_year: number;
  copied_records: number;
}

export interface ImportPreviewRow {
  row: number;
  indicator_code: string;
  indicator_name: string;
  component: string;
  gross_lcu_bn: number;
  weighted_lcu_bn: number;
  observed_value: number | null;
  benchmark_value: number | null;
}

export interface ImportError {
  row: number;
  error: string;
}

export interface ImportResult {
  fiscal_year: number;
  mode: 'preview' | 'import';
  total_rows: number;
  matched: number;
  unmatched: number;
  errors: ImportError[];
  preview: ImportPreviewRow[];
  created?: number;
  updated?: number;
}

// =============================================================================
// API Methods
// =============================================================================

export const indicatorAPI = {
  /**
   * List all indicator definitions.
   * GET /api/indicators/
   */
  listIndicators: async (component?: string): Promise<Indicator[]> => {
    const response = await indicatorClient.get<Indicator[]>('/', {
      params: component ? { component } : undefined,
    });
    return response.data;
  },

  /**
   * Get indicator data for a fiscal year.
   * GET /api/indicators/data/?fiscal_year=2024
   */
  getIndicatorData: async (
    fiscalYear: number,
    component?: string
  ): Promise<IndicatorData[]> => {
    const response = await indicatorClient.get<IndicatorData[]>('/data/', {
      params: { fiscal_year: fiscalYear, ...(component ? { component } : {}) },
    });
    return response.data;
  },

  /**
   * Save single indicator data.
   * POST /api/indicators/data/
   */
  saveIndicatorData: async (
    fiscalYear: number,
    data: IndicatorDataInput
  ): Promise<IndicatorData> => {
    const response = await indicatorClient.post<IndicatorData>('/data/', {
      ...data,
      fiscal_year: fiscalYear,
    });
    return response.data;
  },

  /**
   * Bulk save indicator data for a fiscal year.
   * POST /api/indicators/data/bulk/
   */
  bulkSaveIndicatorData: async (
    fiscalYear: number,
    indicators: IndicatorDataInput[]
  ): Promise<BulkSaveResult> => {
    const response = await indicatorClient.post<BulkSaveResult>('/data/bulk/', {
      fiscal_year: fiscalYear,
      indicators,
    });
    return response.data;
  },

  /**
   * Get summary of indicator data for a fiscal year.
   * GET /api/indicators/data/summary/?fiscal_year=2024
   */
  getFiscalYearSummary: async (fiscalYear: number): Promise<FiscalYearSummary> => {
    const response = await indicatorClient.get<FiscalYearSummary>('/data/summary/', {
      params: { fiscal_year: fiscalYear },
    });
    return response.data;
  },

  /**
   * Get fiscal years that have indicator data.
   * GET /api/indicators/data/available-years/
   */
  getAvailableDataYears: async (): Promise<number[]> => {
    const response = await indicatorClient.get<{ fiscal_years: number[] }>(
      '/data/available-years/'
    );
    return response.data.fiscal_years;
  },

  /**
   * Copy indicator data from one fiscal year to another.
   * POST /api/indicators/data/copy/
   */
  copyFiscalYearData: async (
    sourceFiscalYear: number,
    targetFiscalYear: number
  ): Promise<CopyResult> => {
    const response = await indicatorClient.post<CopyResult>('/data/copy/', {
      source_fiscal_year: sourceFiscalYear,
      target_fiscal_year: targetFiscalYear,
    });
    return response.data;
  },

  /**
   * Delete all indicator data for a fiscal year.
   * DELETE /api/indicators/data/delete-year/?fiscal_year=2025
   */
  deleteFiscalYearData: async (
    fiscalYear: number
  ): Promise<{ fiscal_year: number; deleted_records: number }> => {
    const response = await indicatorClient.delete<{
      fiscal_year: number;
      deleted_records: number;
    }>('/data/delete-year/', {
      params: { fiscal_year: fiscalYear },
    });
    return response.data;
  },

  /**
   * Import indicator data from CSV or Excel file.
   * POST /api/indicators/data/import/
   */
  importFile: async (
    file: File,
    fiscalYear: number,
    mode: 'preview' | 'import' = 'preview'
  ): Promise<ImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fiscal_year', fiscalYear.toString());
    formData.append('mode', mode);

    const response = await indicatorClient.post<ImportResult>('/data/import/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000, // 2 minutes for large files
    });
    return response.data;
  },

  /**
   * Download CSV template for bulk import.
   * GET /api/indicators/data/template/
   */
  downloadTemplate: async (): Promise<Blob> => {
    const response = await indicatorClient.get('/data/template/', {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default indicatorAPI;
