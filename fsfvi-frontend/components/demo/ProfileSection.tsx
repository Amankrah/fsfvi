'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDemoAuth } from '@/hooks/useDemoAuth';
import {
  User,
  Mail,
  Calendar,
  Clock,
  CheckCircle,
  Lock,
  Shield,
  Key,
} from 'lucide-react';

export function ProfileSection() {
  const { user } = useDemoAuth(true);

  if (!user) return null;

  const profileFields = [
    {
      icon: User,
      label: 'Username',
      value: user.username,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      icon: Key,
      label: 'User ID',
      value: user.id,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      mono: true,
    },
    {
      icon: Shield,
      label: 'Role',
      value: 'Demo Government',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      badge: true,
    },
    {
      icon: Clock,
      label: 'Last Login',
      value: user.last_login
        ? new Date(user.last_login).toLocaleString('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })
        : 'Never',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-600 mt-2">
          View your account information and security status
        </p>
      </div>

      {/* Profile Card */}
      <Card className="border-2 border-gray-100">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-4 rounded-xl shadow-lg">
              <User className="h-8 w-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl">{user.username}</CardTitle>
              <CardDescription className="text-base mt-1">
                Demo Government Official Account
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {profileFields.map((field, index) => {
              const Icon = field.icon;
              return (
                <div
                  key={index}
                  className="group p-4 rounded-lg border-2 border-gray-100 hover:border-blue-200 hover:shadow-md transition-all"
                >
                  <div className="flex items-start space-x-3">
                    <div className={`${field.bgColor} p-2 rounded-lg`}>
                      <Icon className={`h-5 w-5 ${field.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-600 mb-1">
                        {field.label}
                      </p>
                      {field.badge ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {field.value}
                        </span>
                      ) : (
                        <p
                          className={`text-base font-semibold text-gray-900 break-all ${
                            field.mono ? 'font-mono text-sm' : ''
                          }`}
                        >
                          {field.value}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Account Status Card */}
      <Card className="border-2 border-gray-100">
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
            Account Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Account Active */}
            <div className="p-4 rounded-lg bg-green-50 border-2 border-green-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-900">
                  Account Status
                </span>
                {user.is_locked ? (
                  <Lock className="h-4 w-4 text-red-600" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                )}
              </div>
              <p className="text-lg font-bold text-green-900">
                {user.is_locked ? 'Locked' : 'Active'}
              </p>
            </div>

            {/* 2FA Status */}
            <div
              className={`p-4 rounded-lg border-2 ${
                user.two_fa_enabled
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-amber-50 border-amber-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-sm font-medium ${
                    user.two_fa_enabled ? 'text-blue-900' : 'text-amber-900'
                  }`}
                >
                  Two-Factor Auth
                </span>
                <Shield
                  className={`h-4 w-4 ${
                    user.two_fa_enabled ? 'text-blue-600' : 'text-amber-600'
                  }`}
                />
              </div>
              <p
                className={`text-lg font-bold ${
                  user.two_fa_enabled ? 'text-blue-900' : 'text-amber-900'
                }`}
              >
                {user.two_fa_enabled ? 'Enabled' : 'Disabled'}
              </p>
              {user.two_fa_enabled_at && (
                <p className="text-xs text-blue-700 mt-1">
                  Since {new Date(user.two_fa_enabled_at).toLocaleDateString()}
                </p>
              )}
            </div>

            {/* Login Attempts */}
            <div
              className={`p-4 rounded-lg border-2 ${
                user.login_attempts > 3
                  ? 'bg-red-50 border-red-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-sm font-medium ${
                    user.login_attempts > 3 ? 'text-red-900' : 'text-gray-900'
                  }`}
                >
                  Login Attempts
                </span>
                <Lock
                  className={`h-4 w-4 ${
                    user.login_attempts > 3 ? 'text-red-600' : 'text-gray-600'
                  }`}
                />
              </div>
              <p
                className={`text-lg font-bold ${
                  user.login_attempts > 3 ? 'text-red-900' : 'text-gray-900'
                }`}
              >
                {user.login_attempts} / 5
              </p>
            </div>
          </div>

          {user.lockout_expiry && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">
                <strong>Account Locked:</strong> Account will be unlocked on{' '}
                {new Date(user.lockout_expiry).toLocaleString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Notice */}
      <Card className="border-2 border-blue-100 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900 mb-1">
                Government Security Notice
              </p>
              <p className="text-sm text-blue-800">
                This is a government account with restricted access. All activity is logged and monitored.
                To update your security settings or manage two-factor authentication, please navigate to the
                Security section.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
