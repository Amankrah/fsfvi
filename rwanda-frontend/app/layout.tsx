import type { Metadata } from 'next';
import { Source_Sans_3 } from 'next/font/google';
import './globals.css';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { FiscalYearProvider } from '@/contexts/FiscalYearContext';
import { AlertProvider } from '@/contexts/AlertContext';

/** Readable, neutral sans used widely for government and data-heavy UIs; loaded via next/font. */
const sourceSans = Source_Sans_3({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-app',
});

export const metadata: Metadata = {
  title: 'FSFI — Food Systems Financing Intelligence (Rwanda)',
  description: 'Decision-support for food system budget allocation. Ministry of Agriculture and Animal Resources, Government of Rwanda.',
  icons: { icon: '/icon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sourceSans.variable}>
      <body className="font-sans antialiased text-base leading-relaxed">
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
