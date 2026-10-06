'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, getAuthErrorMessage } from '@/lib/api/authApi';
import { useLanguage } from '@/contexts/LanguageContext';
import { Shield, AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TwoFactorFormProps {
  tempToken: string;
  username: string;
  onBack: () => void;
}

export function TwoFactorForm({ tempToken, username, onBack }: TwoFactorFormProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [useBackup, setUseBackup] = useState(false);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [backupCode, setBackupCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (useBackup) {
      const bc = backupCode.trim().toUpperCase().replace(/\s/g, '');
      if (bc.length !== 8) return;
    } else {
      const fullCode = code.join('');
      if (fullCode.length !== 6) return;
    }

    setIsLoading(true);
    try {
      const response = await authAPI.verify2FA({
        temp_token: tempToken,
        code: useBackup ? backupCode.trim().toUpperCase().replace(/\s/g, '') : code.join(''),
        is_backup_code: useBackup,
      });
      if (response.user.is_temporary_password) {
        router.push('/change-password');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError(getAuthErrorMessage(err, t('auth.invalid_2fa')));
      if (!useBackup) {
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        setBackupCode('');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-8">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--rw-blue-deep)]">
          <Shield className="h-3.5 w-3.5" aria-hidden />
          {t('auth.verify_identity')}
        </p>
        <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-slate-900">{t('auth.two_factor_title')}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {useBackup ? t('auth.backup_code_placeholder') : t('auth.two_factor_subtitle')}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          {t('auth.signing_in_as')} <strong className="font-semibold text-slate-900">{username}</strong>
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4" role="alert">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {useBackup ? (
          <input
            type="text"
            autoComplete="one-time-code"
            maxLength={8}
            value={backupCode}
            onChange={(e) => setBackupCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
            placeholder={t('auth.backup_code_placeholder')}
            className="h-12 w-full rounded-md border border-slate-300 px-4 text-center font-mono text-lg tracking-[0.3em] text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] placeholder:tracking-normal placeholder:text-slate-400 focus:border-[var(--rw-blue-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--rw-blue-deep)]/25"
            disabled={isLoading}
          />
        ) : (
          <div className="flex justify-between gap-2">
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputRefs.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                aria-label={`Digit ${i + 1}`}
                className="h-14 w-full rounded-md border border-slate-300 text-center text-xl font-semibold tabular-nums text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] focus:border-[var(--rw-blue-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--rw-blue-deep)]/25"
                disabled={isLoading}
              />
            ))}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || (useBackup ? backupCode.trim().length !== 8 : code.some((d) => !d))}
          className="flex h-11 w-full items-center justify-center rounded-md bg-[var(--rw-blue-deep)] px-4 text-[15px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_1px_2px_rgba(2,6,23,0.2)] transition-colors hover:bg-[var(--rw-blue-ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rw-blue-deep)] focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {isLoading ? t('auth.verifying') : t('auth.verify_code')}
        </button>
      </form>

      <div className="mt-6 flex items-center justify-between gap-4 border-t border-slate-200 pt-5">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 text-slate-600">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t('auth.back_to_login')}
        </Button>
        <button
          type="button"
          onClick={() => {
            setUseBackup(!useBackup);
            setError('');
            setBackupCode('');
            setCode(['', '', '', '', '', '']);
          }}
          className="text-sm font-medium text-[var(--rw-blue-deep)] underline-offset-4 hover:underline"
        >
          {useBackup ? t('auth.use_totp_code') : t('auth.use_backup_code')}
        </button>
      </div>
    </div>
  );
}
