import type { YearlyPlanOutput } from '@/lib/types/planning';

/** Human-readable label for a multi-year plan row (prefers fiscal year when present). */
export function formatPlanPeriodLabel(yp: Pick<YearlyPlanOutput, 'year' | 'fiscal_year'>): string {
  const fy = yp.fiscal_year;
  if (fy != null && Number.isFinite(Number(fy))) {
    return `FY${fy}`;
  }
  return `Year ${yp.year}`;
}
