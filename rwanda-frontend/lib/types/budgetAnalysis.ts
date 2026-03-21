/**
 * Budget analysis — financial history from IndicatorData (no FSFSI / optimization).
 */

export interface BudgetScope {
  start_year: number;
  end_year: number;
  years: number[];
  available_range: { min: number; max: number };
}

export interface NationalTrendPoint {
  year: number;
  weighted_lcu_bn: number;
  yoy_weighted_pct: number | null;
}

export interface BudgetHistoryMetrics {
  cagr_weighted_pct: number | null;
  volatility_yoy_weighted_pp: number;
  mean_abs_yoy_weighted_pct: number;
  hhi_first_year: number | undefined;
  hhi_last_year: number | undefined;
}

export interface ComponentSeriesPoint {
  year: number;
  weighted_lcu_bn: number;
  share_of_national_weighted_pct: number;
}

export interface ComponentTrend {
  component: string;
  series: ComponentSeriesPoint[];
}

export interface ComponentShareDrift {
  component: string;
  share_first_year_pct: number;
  share_last_year_pct: number;
  ppt_change: number;
}

export interface IndicatorMover {
  indicator_id: string;
  code: string;
  name: string;
  component: string;
  weighted_first_bn: number;
  weighted_last_bn: number;
  share_of_national_first_pct: number;
  share_of_national_last_pct: number;
  share_change_ppt: number;
  total_change_pct: number | null;
  cagr_pct: number | null;
  yoy_volatility: number;
  rank_first_year: number | undefined;
  rank_last_year: number | undefined;
  rank_delta: number | null | undefined;
  series: { year: number; weighted_lcu_bn: number }[];
}

export interface DataQualityYear {
  year: number;
  mapping_lines: number;
  fallback_lines: number;
  fallback_share_pct: number;
}

export interface BudgetHistoryPayload {
  scope: BudgetScope;
  computed_at: string;
  currency_note: string;
  national_trend: NationalTrendPoint[];
  totals_by_year: Record<number, Record<string, number>>;
  metrics: BudgetHistoryMetrics;
  hhi_by_year: Record<number, number>;
  component_trends: ComponentTrend[];
  component_share_drift: ComponentShareDrift[];
  indicator_movers: IndicatorMover[];
  data_quality_by_year: DataQualityYear[];
  insights: string[];
}

export interface BudgetSnapshotPayload {
  fiscal_year: number;
  computed_at: string;
  currency_note: string;
  total_weighted_lcu_bn: number;
  indicator_rows: number;
  by_component: {
    component: string;
    weighted_lcu_bn: number;
    share_of_weighted_budget_pct: number;
  }[];
  indicator_breakdown: {
    code: string;
    name: string;
    component: string;
    weighted_lcu_bn: number;
    gross_lcu_bn: number;
    share_weighted_percent: number;
    records_count: number;
    fallback_records: number;
  }[];
}
