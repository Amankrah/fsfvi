'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { RwandaLoginForm } from '@/components/rwanda/auth/RwandaLoginForm';
import { TwoFactorForm } from '@/components/rwanda/auth/TwoFactorForm';
import { useLanguage } from '@/contexts/LanguageContext';
import { isLoginSessionExpiredReason } from '@/lib/api/authSession';

function LoginPageContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [username, setUsername] = useState('');

  const reason = searchParams.get('reason');
  const sessionNotice = isLoginSessionExpiredReason(reason) ? t('auth.session_expired_notice') : undefined;

  const handleTwoFactorRequired = (token: string, user: string) => {
    setTempToken(token);
    setUsername(user);
    setShowTwoFactor(true);
  };

  const handleBack = () => {
    setShowTwoFactor(false);
    setTempToken('');
    setUsername('');
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[var(--rw-blue)]/5 via-[var(--rw-green)]/5 to-gray-50">
      <div className="flex flex-1 items-center justify-center px-4">
        {showTwoFactor ? (
          <TwoFactorForm tempToken={tempToken} username={username} onBack={handleBack} />
        ) : (
          <RwandaLoginForm onTwoFactorRequired={handleTwoFactorRequired} sessionNotice={sessionNotice} />
        )}
      </div>
      <div className="py-4 text-center">
        <p className="text-xs text-gray-500">
          &copy; {new Date().getFullYear()} {t('app.platform_name')}. {t('app.ministry')}.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[var(--rw-blue)]/5 via-[var(--rw-green)]/5 to-gray-50 text-sm text-slate-600">
          Loading…
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
