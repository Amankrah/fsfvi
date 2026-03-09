'use client';

import { type ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface RwandaProtectedRouteProps {
  children: ReactNode;
}

export function RwandaProtectedRoute({ children }: RwandaProtectedRouteProps) {
  const { isLoading, isAuthenticated } = useAuth(true);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--rw-blue)] mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <>{children}</>;
}
