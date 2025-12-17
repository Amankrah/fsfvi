'use client';

import { useState } from 'react';
import { Shield, CheckCircle, XCircle, AlertCircle, Download, Copy, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useDeveloperAuth } from '@/hooks/useDeveloperAuth';
import { developerMfaAPI } from '@/lib/developerApi';
import type { SetupMfaResponse } from '@/lib/types/developer';

export default function SecurityPage() {
  const { user } = useDeveloperAuth(true);
  const [isSettingUpMfa, setIsSettingUpMfa] = useState(false);
  const [mfaSetup, setMfaSetup] = useState<SetupMfaResponse | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [isDisabling, setIsDisabling] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false);

  const handleSetupMfa = async () => {
    setError('');
    setIsSettingUpMfa(true);

    try {
      const response = await developerMfaAPI.setupMfa();
      if (response.success) {
        setMfaSetup(response.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to setup MFA');
    } finally {
      setIsSettingUpMfa(false);
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsVerifying(true);

    try {
      const response = await developerMfaAPI.verifyMfaSetup({ code: verifyCode });
      if (response.success) {
        setSuccess('MFA enabled successfully! Your account is now more secure.');
        setMfaSetup(null);
        setVerifyCode('');
        // Refresh page after 2 seconds
        setTimeout(() => window.location.reload(), 2000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid verification code');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisableMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsDisabling(true);

    try {
      const response = await developerMfaAPI.disableMfa({ code: disableCode });
      if (response.success) {
        setSuccess('MFA disabled successfully');
        setShowDisableModal(false);
        setDisableCode('');
        // Refresh page after 2 seconds
        setTimeout(() => window.location.reload(), 2000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid verification code');
    } finally {
      setIsDisabling(false);
    }
  };

  const handleCopySecret = () => {
    if (mfaSetup) {
      navigator.clipboard.writeText(mfaSetup.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const handleCopyBackupCodes = () => {
    if (mfaSetup) {
      navigator.clipboard.writeText(mfaSetup.backup_codes.join('\n'));
      setCopiedBackupCodes(true);
      setTimeout(() => setCopiedBackupCodes(false), 2000);
    }
  };

  const handleDownloadBackupCodes = () => {
    if (mfaSetup) {
      const content = `FSFVI Developer Portal - MFA Backup Codes\n` +
        `Generated: ${new Date().toLocaleString()}\n` +
        `User: ${user?.email}\n\n` +
        `IMPORTANT: Store these codes securely. Each code can only be used once.\n\n` +
        mfaSetup.backup_codes.map((code, i) => `${i + 1}. ${code}`).join('\n');

      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fsfvi-backup-codes-${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Security Settings</h1>
        <p className="mt-2 text-gray-600">
          Manage your account security and two-factor authentication
        </p>
      </div>

      {/* Success Alert */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800 font-medium">{success}</p>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* MFA Status Card */}
      {!mfaSetup && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className={`p-3 rounded-lg ${user?.mfa_enabled ? 'bg-green-100' : 'bg-yellow-100'}`}>
                <Shield className={`h-6 w-6 ${user?.mfa_enabled ? 'text-green-600' : 'text-yellow-600'}`} />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900">
                  Multi-Factor Authentication (MFA)
                </h2>
                <p className="mt-1 text-gray-600">
                  {user?.mfa_enabled
                    ? 'MFA is enabled on your account. Your account has an extra layer of security.'
                    : 'Add an extra layer of security to your account by enabling MFA.'}
                </p>
                <div className="mt-4">
                  {user?.mfa_enabled ? (
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium text-green-700">
                        MFA is currently enabled
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-700">
                        MFA is not enabled
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {user?.mfa_enabled ? (
              <button
                type="button"
                onClick={() => setShowDisableModal(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
              >
                Disable MFA
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSetupMfa}
                disabled={isSettingUpMfa}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50"
              >
                {isSettingUpMfa ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Setting up...</span>
                  </>
                ) : (
                  <span>Enable MFA</span>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* MFA Setup Flow */}
      {mfaSetup && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-blue-50 border-b border-blue-200">
            <h2 className="text-lg font-semibold text-blue-900">
              Setup Multi-Factor Authentication
            </h2>
          </div>

          <div className="p-6 space-y-6">
            {/* Step 1: Scan QR Code */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Scan QR Code with Authenticator App
                </h3>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <div className="inline-block bg-white p-6 rounded-lg shadow-md">
                  <QRCodeSVG
                    value={mfaSetup.otpauth_url}
                    size={200}
                    level="H"
                  />
                </div>
                <p className="mt-4 text-sm text-gray-600">
                  Scan this QR code with Google Authenticator, Authy, or any compatible authenticator app
                </p>
              </div>
            </div>

            {/* Step 2: Manual Entry */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Or Enter Secret Key Manually
                </h3>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <label htmlFor="mfa-secret" className="block text-sm font-medium text-gray-700 mb-2">
                  Secret Key
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    id="mfa-secret"
                    type="text"
                    value={mfaSetup.secret}
                    readOnly
                    aria-label="MFA Secret Key"
                    title="Copy this secret key to manually configure your authenticator app"
                    className="flex-1 font-mono text-sm bg-white border border-gray-300 rounded px-3 py-2"
                  />
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    aria-label="Copy secret key"
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                    <span>{copiedSecret ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-600">
                  If you can't scan the QR code, enter this secret key manually in your authenticator app
                </p>
              </div>
            </div>

            {/* Step 3: Backup Codes */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Save Your Backup Codes
                </h3>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-900">
                      Important: Save These Backup Codes
                    </p>
                    <p className="mt-1 text-xs text-red-800">
                      Store these codes securely. Each code can only be used once. You'll need them if you lose access to your authenticator app.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {mfaSetup.backup_codes.map((code, index) => (
                    <div key={index} className="font-mono text-sm bg-white border border-gray-300 rounded px-3 py-2">
                      {code}
                    </div>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={handleCopyBackupCodes}
                    aria-label="Copy backup codes"
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                    <span>{copiedBackupCodes ? 'Copied!' : 'Copy Codes'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadBackupCodes}
                    aria-label="Download backup codes"
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Step 4: Verify */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  4
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Verify Setup
                </h3>
              </div>

              <form onSubmit={handleVerifyMfa} className="space-y-4">
                <div>
                  <label htmlFor="verify-code" className="block text-sm font-medium text-gray-700 mb-2">
                    Enter 6-digit code from your authenticator app
                  </label>
                  <input
                    id="verify-code"
                    type="text"
                    required
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-center text-2xl tracking-widest"
                    maxLength={6}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isVerifying || verifyCode.length !== 6}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Verify and Enable MFA</span>
                  )}
                </button>
              </form>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">
                Instructions
              </h4>
              <div className="text-xs text-blue-800 space-y-1">
                {mfaSetup.instructions.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Best Practices */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Security Best Practices
        </h2>
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                Enable Multi-Factor Authentication
              </p>
              <p className="text-xs text-gray-600">
                Add an extra layer of security to protect your account from unauthorized access
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                Store Backup Codes Securely
              </p>
              <p className="text-xs text-gray-600">
                Keep your backup codes in a secure location separate from your authenticator app
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                Never Share Your API Keys
              </p>
              <p className="text-xs text-gray-600">
                API keys are tied to your account. Never share them or commit them to version control
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                Monitor Your Account Activity
              </p>
              <p className="text-xs text-gray-600">
                Regularly check your API key usage and revoke any unused or compromised keys
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Disable MFA Modal */}
      {showDisableModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Disable MFA</h2>
            </div>

            <form onSubmit={handleDisableMfa} className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-900">Warning</p>
                    <p className="mt-1 text-xs text-red-800">
                      Disabling MFA will make your account less secure. We strongly recommend keeping MFA enabled.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="disable-code" className="block text-sm font-medium text-gray-700 mb-2">
                  Enter 6-digit code from your authenticator app to confirm
                </label>
                <input
                  id="disable-code"
                  type="text"
                  required
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-center text-2xl tracking-widest"
                  maxLength={6}
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowDisableModal(false);
                    setDisableCode('');
                    setError('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDisabling || disableCode.length !== 6}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDisabling ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Disabling...</span>
                    </>
                  ) : (
                    <span>Disable MFA</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
