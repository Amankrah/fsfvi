'use client';

import { useState } from 'react';
import { demoTwoFaAPI } from '@/lib/demoAuthApi';
import { AlertTriangle, Lock, Key } from 'lucide-react';

interface TwoFactorManageProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function TwoFactorManage({ onSuccess, onCancel }: TwoFactorManageProps) {
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await demoTwoFaAPI.disable(
        password,
        useBackupCode ? undefined : totpCode,
        useBackupCode ? totpCode : undefined
      );
      setSuccess('Two-factor authentication has been disabled successfully!');

      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to disable 2FA'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (useBackupCode) {
      // Backup codes are 8 alphanumeric characters
      const value = e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase();
      setTotpCode(value);
    } else {
      // TOTP codes are 6 digits
      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
      setTotpCode(value);
    }
  };

  if (success) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            2FA Disabled Successfully
          </h2>
          <p className="text-gray-600">
            Your account is no longer protected by two-factor authentication.
          </p>
        </div>
      </div>
    );
  }

  if (!showConfirm) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Key className="h-5 w-5 mr-2 text-gray-600" />
          Manage Two-Factor Authentication
        </h2>

        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-6">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-amber-600 mr-3 mt-0.5" />
            <div>
              <p className="text-sm text-amber-800 font-medium mb-1">
                Warning: Disabling 2FA reduces account security
              </p>
              <p className="text-xs text-amber-700">
                Two-factor authentication provides an additional layer of security for your government account.
                Disabling it will make your account more vulnerable to unauthorized access.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-gray-700">
            Currently, you can disable two-factor authentication for your account.
            This action requires your password and a verification code.
          </p>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowConfirm(true)}
              className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
            >
              Disable 2FA
            </button>
            {onCancel && (
              <button
                onClick={onCancel}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Disable Two-Factor Authentication
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleDisable} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Current Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your password"
              disabled={isLoading}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="code" className="block text-sm font-medium text-gray-700">
              {useBackupCode ? 'Backup Code' : 'Verification Code'}
            </label>
            <button
              type="button"
              onClick={() => {
                setUseBackupCode(!useBackupCode);
                setTotpCode('');
              }}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              {useBackupCode ? 'Use authenticator code' : 'Use backup code'}
            </button>
          </div>
          <input
            id="code"
            type="text"
            inputMode={useBackupCode ? 'text' : 'numeric'}
            value={totpCode}
            onChange={handleCodeChange}
            required
            minLength={useBackupCode ? 8 : 6}
            maxLength={useBackupCode ? 8 : 6}
            className="w-full px-3 py-2 text-center text-2xl tracking-widest border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-gray-900"
            placeholder={useBackupCode ? 'ABCD1234' : '000000'}
            disabled={isLoading}
            autoComplete="off"
          />
          <p className="text-xs text-gray-500 mt-1">
            {useBackupCode
              ? 'Enter one of your 8-character backup codes'
              : 'Enter the 6-digit code from your authenticator app'}
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-800 font-medium">
            Are you sure you want to disable 2FA?
          </p>
          <p className="text-xs text-red-700 mt-1">
            This action will reduce the security of your account.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isLoading || password.length === 0 || totpCode.length !== (useBackupCode ? 8 : 6)}
            className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Disabling...' : 'Confirm Disable 2FA'}
          </button>
          <button
            type="button"
            onClick={() => setShowConfirm(false)}
            disabled={isLoading}
            className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
