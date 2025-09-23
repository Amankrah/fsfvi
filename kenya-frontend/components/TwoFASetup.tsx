'use client';

import React, { useState, useEffect } from 'react';
import { Shield, QrCode, Key, Save, AlertCircle, CheckCircle, Copy, Eye, EyeOff } from 'lucide-react';
import { authApi, TwoFASetupResponse, ApiError, getErrorMessage } from '../lib/api';

interface TwoFASetupProps {
  onSuccess: (data: TwoFASetupResponse) => void;
  onCancel: () => void;
}

const TwoFASetup: React.FC<TwoFASetupProps> = ({ onSuccess, onCancel }) => {
  const [totpCode, setTotpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSetup, setIsLoadingSetup] = useState(true);
  const [error, setError] = useState('');
  const [preparedData, setPreparedData] = useState<TwoFASetupResponse | null>(null);
  const [setupData, setSetupData] = useState<TwoFASetupResponse | null>(null);
  const [backupCodesVisible, setBackupCodesVisible] = useState(false);
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false);

  const kenyaGreen = '#006600';
  const kenyaRed = '#BB0000';

  // Load QR code and setup data on component mount
  useEffect(() => {
    const prepareSetup = async () => {
      try {
        setIsLoadingSetup(true);
        setError('');
        const response = await authApi.prepare2FA();
        setPreparedData(response);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError(getErrorMessage(err));
        }
      } finally {
        setIsLoadingSetup(false);
      }
    };

    prepareSetup();
  }, []);

  const handleSetup2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (totpCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await authApi.setup2FA({ totp_code: totpCode });
      setSetupData(response);
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

  const copyBackupCodes = () => {
    if (setupData) {
      const codesText = setupData.backup_codes.join('\n');
      navigator.clipboard.writeText(codesText).then(() => {
        setCopiedBackupCodes(true);
        setTimeout(() => setCopiedBackupCodes(false), 2000);
      });
    }
  };

  const downloadBackupCodes = () => {
    if (setupData) {
      const codesText = setupData.backup_codes.join('\n');
      const blob = new Blob([codesText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'kenya-fsfvi-backup-codes.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="min-h-screen pt-16">
      <div className="section-padding py-12">
        <div className="max-w-2xl mx-auto">
          <div className="card-glass">
            <div className="flex items-center mb-6">
              <Shield className="w-8 h-8 mr-3" style={{ color: kenyaGreen }} />
              <h1 className="text-2xl font-bold">Enable Two-Factor Authentication</h1>
            </div>

            {!setupData ? (
              <>
                <div className="mb-6">
                  <p className="text-gray-700 mb-4">
                    Two-factor authentication adds an extra layer of security to your government account.
                    Follow these steps to set it up:
                  </p>
                  
                  <ol className="list-decimal list-inside space-y-3 text-gray-700">
                    <li>Install an authenticator app (Google Authenticator, Authy, etc.)</li>
                    <li>Scan the QR code below or manually enter the secret</li>
                    <li>Enter the 6-digit code from your authenticator app</li>
                    <li>Save your backup codes in a secure location</li>
                  </ol>
                </div>

                {/* QR Code Section */}
                {isLoadingSetup ? (
                  <div className="mb-6 p-8 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: kenyaGreen }}></div>
                    <p className="text-gray-600">Generating QR code...</p>
                  </div>
                ) : preparedData ? (
                  <div className="mb-6 p-6 bg-white rounded-lg border-2 border-gray-200 shadow-sm">
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-4">
                        <QrCode className="w-6 h-6 mr-2" style={{ color: kenyaGreen }} />
                        <h3 className="text-lg font-semibold">Scan QR Code</h3>
                      </div>
                      
                      {/* QR Code Image */}
                      <div className="mb-6 flex justify-center p-4 bg-gray-50 rounded-lg">
                        <img 
                          src={preparedData.qr_code} 
                          alt="2FA QR Code" 
                          className="border-2 border-white rounded-lg shadow-lg max-w-full h-auto"
                          style={{ width: '280px', height: '280px' }}
                        />
                      </div>

                      {/* Manual entry option */}
                      <div className="text-sm text-gray-600">
                        <p className="mb-2 font-medium">Can't scan? Enter this code manually:</p>
                        <div className="bg-gray-100 p-4 rounded-lg font-mono text-sm break-all border border-gray-300 select-all">
                          {preparedData.secret}
                        </div>
                        <p className="mt-2 text-xs text-gray-500">
                          Tip: You can click to select all text for easy copying
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="mb-6 p-4 rounded-lg border" style={{ backgroundColor: `${kenyaRed}10`, borderColor: `${kenyaRed}30` }}>
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 mr-2 mt-0.5" style={{ color: kenyaRed }} />
                    <div>
                      <p className="text-sm font-medium" style={{ color: kenyaRed }}>Important Security Notice</p>
                      <p className="text-sm text-gray-700 mt-1">
                        This setup process will generate backup codes that can be used if you lose access to your authenticator device.
                        Store these codes securely - they cannot be recovered if lost.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Only show form if QR code is loaded */}
                {preparedData && (
                  <form onSubmit={handleSetup2FA} className="space-y-6">
                    <div>
                      <label htmlFor="totpCode" className="block text-sm font-medium text-gray-700 mb-2">
                        <Key className="inline w-4 h-4 mr-1" />
                        Enter 6-digit code from authenticator app
                      </label>
                      <input
                        type="text"
                        id="totpCode"
                        value={totpCode}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                          setTotpCode(value);
                        }}
                        placeholder="000000"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-center text-2xl font-mono tracking-widest"
                        maxLength={6}
                        required
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

                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      type="submit"
                      disabled={isLoading || totpCode.length !== 6}
                      className="btn-kenya px-6 py-3 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      ) : (
                        <Save className="w-5 h-5 mr-2" />
                      )}
                      {isLoading ? 'Setting up...' : 'Enable 2FA'}
                    </button>
                    
                    <button
                      type="button"
                      onClick={onCancel}
                      className="px-6 py-3 font-semibold glass hover:bg-white/20 rounded-lg transition-all duration-300"
                      disabled={isLoading}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
                )}
              </>
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: kenyaGreen }} />
                  <h2 className="text-xl font-semibold mb-2">2FA Successfully Enabled!</h2>
                  <p className="text-gray-700">Your account is now protected with two-factor authentication.</p>
                </div>

                <div className="p-4 rounded-lg border" style={{ backgroundColor: `${kenyaGreen}10`, borderColor: `${kenyaGreen}30` }}>
                  <h3 className="font-semibold mb-3" style={{ color: kenyaGreen }}>Backup Codes</h3>
                  <p className="text-sm text-gray-700 mb-4">
                    Store these backup codes in a secure location. Each code can only be used once if you lose access to your authenticator device.
                  </p>
                  
                  <div className="relative">
                    <div className={`font-mono text-sm p-3 bg-white rounded border ${backupCodesVisible ? '' : 'filter blur-sm'}`}>
                      {setupData.backup_codes.map((code, index) => (
                        <div key={index} className="mb-1">{code}</div>
                      ))}
                    </div>
                    
                    {!backupCodesVisible && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <button
                          onClick={() => setBackupCodesVisible(true)}
                          className="flex items-center px-4 py-2 bg-white border rounded-lg shadow-sm hover:bg-gray-50"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Click to reveal codes
                        </button>
                      </div>
                    )}
                  </div>

                  {backupCodesVisible && (
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={copyBackupCodes}
                        className="flex items-center px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
                      >
                        {copiedBackupCodes ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-1" style={{ color: kenyaGreen }} />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-1" />
                            Copy
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={downloadBackupCodes}
                        className="flex items-center px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
                      >
                        <Save className="w-4 h-4 mr-1" />
                        Download
                      </button>
                      
                      <button
                        onClick={() => setBackupCodesVisible(false)}
                        className="flex items-center px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
                      >
                        <EyeOff className="w-4 h-4 mr-1" />
                        Hide
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => window.history.back()}
                  className="w-full btn-kenya px-6 py-3"
                >
                  Continue to Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TwoFASetup;
