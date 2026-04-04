'use client';

import { RwandaProtectedRoute } from '@/components/rwanda/auth/RwandaProtectedRoute';
import { RwandaTopBar } from '@/components/rwanda/layout/RwandaTopBar';
import { RwandaSidebar } from '@/components/rwanda/layout/RwandaSidebar';
import { RwandaFooter } from '@/components/rwanda/layout/RwandaFooter';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RwandaProtectedRoute>
      <div className="relative flex min-h-screen flex-col bg-gradient-to-b from-slate-100/90 via-slate-50 to-white">
        <div
          className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-15%,rgba(0,161,222,0.14),transparent)]"
          aria-hidden
        />
        <RwandaTopBar />
        <div className="relative flex-1">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="flex gap-6 lg:gap-8">
              <RwandaSidebar />
              <main className="min-w-0 flex-1">{children}</main>
            </div>
          </div>
        </div>
        <RwandaFooter />
      </div>
    </RwandaProtectedRoute>
  );
}
