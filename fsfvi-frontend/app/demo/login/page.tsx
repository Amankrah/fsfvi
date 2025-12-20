'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LoginForm, TwoFactorForm } from '@/components/demo';
import { ArrowLeft } from 'lucide-react';

export default function DemoLoginPage() {
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex flex-col">
      <div className="container mx-auto px-4 py-6">
        <Link href="/" className="inline-flex items-center text-sm text-gray-600 hover:text-blue-600 transition-colors font-medium">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        {showTwoFactor ? (
          <TwoFactorForm
            tempToken={tempToken}
            username={username}
            onBack={handleBack}
          />
        ) : (
          <LoginForm onTwoFactorRequired={handleTwoFactorRequired} />
        )}
      </div>

      <div className="container mx-auto px-4 py-6 text-center">
        <p className="text-xs text-gray-500">
          &copy; 2025 Food Systems Financial Intelligence Platform
        </p>
      </div>
    </div>
  );
}
