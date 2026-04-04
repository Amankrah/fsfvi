'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, getAuthErrorMessage } from '@/lib/api/authApi';
import { RwandaLogo } from '@/components/rwanda/shared/RwandaLogo';
import { useLanguage } from '@/contexts/LanguageContext';
import { Lock, AlertCircle, CheckCircle } from 'lucide-react';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 12) {
      setError(t('auth.password_policy_hint'));
      return;
    }

    setIsLoading(true);
    try {
      await authAPI.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      router.push('/dashboard');
    } catch (e) {
      setError(getAuthErrorMessage(e, t('auth.auth_failed')));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--rw-blue)]/5 via-[var(--rw-green)]/5 to-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <RwandaLogo size="lg" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t('auth.change_password')}</h1>
          <p className="text-sm text-gray-600 mt-1">{t('auth.must_change_password')}</p>
        </div>

        <div className="bg-white shadow-xl rounded-2xl border border-gray-200 p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('auth.current_password')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--rw-blue)] focus:border-transparent"
                  disabled={isLoading}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('auth.new_password')}</label>
              <p className="text-xs text-gray-500 mb-2">{t('auth.password_policy_hint')}</p>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={12}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--rw-blue)] focus:border-transparent"
                  disabled={isLoading}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('auth.confirm_password')}</label>
              <div className="relative">
                <CheckCircle className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 ${newPassword && newPassword === confirmPassword ? 'text-emerald-500' : 'text-gray-400'}`} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--rw-blue)] focus:border-transparent"
                  disabled={isLoading}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading || !currentPassword || !newPassword || !confirmPassword}
              className="w-full bg-gradient-to-r from-[var(--rw-blue)] to-[var(--rw-green)] text-white py-3 px-4 rounded-lg hover:opacity-90 disabled:opacity-50 transition-all shadow-lg font-semibold"
            >
              {isLoading ? 'Changing...' : t('auth.change_password')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
