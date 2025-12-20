'use client';

import { useState } from 'react';
import { useDemoAuth } from '@/hooks/useDemoAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  User,
  Shield,
  Key,
  LogOut,
  Clock,
  CheckCircle,
  AlertCircle,
  Lock,
  Settings,
} from 'lucide-react';
import { PasswordChangeForm } from './PasswordChangeForm';
import { TwoFactorSetup } from './TwoFactorSetup';
import { TwoFactorManage } from './TwoFactorManage';

interface DemoDashboardProps {
  children?: React.ReactNode;
}

export function DemoDashboard({ children }: DemoDashboardProps) {
  const { user, isLoading, logout } = useDemoAuth(true);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);
  const [showTwoFactorManage, setShowTwoFactorManage] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-2 rounded-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Demo Government Portal</h1>
                <p className="text-sm text-gray-600">Food Security & Vulnerability Index Dashboard</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium text-gray-900">{user.username}</p>
                <div className="flex items-center space-x-2 text-xs text-gray-600">
                  {user.two_fa_enabled ? (
                    <>
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>2FA Enabled</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3 w-3 text-amber-600" />
                      <span>2FA Disabled</span>
                    </>
                  )}
                </div>
              </div>
              <Button
                onClick={logout}
                variant="outline"
                size="sm"
                className="text-gray-700 hover:text-red-600 hover:border-red-600"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - User Profile & Settings */}
          <div className="lg:col-span-1 space-y-6">
            {/* User Profile Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <User className="h-5 w-5 mr-2 text-blue-600" />
                  Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs text-gray-600 font-medium">Username</label>
                  <p className="text-sm font-semibold text-gray-900">{user.username}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-600 font-medium">User ID</label>
                  <p className="text-xs text-gray-700 font-mono">{user.id}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-600 font-medium">Role</label>
                  <div className="mt-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Demo Government
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-600 font-medium">Last Login</label>
                  <p className="text-sm text-gray-700 flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {user.last_login
                      ? new Date(user.last_login).toLocaleString()
                      : 'Never'}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-600 font-medium">Account Status</label>
                  <div className="mt-1">
                    {user.is_locked ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <Lock className="h-3 w-3 mr-1" />
                        Locked
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Settings Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Settings className="h-5 w-5 mr-2 text-gray-600" />
                  Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {user.is_temporary_password && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <div className="flex items-center text-amber-800 mb-2">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      <span className="text-sm font-medium">Temporary Password</span>
                    </div>
                    <p className="text-xs text-amber-700">
                      Please change your password for security.
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-xs text-gray-600 font-medium">Two-Factor Authentication</label>
                  <div className="mt-2">
                    {user.two_fa_enabled ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-green-600">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          <span className="text-sm font-medium">Enabled</span>
                        </div>
                        <Button
                          onClick={() => setShowTwoFactorManage(true)}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                        >
                          Manage
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center text-amber-600 mb-2">
                          <AlertCircle className="h-4 w-4 mr-2" />
                          <span className="text-sm font-medium">Disabled</span>
                        </div>
                        <Button
                          onClick={() => setShowTwoFactorSetup(true)}
                          size="sm"
                          className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                          <Key className="h-4 w-4 mr-2" />
                          Enable 2FA
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t">
                  <Button
                    onClick={() => setShowPasswordChange(true)}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Change Password
                  </Button>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <p>Login Attempts: {user.login_attempts}/5</p>
                  {user.lockout_expiry && (
                    <p className="text-red-600">
                      Locked until: {new Date(user.lockout_expiry).toLocaleString()}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {showPasswordChange ? (
              <PasswordChangeForm
                onSuccess={() => setShowPasswordChange(false)}
                onCancel={() => setShowPasswordChange(false)}
              />
            ) : showTwoFactorSetup ? (
              <TwoFactorSetup
                onSuccess={() => {
                  setShowTwoFactorSetup(false);
                  window.location.reload();
                }}
                onCancel={() => setShowTwoFactorSetup(false)}
              />
            ) : showTwoFactorManage ? (
              <TwoFactorManage
                onSuccess={() => {
                  setShowTwoFactorManage(false);
                  window.location.reload();
                }}
                onCancel={() => setShowTwoFactorManage(false)}
              />
            ) : (
              children
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
