/**
 * UI Display Formatters
 * =====================
 * Presentation-only utilities for Rwanda FSFI.
 *
 * NOTE: stress_level and priority_level must come from the backend API only.
 * These functions only map backend values to UI (colors, labels); they do not
 * compute or derive risk levels from scores.
 */

// ============================================================================
// Stress Level UI Mapping (backend provides: "low" | "medium" | "high" | "critical")
// ============================================================================

export type StressLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Classify a score against backend-supplied cut-points (used only to colour
 * chart cells/bands where the backend cannot attach a label to every pixel).
 * The cut-points themselves always come from the API (`StressThreshold`).
 */
export function classifyWithThresholds(
  score: number,
  t: { low_max: number; medium_max: number; high_max: number | null } | null | undefined,
): StressLevel {
  if (!t) return 'medium';
  if (score <= t.low_max) return 'low';
  if (score <= t.medium_max) return 'medium';
  if (t.high_max === null || score <= t.high_max) return 'high';
  return 'critical';
}

/** i18n key for the gap × financing-coverage diagnosis label. */
export function diagnosisTranslationKey(diagnosis: string | null | undefined): string {
  const map: Record<string, string> = {
    at_benchmark: 'diagnosis.at_benchmark',
    unfunded_gap: 'diagnosis.unfunded_gap',
    partially_funded_gap: 'diagnosis.partially_funded_gap',
    funded_gap: 'diagnosis.funded_gap',
  };
  return map[diagnosis ?? ''] ?? 'diagnosis.unknown';
}

/** Tailwind classes for the diagnosis chip (neutral palette, distinct from risk colours). */
export function getDiagnosisChipClass(diagnosis: string | null | undefined): string {
  const map: Record<string, string> = {
    at_benchmark: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    unfunded_gap: 'bg-rose-50 text-rose-800 border-rose-200',
    partially_funded_gap: 'bg-amber-50 text-amber-800 border-amber-200',
    funded_gap: 'bg-sky-50 text-sky-800 border-sky-200',
  };
  return map[diagnosis ?? ''] ?? 'bg-slate-50 text-slate-700 border-slate-200';
}

/** i18n key for full risk badge phrase (word order safe per locale). */
export function riskBadgeTranslationKey(level: string | null | undefined): string {
  const l = (level ?? 'medium').toLowerCase();
  if (l === 'medium') return 'risk.badge_moderate';
  const map: Record<string, string> = {
    low: 'risk.badge_low',
    high: 'risk.badge_high',
    critical: 'risk.badge_critical',
  };
  return map[l] ?? 'risk.badge_moderate';
}

/** Map backend stress_level to Tailwind background classes */
export function getRiskBgColor(stressLevel: StressLevel): string {
  const colors: Record<StressLevel, string> = {
    low: 'bg-green-100 text-green-800 border-green-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    critical: 'bg-red-100 text-red-800 border-red-200',
  };
  return colors[stressLevel] || colors.medium;
}

/** Map backend stress_level to display label */
export function getRiskLabel(stressLevel: StressLevel): string {
  const labels: Record<StressLevel, string> = {
    low: 'Low Risk',
    medium: 'Medium Risk',
    high: 'High Risk',
    critical: 'Critical Risk',
  };
  return labels[stressLevel] || 'Unknown';
}

/** Map backend stress_level to CSS color variable for stress bars */
export function getRiskBarColor(stressLevel: StressLevel): string {
  const colors: Record<StressLevel, string> = {
    low: 'var(--risk-low)',
    medium: 'var(--risk-moderate)',
    high: 'var(--risk-high)',
    critical: 'var(--risk-critical)',
  };
  return colors[stressLevel] || colors.medium;
}

// ============================================================================
// Performance gap display (backend provides gap; 0 = on/better than benchmark)
// ============================================================================

const GAP_GOOD_THRESHOLD = 0.005;

/**
 * Styling for performance gap from backend.
 * When gap is 0 (or effectively 0), observed is on or better than benchmark → green.
 * Otherwise use amber/red by severity. Frontend does not compute gap; it only displays.
 */
export function getPerformanceGapDisplay(performanceGap: number | null | undefined): {
  className: string;
  isGood: boolean;
} {
  const gap = performanceGap != null ? Number(performanceGap) : NaN;
  const isGood = Number.isFinite(gap) && gap < GAP_GOOD_THRESHOLD;
  if (isGood) {
    return { className: 'text-green-700 font-medium', isGood: true };
  }
  if (Number.isFinite(gap) && gap >= 0.5) {
    return { className: 'text-red-700 font-medium', isGood: false };
  }
  return { className: 'text-amber-700 font-medium', isGood: false };
}

// ============================================================================
// Number Display Formatting
// ============================================================================

/** Format RWF currency with symbol */
export function formatRWF(amount: number): string {
  return new Intl.NumberFormat('en-RW', {
    style: 'currency',
    currency: 'RWF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format RWF with compact notation (B/M) */
export function formatRWFCompact(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_000_000_000_000) {
    return `${sign}RWF ${(abs / 1_000_000_000_000).toFixed(1)}T`;
  }
  if (abs >= 1_000_000_000) {
    return `${sign}RWF ${(abs / 1_000_000_000).toFixed(1)}B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}RWF ${(abs / 1_000_000).toFixed(1)}M`;
  }
  return `${sign}RWF ${abs.toFixed(0)}`;
}

/** Format score/index for display (backend may send number or string). Uses 4 decimal places for index precision. */
export function formatScore(score: number | string | null | undefined, decimals: number = 4): string {
  const n = score == null ? NaN : Number(score);
  return Number.isFinite(n) ? n.toFixed(decimals) : '–';
}

/**
 * Observed / benchmark values as a reader would write them: thousands grouped,
 * trailing zeros trimmed, at most 4 decimals (180000 -> "180,000", 25.36 -> "25.36").
 */
export function formatValue(value: number | string | null | undefined, maxDecimals: number = 4): string {
  const n = value == null ? NaN : Number(value);
  if (!Number.isFinite(n)) return '–';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: maxDecimals }).format(n);
}

/** Human-readable engine run duration (avoid raw "0 ms" when work was negligible). */
export function formatEngineDurationMs(ms: number | null | undefined): string {
  const n = ms == null ? NaN : Number(ms);
  if (!Number.isFinite(n) || n < 0) return '–';
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)} s`;
  if (n < 1) return '< 1 ms';
  return `${Math.round(n)} ms`;
}

/** Format as percentage */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

const POLICY_DATE_LOCALE: Record<string, string> = {
  en: 'en-US',
  fr: 'fr-FR',
  rw: 'rw-RW',
};

/**
 * Policy-friendly calendar date (no time of day) for executive-facing copy.
 */
export function formatPolicyDate(
  iso: string | null | undefined,
  locale: 'en' | 'fr' | 'rw' = 'en',
): string {
  if (!iso) return '–';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '–';
  const tag = POLICY_DATE_LOCALE[locale] ?? 'en-US';
  try {
    return new Intl.DateTimeFormat(tag, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d);
  } catch {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d);
  }
}

/** Format USD with compact notation (B/M) for large amounts */
export function formatUSDCompact(amount: number): string {
  if (amount >= 1_000_000_000_000) {
    return `$ ${(amount / 1_000_000_000_000).toFixed(1)}T`;
  }
  if (amount >= 1_000_000_000) {
    return `$ ${(amount / 1_000_000_000).toFixed(1)}B`;
  }
  if (amount >= 1_000_000) {
    return `$ ${(amount / 1_000_000_000).toFixed(2)}B`;
  }
  if (amount >= 1_000) {
    return `$ ${(amount / 1_000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
