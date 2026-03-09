import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { FiscalYearProvider } from '@/contexts/FiscalYearContext';
import { AlertProvider } from '@/contexts/AlertContext';

export const metadata: Metadata = {
  title: 'Republic of Rwanda — FSFI Dashboard',
  description: 'Food Systems Financial Intelligence — Ministry of Agriculture and Animal Resources',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <LanguageProvider>
          <FiscalYearProvider>
            <AlertProvider>
              {children}
            </AlertProvider>
          </FiscalYearProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
