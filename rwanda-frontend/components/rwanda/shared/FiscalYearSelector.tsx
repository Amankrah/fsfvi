'use client';

import { useEffect, useState } from 'react';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { getFiscalYear } from '@/lib/constants/rwanda';
import { assessmentAPI } from '@/lib/api/assessmentApi';

export function FiscalYearSelector() {
  const { fiscalYear, setFiscalYear } = useFiscalYear();
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    assessmentAPI
      .getAvailableFiscalYears()
      .then((years) => {
        if (!cancelled) {
          setAvailableYears(years);
          // If current selection isn't in the available list, switch to the latest
          if (years.length > 0 && !years.includes(fiscalYear.start_year)) {
            setFiscalYear(getFiscalYear(years[0]));
          }
        }
      })
      .catch((err) => {
        console.error('[FiscalYearSelector] Failed to fetch available years:', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
    // Only fetch on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <select
        aria-label="Select fiscal year"
        disabled
        className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-400 focus:outline-none"
      >
        <option>{fiscalYear.label}</option>
      </select>
    );
  }

  if (availableYears.length === 0) {
    return (
      <select
        aria-label="Select fiscal year"
        disabled
        className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-400 focus:outline-none"
      >
        <option>No data available</option>
      </select>
    );
  }

  const years = availableYears.map((y) => getFiscalYear(y));

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
