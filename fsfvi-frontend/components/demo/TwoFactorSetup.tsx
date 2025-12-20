'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { demoTwoFaAPI } from '@/lib/demoAuthApi';
import type { TwoFASetupResponse } from '@/lib/types/demoAuth';

interface TwoFactorSetupProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function TwoFactorSetup({ onSuccess, onCancel }: TwoFactorSetupProps) {
  const [step, setStep] = useState<'initial' | 'setup' | 'verify'>('initial');
  const [setupData, setSetupData] = useState<TwoFASetupResponse | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleStartSetup = async () => {
    setError('');
    setIsLoading(true);

    try {
      const response = await demoTwoFaAPI.prepareSetup();
      setSetupData(response);
      setStep('setup');
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to prepare 2FA setup'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!setupData) {
      setError('Setup data is missing');
      setIsLoading(false);
      return;
    }

    try {
      const response = await demoTwoFaAPI.completeSetup(
        code,
        setupData.secret,
        setupData.backup_codes
      );
      setSuccess('Two-factor authentication enabled successfully!');
      setStep('verify');

      // Call onSuccess immediately to trigger page reload
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Invalid verification code'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
  };

  if (step === 'initial') {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Enable Two-Factor Authentication
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <p className="text-gray-700">
            Two-factor authentication (2FA) adds an extra layer of security to your account.
            You'll need an authenticator app like Google Authenticator or Authy.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-sm text-blue-800 font-medium mb-2">What you'll need:</p>
            <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
              <li>A smartphone with an authenticator app installed</li>
              <li>Ability to scan a QR code</li>
              <li>A few minutes to complete setup</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleStartSetup}
              disabled={isLoading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Setting up...' : 'Enable 2FA'}
            </button>
            {onCancel && (
              <button
                onClick={onCancel}
                disabled={isLoading}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'setup' && setupData) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Scan QR Code
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="text-center">
            <p className="text-gray-700 mb-4">
              Scan this QR code with your authenticator app:
            </p>
            <div className="inline-block bg-white p-6 border-2 border-gray-200 rounded-lg shadow-md">
              <QRCodeSVG
                value={setupData.otpauth_url}
                size={200}
                level="H"
              />
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
            <p className="text-sm text-gray-700 font-medium mb-2">Or enter this code manually:</p>
            <div className="flex gap-2">
              <code className="flex-1 text-sm bg-gray-100 px-3 py-2 rounded border border-gray-300 font-mono text-center text-gray-900">
                {setupData.secret}
              </code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(setupData.secret);
                  alert('Secret key copied to clipboard!');
                }}
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm"
              >
                Copy
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              In your authenticator app, select "Enter a setup key" and paste this code.
              <br />
              Account name: <span className="font-mono text-gray-900">demo_government</span>
              <br />
              Type: Time-based
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <p className="text-sm text-yellow-800 font-medium mb-2">Backup Codes:</p>
            <p className="text-xs text-yellow-700 mb-2">
              Save these backup codes in a safe place. You can use them to access your account
              if you lose access to your authenticator app.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {setupData.backup_codes.map((backupCode, idx) => (
                <code key={idx} className="text-xs bg-yellow-100 px-2 py-1 rounded border border-yellow-300 font-mono text-gray-900 font-semibold">
                  {backupCode}
                </code>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                const text = setupData.backup_codes.join('\n');
                const blob = new Blob([text], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'fsfvi-2fa-backup-codes.txt';
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="mt-3 w-full bg-yellow-600 text-white py-2 px-4 rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-colors text-sm font-medium"
            >
              Download Backup Codes
            </button>
          </div>

          <form onSubmit={handleVerifySetup} className="space-y-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                Enter Verification Code
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                value={code}
                onChange={handleCodeChange}
                required
                minLength={6}
                maxLength={6}
                className="w-full px-3 py-2 text-center text-2xl tracking-widest border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-gray-900"
                placeholder="000000"
                disabled={isLoading}
                autoComplete="off"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the 6-digit code shown in your authenticator app
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || code.length !== 6}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Verifying...' : 'Verify and Enable 2FA'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (step === 'verify') {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            2FA Enabled Successfully!
          </h2>
          <p className="text-gray-600">
            Your account is now protected with two-factor authentication.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
