'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, AlertTriangle, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredAuth?: boolean;
  redirectTo?: string;
  allowTemporaryPassword?: boolean;
}

export default function ProtectedRoute({
  children,
  requiredAuth = true,
  redirectTo = '/signin',
  allowTemporaryPassword = false,
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const kenyaGreen = '#006600';
  const kenyaRed = '#BB0000';

  useEffect(() => {
    if (!isLoading) {
      if (requiredAuth && !isAuthenticated) {
        // Not authenticated, redirect to signin
        router.push(redirectTo);
        return;
      }

      if (user && user.is_temporary_password && !allowTemporaryPassword) {
        // Has temporary password and page doesn't allow it
        router.push('/change-password');
        return;
      }
    }
  }, [isAuthenticated, isLoading, user, requiredAuth, redirectTo, allowTemporaryPassword, router]);

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card-glass text-center p-8 max-w-md mx-auto">
          <div className="flex justify-center mb-4">
            <div
              className="p-4 rounded-2xl shadow-lg"
              style={{ background: `linear-gradient(to right, ${kenyaGreen}, ${kenyaRed})` }}
            >
              <Shield className="w-12 h-12 text-white" />
            </div>
          </div>

          <h2 className="text-xl font-bold mb-4 text-gradient-kenya">
            Verifying Authentication
          </h2>

          <div className="flex items-center justify-center mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-b-transparent" style={{ borderColor: kenyaGreen }}></div>
            <span className="ml-3 text-gray-600">Checking credentials...</span>
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p>🔒 Validating secure session</p>
            <p>🛡️ Verifying government access</p>
            <p>⏱️ Checking session expiry</p>
          </div>
        </div>
      </div>
    );
  }

  // Show access denied screen for non-authenticated users
  if (requiredAuth && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card-glass text-center p-8 max-w-md mx-auto">
          <div className="flex justify-center mb-4">
            <div
              className="p-4 rounded-2xl shadow-lg"
              style={{ backgroundColor: kenyaRed }}
            >
              <AlertTriangle className="w-12 h-12 text-white" />
            </div>
          </div>

          <h2 className="text-xl font-bold mb-4" style={{ color: kenyaRed }}>
            Access Denied
          </h2>

          <p className="text-gray-600 mb-6">
            This area is restricted to authorized Kenya Government personnel only.
            Please sign in with your government credentials to continue.
          </p>

          <div className="space-y-4">
            <button
              onClick={() => router.push('/signin')}
              className="w-full btn-kenya py-3 font-semibold"
            >
              Sign In
            </button>

            <button
              onClick={() => router.push('/')}
              className="w-full px-6 py-3 glass hover:bg-white/20 rounded-lg font-semibold transition-all"
            >
              Return to Homepage
            </button>
          </div>

          <div className="mt-6 text-xs text-gray-500 space-y-1">
            <p>🔐 Secure government portal</p>
            <p>📋 All access attempts are logged</p>
            <p>⚖️ Authorized personnel only</p>
          </div>
        </div>
      </div>
    );
  }

  // Show temporary password notice
  if (user && user.is_temporary_password && !allowTemporaryPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card-glass text-center p-8 max-w-md mx-auto">
          <div className="flex justify-center mb-4">
            <div
              className="p-4 rounded-2xl shadow-lg"
              style={{ backgroundColor: '#FF8C00' }}
            >
              <Clock className="w-12 h-12 text-white" />
            </div>
          </div>

          <h2 className="text-xl font-bold mb-4" style={{ color: '#FF8C00' }}>
            Password Change Required
          </h2>

          <p className="text-gray-600 mb-6">
            For security reasons, you must change your temporary password before accessing this area.
          </p>

          <button
            onClick={() => router.push('/change-password')}
            className="w-full btn-kenya py-3 font-semibold"
          >
            Change Password Now
          </button>

          <div className="mt-6 text-xs text-gray-500 space-y-1">
            <p>🔒 Security protocol enforcement</p>
            <p>⚠️ Temporary passwords must be changed</p>
            <p>🛡️ Enhanced government security</p>
          </div>
        </div>
      </div>
    );
  }

  // Show session expired notice
  if (requiredAuth && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card-glass text-center p-8 max-w-md mx-auto">
          <div className="flex justify-center mb-4">
            <div
              className="p-4 rounded-2xl shadow-lg"
              style={{ backgroundColor: '#6B7280' }}
            >
              <Clock className="w-12 h-12 text-white" />
            </div>
          </div>

          <h2 className="text-xl font-bold mb-4 text-gray-700">
            Session Expired
          </h2>

          <p className="text-gray-600 mb-6">
            Your session has expired for security reasons. Please sign in again to continue.
          </p>

          <button
            onClick={() => router.push('/signin')}
            className="w-full btn-kenya py-3 font-semibold"
          >
            Sign In Again
          </button>

          <div className="mt-6 text-xs text-gray-500 space-y-1">
            <p>⏰ Sessions expire after 30 minutes of inactivity</p>
            <p>🔒 Automatic logout for security</p>
            <p>🔄 Please sign in to continue</p>
          </div>
        </div>
      </div>
    );
  }

  // All checks passed, render children
  return <>{children}</>;
}