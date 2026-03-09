'use client';

import { useFiscalYear } from '@/contexts/FiscalYearContext';

export function FiscalYearSelector() {
  const { fiscalYear, setFiscalYear } = useFiscalYear();
  const currentYear = new Date().getFullYear();

  const years = Array.from({ length: 5 }, (_, i) => {
    const startYear = currentYear - 2 + i;
    return {
      label: `FY ${startYear}/${startYear + 1}`,
      start_year: startYear,
      end_year: startYear + 1,
      start_date: `${startYear}-07-01`,
      end_date: `${startYear + 1}-06-30`,
    };
  });

  return (
    <select
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
