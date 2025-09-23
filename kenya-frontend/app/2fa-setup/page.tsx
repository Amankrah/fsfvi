'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import TwoFASetup from '../../components/TwoFASetup';
import { TwoFASetupResponse } from '../../lib/api';

export default function TwoFASetupPage() {
  const router = useRouter();

  const handleSuccess = (data: TwoFASetupResponse) => {
    // You might want to show a success toast or redirect after a delay
    setTimeout(() => {
      router.push('/dashboard');
    }, 2000);
  };

  const handleCancel = () => {
    router.push('/dashboard');
  };

  return (
    <TwoFASetup onSuccess={handleSuccess} onCancel={handleCancel} />
  );
}
