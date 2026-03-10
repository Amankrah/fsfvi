/**
 * Rwanda-Specific Types
 * =====================
 * Types for Rwanda fiscal years and seasons.
 */

// ============================================================================
// Fiscal Year Types (Rwanda: July to June)
// ============================================================================

export interface RwandaFiscalYear {
  label: string;        // e.g., "FY 2025/2026"
  start_year: number;   // 2025
  end_year: number;     // 2026
  start_date: string;   // "2025-07-01"
  end_date: string;     // "2026-06-30"
}

// ============================================================================
// Season Types
// ============================================================================

export type RwandaSeason = 'season_a' | 'season_b' | 'season_c';

export interface SeasonInfo {
  id: RwandaSeason;
  label: string;
  label_rw: string;
  months: string;
  description: string;
}
