'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api/authApi';
import { useLanguage } from '@/contexts/LanguageContext';
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
  /** Shown above the card when redirecting after session expiry (opaque, i18n-safe). */
  sessionNotice?: string;
}

export function RwandaLoginForm({ onTwoFactorRequired, sessionNotice }: RwandaLoginFormProps) {
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
      const response: LoginResponse = await authAPI.login({ username, password });

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
    <div className="w-full">
      {sessionNotice ? (
        <div
          className="mb-6 flex items-start gap-3 rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-slate-800"
          role="status"
        >
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[var(--rw-blue-deep)]" aria-hidden />
          <span>{sessionNotice}</span>
        </div>
      ) : null}

      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--rw-blue-deep)]">
          {t('auth.secure_auth')}
        </p>
        <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-slate-900">{t('auth.welcome_back')}</h1>
        <p className="mt-2 text-sm text-slate-600">{t('auth.enter_credentials')}</p>
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4" role="alert">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-red-900">{t('auth.auth_failed')}</p>
              <p className="mt-1 text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-slate-800">
            {t('auth.username')}
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <User className="h-4.5 w-4.5 text-slate-400" aria-hidden />
            </div>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={50}
              className="h-11 w-full rounded-md border border-slate-300 bg-white pl-10 pr-4 text-[15px] text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors placeholder:text-slate-400 hover:border-slate-400 focus:border-[var(--rw-blue-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--rw-blue-deep)]/25 disabled:bg-slate-50"
              placeholder={t('auth.username')}
              disabled={isLoading}
              autoComplete="username"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-800">
            {t('auth.password')}
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Lock className="h-4.5 w-4.5 text-slate-400" aria-hidden />
            </div>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="h-11 w-full rounded-md border border-slate-300 bg-white pl-10 pr-12 text-[15px] text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors placeholder:text-slate-400 hover:border-slate-400 focus:border-[var(--rw-blue-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--rw-blue-deep)]/25 disabled:bg-slate-50"
              placeholder={t('auth.password')}
              disabled={isLoading}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-700"
              disabled={isLoading}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !username || !password}
          className="group flex h-11 w-full items-center justify-center rounded-md bg-[var(--rw-blue-deep)] px-4 text-[15px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_1px_2px_rgba(2,6,23,0.2)] transition-colors hover:bg-[var(--rw-blue-ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rw-blue-deep)] focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
              {t('auth.signing_in')}
            </>
          ) : (
            <>
              {t('auth.sign_in')}
              <ArrowRight className="ml-2 h-4.5 w-4.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 flex items-start gap-3 border-t border-slate-200 pt-5">
        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        <p className="text-xs leading-relaxed text-slate-500">{t('auth.contact_admin')}</p>
      </div>
    </div>
  );
}
