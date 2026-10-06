'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, getAuthErrorMessage } from '@/lib/api/authApi';
import { AuthShell } from '@/components/rwanda/auth/AuthShell';
import { useLanguage } from '@/contexts/LanguageContext';
import { Lock, AlertCircle, CheckCircle } from 'lucide-react';

const INPUT_CLASS =
  'h-11 w-full rounded-md border border-slate-300 bg-white pl-10 pr-4 text-[15px] text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-slate-400 focus:border-[var(--rw-blue-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--rw-blue-deep)]/25 disabled:bg-slate-50';

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
    <AuthShell hideBackLink>
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--rw-blue-deep)]">
          {t('auth.secure_auth')}
        </p>
        <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-slate-900">{t('auth.change_password')}</h1>
        <p className="mt-2 text-sm text-slate-600">{t('auth.must_change_password')}</p>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4" role="alert">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="current-password" className="mb-1.5 block text-sm font-medium text-slate-800">
            {t('auth.current_password')}
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
              className={INPUT_CLASS}
              disabled={isLoading}
            />
          </div>
        </div>
        <div>
          <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-slate-800">
            {t('auth.new_password')}
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={12}
              autoComplete="new-password"
              className={INPUT_CLASS}
              disabled={isLoading}
            />
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">{t('auth.password_policy_hint')}</p>
        </div>
        <div>
          <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-slate-800">
            {t('auth.confirm_password')}
          </label>
          <div className="relative">
            <CheckCircle
              className={`pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 ${
                newPassword && newPassword === confirmPassword ? 'text-emerald-600' : 'text-slate-400'
              }`}
              aria-hidden
            />
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              className={INPUT_CLASS}
              disabled={isLoading}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={isLoading || !currentPassword || !newPassword || !confirmPassword}
          className="flex h-11 w-full items-center justify-center rounded-md bg-[var(--rw-blue-deep)] px-4 text-[15px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_1px_2px_rgba(2,6,23,0.2)] transition-colors hover:bg-[var(--rw-blue-ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rw-blue-deep)] focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {isLoading ? 'Changing...' : t('auth.change_password')}
        </button>
      </form>
    </AuthShell>
  );
}
