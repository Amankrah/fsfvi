'use client';

import { RwandaProtectedRoute } from '@/components/rwanda/auth/RwandaProtectedRoute';
import { RwandaTopBar } from '@/components/rwanda/layout/RwandaTopBar';
import { RwandaSidebar } from '@/components/rwanda/layout/RwandaSidebar';
import { RwandaFooter } from '@/components/rwanda/layout/RwandaFooter';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RwandaProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <RwandaTopBar />
        <div className="flex-1 max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex gap-6">
            <RwandaSidebar />
            <main className="flex-1 min-w-0">
              {children}
            </main>
          </div>
        </div>
        <RwandaFooter />
      </div>
    </RwandaProtectedRoute>
  );
}
