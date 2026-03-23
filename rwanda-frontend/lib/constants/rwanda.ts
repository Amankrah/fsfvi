/**
 * Rwanda Constants
 * =================
 * Constants and helper functions for Rwanda FSFI.
 */

import type { RwandaFiscalYear } from '@/lib/types/rwanda';

// ============================================================================
// Fiscal Year (Rwanda: July to June)
// ============================================================================

export function getCurrentFiscalYear(): RwandaFiscalYear {
  const now = new Date();
  const month = now.getMonth(); // 0-11
  const year = now.getFullYear();

  // Rwanda fiscal year runs July (month 6) to June (month 5)
  // If we're in July-December, fiscal year is current/next
  // If we're in January-June, fiscal year is previous/current
  const startYear = month >= 6 ? year : year - 1;
  const endYear = startYear + 1;

  return {
    label: `FY ${startYear}/${endYear}`,
    start_year: startYear,
    end_year: endYear,
    start_date: `${startYear}-07-01`,
    end_date: `${endYear}-06-30`,
  };
}

export function getFiscalYear(startYear: number): RwandaFiscalYear {
  const endYear = startYear + 1;
  return {
    label: `FY ${startYear}/${endYear}`,
    start_year: startYear,
    end_year: endYear,
    start_date: `${startYear}-07-01`,
    end_date: `${endYear}-06-30`,
  };
}

export function getAvailableFiscalYears(): RwandaFiscalYear[] {
  const current = getCurrentFiscalYear();
  const years: RwandaFiscalYear[] = [];

  // Show 5 years: 2 past, current, 2 future
  for (let i = -2; i <= 2; i++) {
    years.push(getFiscalYear(current.start_year + i));
  }

  return years;
}

// ============================================================================
// Currency Formatting (RWF - Rwandan Franc)
// ============================================================================

export function formatRWF(amount: number): string {
  return new Intl.NumberFormat('rw-RW', {
    style: 'currency',
    currency: 'RWF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

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

// Approximate exchange rate (should be configurable)
export const RWF_TO_USD = 1350;

export function rwfToUsd(rwf: number): number {
  return rwf / RWF_TO_USD;
}

export function usdToRwf(usd: number): number {
  return usd * RWF_TO_USD;
}
