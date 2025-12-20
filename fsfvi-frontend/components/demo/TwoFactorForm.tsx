'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { demoAuthAPI } from '@/lib/demoAuthApi';
import {
  Shield,
  Key,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
} from 'lucide-react';

interface TwoFactorFormProps {
  tempToken: string;
  username: string;
  onBack?: () => void;
}

export function TwoFactorForm({ tempToken, username, onBack }: TwoFactorFormProps) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await demoAuthAPI.verifyTwoFa(tempToken, code);

      // Give localStorage time to write
      await new Promise(resolve => setTimeout(resolve, 100));

      // Use window.location.href for guaranteed navigation after token storage
      window.location.href = '/demo/dashboard';
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Invalid verification code'
      );
      setIsLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
  };

  return (
    <div className="w-full max-w-md">
      {/* Header with Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl shadow-lg mb-4">
          <Shield className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Two-Factor Authentication
        </h1>
        <p className="text-gray-600">
          Enter the 6-digit code from your authenticator app
        </p>
      </div>

      {/* 2FA Card */}
      <div className="bg-white shadow-xl rounded-2xl border-2 border-gray-100 overflow-hidden">
        {/* Card Header */}
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 px-8 py-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-2 rounded-lg">
                <Key className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Verification Required
                </h2>
                <p className="text-sm text-gray-600">
                  Logged in as: <span className="font-medium text-gray-900">{username}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-8">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg animate-shake">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-900">Verification Failed</p>
                  <p className="text-sm text-red-800 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-900 mb-1">
                  Open your authenticator app
                </p>
                <p className="text-xs text-blue-800">
                  Find the 6-digit code for <span className="font-semibold">Demo Government</span> and enter it below.
                  The code changes every 30 seconds.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Code Input */}
            <div>
              <label htmlFor="code" className="block text-sm font-semibold text-gray-700 mb-2">
                Verification Code
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
                className="w-full px-4 py-4 text-center text-3xl tracking-[0.5em] font-bold border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:cursor-not-allowed font-mono text-gray-900"
                placeholder="000000"
                disabled={isLoading}
                autoComplete="off"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2 text-center">
                Enter the 6-digit code from Google Authenticator, Authy, or similar app
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || code.length !== 6}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl font-semibold flex items-center justify-center group"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  Verifying...
                </>
              ) : (
                <>
                  Verify & Continue
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            {/* Back Button */}
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                disabled={isLoading}
                className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Back to Login
              </button>
            )}
          </form>
        </div>

        {/* Card Footer */}
        <div className="px-8 py-6 bg-gray-50 border-t border-gray-200">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-gray-900 mb-1">
                Lost Access to Authenticator App?
              </p>
              <p className="text-xs text-gray-600">
                Contact your system administrator for assistance. You may be able to use a backup recovery code
                if one was provided during 2FA setup.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="mt-6">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-amber-900 mb-1">
                Security Notice
              </p>
              <p className="text-xs text-amber-800">
                Never share your verification codes with anyone. Government IT support will never ask
                for your 2FA codes. This additional security layer protects sensitive government data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
