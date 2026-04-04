'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, getAuthErrorMessage } from '@/lib/api/authApi';
import { useLanguage } from '@/contexts/LanguageContext';
import { RwandaLogo } from '@/components/rwanda/shared/RwandaLogo';
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
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <RwandaLogo size="lg" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('auth.two_factor_title')}</h1>
        <p className="text-sm text-gray-600">
          {useBackup ? t('auth.backup_code_placeholder') : t('auth.two_factor_subtitle')}
        </p>
      </div>

      <div className="bg-white shadow-xl rounded-2xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-[var(--rw-blue)]/10 to-[var(--rw-green)]/10 px-8 py-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Shield className="h-5 w-5 mr-2 text-[var(--rw-blue)]" />
            {t('auth.verify_identity')}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {t('auth.signing_in_as')} <strong>{username}</strong>
          </p>
        </div>

        <div className="p-8">
          <button
            type="button"
            onClick={() => {
              setUseBackup(!useBackup);
              setError('');
              setBackupCode('');
              setCode(['', '', '', '', '', '']);
            }}
            className="text-sm font-medium text-[var(--rw-blue)] hover:underline mb-4"
          >
            {useBackup ? t('auth.use_totp_code') : t('auth.use_backup_code')}
          </button>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
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
                className="w-full text-center text-lg font-mono tracking-wider border-2 border-gray-200 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-[var(--rw-blue)]"
                disabled={isLoading}
              />
            ) : (
              <div className="flex justify-center gap-2">
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
                    className="w-12 h-14 text-center text-xl font-bold border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--rw-blue)] focus:border-transparent"
                    disabled={isLoading}
                  />
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={
                isLoading ||
                (useBackup ? backupCode.trim().length !== 8 : code.some((d) => !d))
              }
              className="w-full bg-gradient-to-r from-[var(--rw-blue)] to-[var(--rw-green)] text-white py-3 px-4 rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--rw-blue)] focus:ring-offset-2 disabled:opacity-50 transition-all shadow-lg font-semibold"
            >
              {isLoading ? t('auth.verifying') : t('auth.verify_code')}
            </button>
          </form>
        </div>

        <div className="px-8 py-4 bg-gray-50 border-t border-gray-200">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-600">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('auth.back_to_login')}
          </Button>
        </div>
      </div>
    </div>
  );
}
