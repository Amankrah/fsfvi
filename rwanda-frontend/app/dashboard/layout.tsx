'use client';

import { RwandaProtectedRoute } from '@/components/rwanda/auth/RwandaProtectedRoute';
import { RwandaTopBar } from '@/components/rwanda/layout/RwandaTopBar';
import { RwandaSidebar } from '@/components/rwanda/layout/RwandaSidebar';
import { RwandaFooter } from '@/components/rwanda/layout/RwandaFooter';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RwandaProtectedRoute>
      <div className="relative flex min-h-screen flex-col bg-surface">
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
