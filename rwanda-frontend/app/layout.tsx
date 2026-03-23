import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { FiscalYearProvider } from '@/contexts/FiscalYearContext';
import { AlertProvider } from '@/contexts/AlertContext';

export const metadata: Metadata = {
  title: 'Rwanda FSFI: Food Systems Financial Intelligence',
  description: 'Decision-support for food system budget allocation. Ministry of Agriculture and Animal Resources.',
  icons: { icon: '/icon.svg' },
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
