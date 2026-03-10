/**
 * UI Display Formatters
 * =====================
 * Presentation-only utilities for Rwanda FSFI.
 *
 * NOTE: Business logic (risk levels, scores, calculations) is handled by the backend.
 * These functions only format backend values for UI display.
 */

// ============================================================================
// Stress Level UI Mapping (backend provides: "low" | "medium" | "high" | "critical")
// ============================================================================

export type StressLevel = 'low' | 'medium' | 'high' | 'critical';

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

/** For legacy compatibility - converts score to level (prefer using backend stress_level) */
export function getRiskLevel(score: number): StressLevel {
  if (score >= 0.75) return 'critical';
  if (score >= 0.50) return 'high';
  if (score >= 0.25) return 'medium';
  return 'low';
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
  if (amount >= 1_000_000_000_000) {
    return `RWF ${(amount / 1_000_000_000_000).toFixed(1)}T`;
  }
  if (amount >= 1_000_000_000) {
    return `RWF ${(amount / 1_000_000_000).toFixed(1)}B`;
  }
  if (amount >= 1_000_000) {
    return `RWF ${(amount / 1_000_000).toFixed(1)}M`;
  }
  return formatRWF(amount);
}

/** Format score for display (backend provides raw decimal) */
export function formatScore(score: number, decimals: number = 2): string {
  return score.toFixed(decimals);
}

/** Format as percentage */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}
