'use client';

import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { getFiscalYear } from '@/lib/constants/rwanda';

/** Earliest fiscal year offered (aligns with assessment data range). */
const EARLIEST_FY_START = 2015;

export function FiscalYearSelector() {
  const { fiscalYear, setFiscalYear } = useFiscalYear();
  const currentYear = new Date().getFullYear();
  const lastYear = Math.max(currentYear, currentYear + 1);

  const years = Array.from(
    { length: lastYear - EARLIEST_FY_START + 1 },
    (_, i) => getFiscalYear(EARLIEST_FY_START + i)
  ).reverse();

  return (
    <select
      aria-label="Select fiscal year"
      value={fiscalYear.label}
      onChange={(e) => {
        const selected = years.find((y) => y.label === e.target.value);
        if (selected) setFiscalYear(selected);
      }}
      className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[var(--rw-blue)]"
    >
      {years.map((y) => (
        <option key={y.label} value={y.label}>
          {y.label}
        </option>
      ))}
    </select>
  );
}
