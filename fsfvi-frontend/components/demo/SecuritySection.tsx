'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDemoAuth } from '@/hooks/useDemoAuth';
import {
  Shield,
  Key,
  Lock,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { PasswordChangeForm } from './PasswordChangeForm';
import { TwoFactorSetup } from './TwoFactorSetup';
import { TwoFactorManage } from './TwoFactorManage';

export function SecuritySection() {
  const { user } = useDemoAuth(true);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);
  const [showTwoFactorManage, setShowTwoFactorManage] = useState(false);

  if (!user) return null;

  // If showing a form, display only that form
  if (showPasswordChange) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Change Password</h1>
          <Button
            onClick={() => setShowPasswordChange(false)}
            variant="outline"
          >
            Back to Security
          </Button>
        </div>
        <PasswordChangeForm
          onSuccess={() => setShowPasswordChange(false)}
          onCancel={() => setShowPasswordChange(false)}
        />
      </div>
    );
  }

  if (showTwoFactorSetup) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Enable Two-Factor Authentication</h1>
          <Button
            onClick={() => setShowTwoFactorSetup(false)}
            variant="outline"
          >
            Back to Security
          </Button>
        </div>
        <TwoFactorSetup
          onSuccess={() => {
            setShowTwoFactorSetup(false);
            window.location.reload();
          }}
          onCancel={() => setShowTwoFactorSetup(false)}
        />
      </div>
    );
  }

  if (showTwoFactorManage) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Manage Two-Factor Authentication</h1>
          <Button
            onClick={() => setShowTwoFactorManage(false)}
            variant="outline"
          >
            Back to Security
          </Button>
        </div>
        <TwoFactorManage
          onSuccess={() => {
            setShowTwoFactorManage(false);
            window.location.reload();
          }}
          onCancel={() => setShowTwoFactorManage(false)}
        />
      </div>
    );
  }

  // Main security dashboard
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Security Settings</h1>
        <p className="text-gray-600 mt-2">
          Manage your password and two-factor authentication
        </p>
      </div>

      {/* Temporary Password Warning */}
      {user.is_temporary_password && (
        <Card className="border-2 border-amber-300 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-6 w-6 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-amber-900 mb-1">
                  Temporary Password Detected
                </p>
                <p className="text-sm text-amber-800 mb-3">
                  You are currently using a temporary password. For security reasons,
                  please change your password immediately.
                </p>
                <Button
                  onClick={() => setShowPasswordChange(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  size="sm"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Change Password Now
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Password Security Card */}
      <Card className="border-2 border-gray-100">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Lock className="h-5 w-5 mr-2 text-gray-600" />
            Password
          </CardTitle>
          <CardDescription>
            Manage your account password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <p className="font-medium text-gray-900 mb-1">
                Password Security
              </p>
              <p className="text-sm text-gray-600">
                {user.is_temporary_password
                  ? 'You are using a temporary password'
                  : 'Last changed: ' + (user.password_changed_at
                      ? new Date(user.password_changed_at).toLocaleDateString()
                      : 'Never')}
              </p>
            </div>
            <Button
              onClick={() => setShowPasswordChange(true)}
              variant="outline"
            >
              <Key className="h-4 w-4 mr-2" />
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication Card */}
      <Card className="border-2 border-gray-100">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2 text-gray-600" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 2FA Status */}
          <div
            className={`p-4 rounded-lg border-2 ${
              user.two_fa_enabled
                ? 'bg-green-50 border-green-200'
                : 'bg-amber-50 border-amber-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                {user.two_fa_enabled ? (
                  <CheckCircle className="h-6 w-6 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-amber-600 mt-0.5" />
                )}
                <div>
                  <p
                    className={`font-semibold ${
                      user.two_fa_enabled ? 'text-green-900' : 'text-amber-900'
                    }`}
                  >
                    {user.two_fa_enabled ? '2FA Enabled' : '2FA Disabled'}
                  </p>
                  <p
                    className={`text-sm mt-1 ${
                      user.two_fa_enabled ? 'text-green-800' : 'text-amber-800'
                    }`}
                  >
                    {user.two_fa_enabled
                      ? `Two-factor authentication is active and protecting your account since ${
                          user.two_fa_enabled_at
                            ? new Date(user.two_fa_enabled_at).toLocaleDateString()
                            : 'unknown'
                        }.`
                      : 'Your account is not protected by two-factor authentication. Enable it now for enhanced security.'}
                  </p>
                </div>
              </div>
              {user.two_fa_enabled ? (
                <Button
                  onClick={() => setShowTwoFactorManage(true)}
                  variant="outline"
                  size="sm"
                >
                  Manage
                </Button>
              ) : (
                <Button
                  onClick={() => setShowTwoFactorSetup(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Enable 2FA
                </Button>
              )}
            </div>
          </div>

          {/* 2FA Information */}
          {!user.two_fa_enabled && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 mb-2">
                Why enable two-factor authentication?
              </p>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Adds an extra layer of security to your account</li>
                <li>Protects against unauthorized access even if password is compromised</li>
                <li>Required for government-level security compliance</li>
                <li>Uses time-based codes from authenticator apps (Google Authenticator, Authy, etc.)</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Best Practices */}
      <Card className="border-2 border-gray-100">
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 text-gray-600" />
            Security Best Practices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-start space-x-3">
              <div className="bg-emerald-100 p-1 rounded">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-sm text-gray-700">
                <strong className="text-gray-900">Use a strong, unique password</strong> with at least 8 characters, including uppercase, lowercase, numbers, and symbols
              </p>
            </li>
            <li className="flex items-start space-x-3">
              <div className="bg-emerald-100 p-1 rounded">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-sm text-gray-700">
                <strong className="text-gray-900">Enable two-factor authentication</strong> to add an extra security layer to your account
              </p>
            </li>
            <li className="flex items-start space-x-3">
              <div className="bg-emerald-100 p-1 rounded">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-sm text-gray-700">
                <strong className="text-gray-900">Never share your password</strong> or 2FA codes with anyone, including IT support
              </p>
            </li>
            <li className="flex items-start space-x-3">
              <div className="bg-emerald-100 p-1 rounded">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-sm text-gray-700">
                <strong className="text-gray-900">Log out when finished</strong>, especially on shared or public computers
              </p>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
