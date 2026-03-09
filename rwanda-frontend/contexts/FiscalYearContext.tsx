'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { getCurrentFiscalYear } from '@/lib/constants/rwanda';
import type { RwandaFiscalYear } from '@/lib/types/rwanda';

interface FiscalYearContextType {
  fiscalYear: RwandaFiscalYear;
  setFiscalYear: (fy: RwandaFiscalYear) => void;
}

const FiscalYearContext = createContext<FiscalYearContextType | undefined>(undefined);

export function FiscalYearProvider({ children }: { children: ReactNode }) {
  const [fiscalYear, setFiscalYear] = useState<RwandaFiscalYear>(getCurrentFiscalYear());

  return (
    <FiscalYearContext.Provider value={{ fiscalYear, setFiscalYear }}>
      {children}
    </FiscalYearContext.Provider>
  );
}

export function useFiscalYear() {
  const context = useContext(FiscalYearContext);
  if (!context) throw new Error('useFiscalYear must be used within FiscalYearProvider');
  return context;
}
