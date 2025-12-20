'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { demoAuthAPI } from '@/lib/demoAuthApi';

export default function DemoPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    if (demoAuthAPI.isAuthenticated()) {
      // Redirect to dashboard if authenticated
      router.push('/demo/dashboard');
    } else {
      // Redirect to login if not authenticated
      router.push('/demo/login');
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}
