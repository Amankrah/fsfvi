'use client';

import { RwandaProtectedRoute } from '@/components/rwanda/auth/RwandaProtectedRoute';
import { RwandaTopBar } from '@/components/rwanda/layout/RwandaTopBar';
import { RwandaSidebar } from '@/components/rwanda/layout/RwandaSidebar';
import { RwandaFooter } from '@/components/rwanda/layout/RwandaFooter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';

export default function SecurityPage() {
  return (
    <RwandaProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <RwandaTopBar />
        <div className="flex-1 max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex gap-6">
            <RwandaSidebar />
            <main className="flex-1 min-w-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="h-5 w-5 text-[var(--rw-blue)]" />
                    <span>Security Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Password management & two-factor authentication settings.</p>
                </CardContent>
              </Card>
            </main>
          </div>
        </div>
        <RwandaFooter />
      </div>
    </RwandaProtectedRoute>
  );
}
