'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Key, AlertCircle, ArrowLeft } from 'lucide-react';
import { authApi, ApiError, getErrorMessage, LoginResponse } from '../lib/api';

interface TwoFAVerifyProps {
  tempToken: string;
  username: string;
  onSuccess: (response: LoginResponse) => void;
  onBack: () => void;
}

const TwoFAVerify: React.FC<TwoFAVerifyProps> = ({ tempToken, username, onSuccess, onBack }) => {
  const [totpCode, setTotpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);

  const kenyaGreen = '#006600';
  const kenyaRed = '#BB0000';

  useEffect(() => {
    // Auto-submit when 6 digits are entered for TOTP
    if (!useBackupCode && totpCode.length === 6) {
      handleVerify2FA();
    }
  }, [totpCode, useBackupCode]);

  const handleVerify2FA = async () => {
    if ((!useBackupCode && totpCode.length !== 6) || (useBackupCode && totpCode.length !== 8)) {
      setError(`Please enter a valid ${useBackupCode ? '8-character backup code' : '6-digit TOTP code'}`);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await authApi.verify2FA({
        temp_token: tempToken,
        totp_code: totpCode,
      });
      
      onSuccess(response);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleVerify2FA();
  };

  const toggleCodeType = () => {
    setUseBackupCode(!useBackupCode);
    setTotpCode('');
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="section-padding py-12 w-full">
        <div className="max-w-md mx-auto">
          <div className="card-glass">
            <div className="flex items-center mb-6">
              <Shield className="w-8 h-8 mr-3" style={{ color: kenyaGreen }} />
              <div>
                <h1 className="text-xl font-bold">Two-Factor Authentication</h1>
                <p className="text-sm text-gray-600">User: {username}</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                {useBackupCode 
                  ? 'Enter one of your backup codes to complete login.'
                  : 'Open your authenticator app and enter the 6-digit code to complete login.'
                }
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                  <Key className="inline w-4 h-4 mr-1" />
                  {useBackupCode ? 'Backup Code' : 'Authentication Code'}
                </label>
                <input
                  type="text"
                  id="code"
                  value={totpCode}
                  onChange={(e) => {
                    const value = useBackupCode 
                      ? e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase()
                      : e.target.value.replace(/\D/g, '').slice(0, 6);
                    setTotpCode(value);
                  }}
                  placeholder={useBackupCode ? 'ABCD1234' : '000000'}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-center text-2xl font-mono tracking-widest"
                  maxLength={useBackupCode ? 8 : 6}
                  required
                  autoComplete="off"
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="p-4 rounded-lg border" style={{ backgroundColor: `${kenyaRed}10`, borderColor: `${kenyaRed}30` }}>
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" style={{ color: kenyaRed }} />
                    <p className="text-sm" style={{ color: kenyaRed }}>{error}</p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <button
                  type="submit"
                  disabled={isLoading || (!useBackupCode && totpCode.length !== 6) || (useBackupCode && totpCode.length !== 8)}
                  className="w-full btn-kenya px-6 py-3 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Shield className="w-5 h-5 mr-2" />
                      Verify & Sign In
                    </>
                  )}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={toggleCodeType}
                    className="text-sm text-gray-600 hover:text-gray-800 underline"
                    disabled={isLoading}
                  >
                    {useBackupCode 
                      ? 'Use authenticator app instead'
                      : 'Use backup code instead'
                    }
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onBack}
                  className="w-full px-6 py-3 font-semibold glass hover:bg-white/20 rounded-lg transition-all duration-300 flex items-center justify-center"
                  disabled={isLoading}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </button>
              </div>
            </form>

            <div className="mt-6 p-4 rounded-lg border" style={{ backgroundColor: `${kenyaGreen}10`, borderColor: `${kenyaGreen}30` }}>
              <p className="text-xs text-gray-600">
                <strong>Security Notice:</strong> Your login attempt is being monitored for security purposes.
                This session will expire in 5 minutes if not completed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TwoFAVerify;
