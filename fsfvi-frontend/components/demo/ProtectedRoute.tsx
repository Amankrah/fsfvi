'use client';

import { ReactNode } from 'react';
import { useDemoAuth } from '@/hooks/useDemoAuth';

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Protected route wrapper for Demo Government authentication
 *
 * Usage:
 * ```tsx
 * <ProtectedRoute>
 *   <YourProtectedComponent />
 * </ProtectedRoute>
 * ```
 */
export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { isLoading, isAuthenticated } = useDemoAuth(true);

  if (isLoading) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      )
    );
  }

  if (!isAuthenticated) {
    // Redirect is handled by useDemoAuth hook
    return null;
  }

  return <>{children}</>;
}
