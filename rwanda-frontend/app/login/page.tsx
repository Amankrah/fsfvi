'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { RwandaLoginForm } from '@/components/rwanda/auth/RwandaLoginForm';
import { TwoFactorForm } from '@/components/rwanda/auth/TwoFactorForm';
import { AuthShell } from '@/components/rwanda/auth/AuthShell';
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
    <AuthShell>
      {showTwoFactor ? (
        <TwoFactorForm tempToken={tempToken} username={username} onBack={handleBack} />
      ) : (
        <RwandaLoginForm onTwoFactorRequired={handleTwoFactorRequired} sessionNotice={sessionNotice} />
      )}
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white text-sm text-slate-600">Loading…</div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
