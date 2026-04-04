'use client';

import { useState } from 'react';
import { RwandaLoginForm } from '@/components/rwanda/auth/RwandaLoginForm';
import { TwoFactorForm } from '@/components/rwanda/auth/TwoFactorForm';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LoginPage() {
  const { t } = useLanguage();
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [username, setUsername] = useState('');

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
    <div className="min-h-screen bg-gradient-to-br from-[var(--rw-blue)]/5 via-[var(--rw-green)]/5 to-gray-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4">
        {showTwoFactor ? (
          <TwoFactorForm tempToken={tempToken} username={username} onBack={handleBack} />
        ) : (
          <RwandaLoginForm onTwoFactorRequired={handleTwoFactorRequired} />
        )}
      </div>
      <div className="text-center py-4">
        <p className="text-xs text-gray-500">
          &copy; {new Date().getFullYear()} {t('app.platform_name')}. {t('app.ministry')}.
        </p>
      </div>
    </div>
  );
}
