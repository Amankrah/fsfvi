/**
 * Rwanda-Specific Types
 * =====================
 * Types for Rwanda fiscal years.
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

/** In-app notification item (AlertContext). */
export interface Alert {
  id: string;
  read: boolean;
  title?: string;
  message?: string;
  severity?: 'info' | 'warning' | 'error';
  createdAt?: string;
}
