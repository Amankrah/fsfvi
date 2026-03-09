'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api/authApi';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/rwanda/shared/LanguageToggle';
import { RwandaLogo } from '@/components/rwanda/shared/RwandaLogo';
import type { LoginResponse } from '@/lib/types/auth';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  Shield,
} from 'lucide-react';

interface RwandaLoginFormProps {
  onTwoFactorRequired?: (tempToken: string, username: string) => void;
}

export function RwandaLoginForm({ onTwoFactorRequired }: RwandaLoginFormProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response: LoginResponse = await authAPI.login(username, password);

      if (response.requires_two_fa && response.two_fa_temp_token) {
        if (onTwoFactorRequired) {
          onTwoFactorRequired(response.two_fa_temp_token, username);
        }
      } else {
        if (response.user.is_temporary_password) {
          router.push('/change-password');
        } else {
          router.push('/dashboard');
        }
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string; message?: string } } };
      setError(
        axiosErr.response?.data?.error ||
        axiosErr.response?.data?.message ||
        'Invalid username or password',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <RwandaLogo size="lg" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          {t('app.republic')}
        </h1>
        <p className="text-sm text-gray-600">{t('app.subtitle')}</p>
        <div className="mt-3 flex justify-center">
          <LanguageToggle />
        </div>
      </div>

      {/* Login Card */}
      <div className="bg-white shadow-xl rounded-2xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-[var(--rw-blue)]/10 to-[var(--rw-green)]/10 px-8 py-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Lock className="h-5 w-5 mr-2 text-[var(--rw-blue)]" />
            {t('auth.secure_auth')}
          </h2>
          <p className="text-sm text-gray-600 mt-1">{t('auth.enter_credentials')}</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-900">{t('auth.auth_failed')}</p>
                  <p className="text-sm text-red-800 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-2">
                {t('auth.username')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
                  maxLength={50}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--rw-blue)] focus:border-transparent transition-all disabled:bg-gray-50"
                  placeholder={t('auth.username')}
                  disabled={isLoading}
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                {t('auth.password')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full pl-10 pr-12 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--rw-blue)] focus:border-transparent transition-all disabled:bg-gray-50"
                  placeholder={t('auth.password')}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  disabled={isLoading}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !username || !password}
              className="w-full bg-gradient-to-r from-[var(--rw-blue)] to-[var(--rw-green)] text-white py-3 px-4 rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--rw-blue)] focus:ring-offset-2 disabled:opacity-50 transition-all shadow-lg font-semibold flex items-center justify-center group"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  {t('auth.signing_in')}
                </>
              ) : (
                <>
                  {t('auth.sign_in')}
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="px-8 py-5 bg-gray-50 border-t border-gray-200">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-[var(--rw-blue)] mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-600">
              {t('auth.contact_admin')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
