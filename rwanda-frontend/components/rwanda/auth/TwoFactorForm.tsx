'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api/authApi';
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
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
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
    const fullCode = code.join('');
    if (fullCode.length !== 6) return;

    setError('');
    setIsLoading(true);

    try {
      const response = await authAPI.verify2FA({
        temp_token: tempToken,
        code: fullCode,
      });
      if (response.user.is_temporary_password) {
        router.push('/change-password');
      } else {
        router.push('/dashboard');
      }
    } catch {
      setError('Invalid verification code. Please try again.');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
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
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Two-Factor Authentication</h1>
        <p className="text-sm text-gray-600">Enter the 6-digit code from your authenticator app</p>
      </div>

      <div className="bg-white shadow-xl rounded-2xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-[var(--rw-blue)]/10 to-[var(--rw-green)]/10 px-8 py-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Shield className="h-5 w-5 mr-2 text-[var(--rw-blue)]" />
            Verify Identity
          </h2>
          <p className="text-sm text-gray-600 mt-1">Signing in as <strong>{username}</strong></p>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-center gap-2">
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="w-12 h-14 text-center text-xl font-bold border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--rw-blue)] focus:border-transparent"
                  disabled={isLoading}
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={isLoading || code.some((d) => !d)}
              className="w-full bg-gradient-to-r from-[var(--rw-blue)] to-[var(--rw-green)] text-white py-3 px-4 rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--rw-blue)] focus:ring-offset-2 disabled:opacity-50 transition-all shadow-lg font-semibold"
            >
              {isLoading ? 'Verifying...' : 'Verify Code'}
            </button>
          </form>
        </div>

        <div className="px-8 py-4 bg-gray-50 border-t border-gray-200">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-600">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to login
          </Button>
        </div>
      </div>
    </div>
  );
}
