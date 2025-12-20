'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { demoAuthAPI } from '@/lib/demoAuthApi';
import { PasswordChangeForm } from '@/components/demo';

export default function ChangePasswordPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    if (!demoAuthAPI.isAuthenticated()) {
      router.push('/demo/login');
    }
  }, [router]);

  const handlePasswordChanged = () => {
    // After successful password change, redirect to dashboard
    router.push('/demo/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900">Change Password Required</h1>
            <p className="text-gray-600 mt-2">
              Your current password is temporary. Please set a new secure password.
            </p>
          </div>

          <PasswordChangeForm onSuccess={handlePasswordChanged} />

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Password must be at least 12 characters and include uppercase, lowercase, numbers, and special characters.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
