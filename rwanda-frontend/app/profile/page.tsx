'use client';

import { useAuth } from '@/hooks/useAuth';
import { RwandaProtectedRoute } from '@/components/rwanda/auth/RwandaProtectedRoute';
import { RwandaTopBar } from '@/components/rwanda/layout/RwandaTopBar';
import { RwandaSidebar } from '@/components/rwanda/layout/RwandaSidebar';
import { RwandaFooter } from '@/components/rwanda/layout/RwandaFooter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

function ProfileContent() {
  const { user } = useAuth(true);
  const { t } = useLanguage();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <User className="h-5 w-5 text-[var(--rw-blue)]" />
          <span>Profile</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Username</label>
            <p className="text-gray-900 font-medium">{user?.username || '—'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Government</label>
            <p className="text-gray-900 font-medium">{user?.government_name || t('app.ministry')}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Role</label>
            <p className="text-gray-900 font-medium">{user?.role || 'Government Official'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Two-Factor Authentication</label>
            <p className="text-gray-900 font-medium">{user?.two_fa_enabled ? 'Enabled' : 'Disabled'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Last Login</label>
            <p className="text-gray-900 font-medium">{user?.last_login || '—'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProfilePage() {
  return (
    <RwandaProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <RwandaTopBar />
        <div className="flex-1 max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex gap-6">
            <RwandaSidebar />
            <main className="flex-1 min-w-0">
              <ProfileContent />
            </main>
          </div>
        </div>
        <RwandaFooter />
      </div>
    </RwandaProtectedRoute>
  );
}
