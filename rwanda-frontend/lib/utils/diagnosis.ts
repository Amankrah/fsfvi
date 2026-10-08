import type {
  DiagnosisBucket,
  DiagnosisSummary,
  SavedIndicatorResult,
  StressDiagnosis,
} from '@/lib/types/assessment';

/** Reporting order: money problem → mixed → results/delivery problem → fine. */
export const DIAGNOSIS_ORDER: StressDiagnosis[] = [
  'unfunded_gap',
  'partially_funded_gap',
  'funded_gap',
  'at_benchmark',
];

/** Which side of the money/results axis a diagnosis sits on. */
export const DIAGNOSIS_AXIS: Record<StressDiagnosis, 'money' | 'mixed' | 'results' | 'none'> = {
  unfunded_gap: 'money',
  partially_funded_gap: 'mixed',
  funded_gap: 'results',
  at_benchmark: 'none',
};

/** Visual tokens per diagnosis; kept distinct from the risk-level palette. */
export const DIAGNOSIS_STYLE: Record<
  StressDiagnosis,
  { dot: string; bar: string; chip: string; panel: string; text: string }
> = {
  unfunded_gap: {
    dot: 'bg-rose-600',
    bar: 'bg-rose-500',
    chip: 'bg-rose-50 text-rose-800 border-rose-200',
    panel: 'border-rose-200 bg-rose-50/50',
    text: 'text-rose-800',
  },
  partially_funded_gap: {
    dot: 'bg-amber-500',
    bar: 'bg-amber-400',
    chip: 'bg-amber-50 text-amber-800 border-amber-200',
    panel: 'border-amber-200 bg-amber-50/50',
    text: 'text-amber-800',
  },
  funded_gap: {
    dot: 'bg-sky-600',
    bar: 'bg-sky-500',
    chip: 'bg-sky-50 text-sky-800 border-sky-200',
    panel: 'border-sky-200 bg-sky-50/50',
    text: 'text-sky-800',
  },
  at_benchmark: {
    dot: 'bg-emerald-500',
    bar: 'bg-emerald-500',
    chip: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    panel: 'border-emerald-200 bg-emerald-50/50',
    text: 'text-emerald-800',
  },
};

const TOP_N = 5;

/**
 * DRF serialises DecimalField as strings ("0.419500"), so saved indicator rows may arrive
 * with string numerics. Coerce defensively; null/undefined/NaN → fallback.
 */
function num(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === '') return fallback;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Build the same bucket structure the backend returns in `dashboard_summary.diagnosis_summary`,
 * from a saved assessment's indicator rows. Used when the user selects a historical run.
 *
 * `stress_share_percent` uses weighted_lcu_bn-free stress sums (Σ υᵢ) because per-indicator
 * engine weights are not stored on IndicatorResult; the backend version uses Σ wᵢυᵢ.
 * With near-equal indicator weights the two agree closely.
 */
export function summarizeDiagnosis(
  rows: SavedIndicatorResult[],
  /** Framework / database counts from the latest backend summary; they do not vary by year. */
  meta?: Pick<DiagnosisSummary, 'defined_indicator_count' | 'framework_indicator_count'> | null,
): DiagnosisSummary {
  const total = rows.length;
  const totalBudget = rows.reduce((s, r) => s + num(r.weighted_lcu_bn), 0);
  const totalStress = rows.reduce((s, r) => s + num(r.stress_value), 0);

  const buckets: DiagnosisBucket[] = DIAGNOSIS_ORDER.map((diag) => {
    const inBucket = rows
      .filter((r) => r.diagnosis === diag)
      .sort((a, b) => num(b.stress_value) - num(a.stress_value));
    const budget = inBucket.reduce((s, r) => s + num(r.weighted_lcu_bn), 0);
    const stress = inBucket.reduce((s, r) => s + num(r.stress_value), 0);
    return {
      diagnosis: diag,
      indicator_count: inBucket.length,
      indicator_share_percent: total ? (inBucket.length / total) * 100 : 0,
      budget_lcu_bn: budget,
      budget_share_percent: totalBudget ? (budget / totalBudget) * 100 : 0,
      stress_share_percent: totalStress ? (stress / totalStress) * 100 : 0,
      imputed_count: inBucket.filter((r) => r.delta_imputed).length,
      indicators: inBucket.slice(0, TOP_N).map((r) => ({
        indicator_code: r.indicator_code,
        indicator_name: r.indicator_name,
        component: r.component,
        component_display: r.component_display,
        performance_gap: num(r.performance_gap),
        stress_value: num(r.stress_value),
        financing_coverage: r.financing_coverage == null ? null : num(r.financing_coverage),
        weighted_lcu_bn: num(r.weighted_lcu_bn),
        delta_imputed: Boolean(r.delta_imputed),
      })),
    };
  });

  return {
    buckets,
    total_indicators: total,
    defined_indicator_count: meta?.defined_indicator_count,
    framework_indicator_count: meta?.framework_indicator_count,
    imputed_indicator_count: rows.filter((r) => r.delta_imputed).length,
    unlabelled_count: rows.filter((r) => !r.diagnosis).length,
  };
}
