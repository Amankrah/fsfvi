'use client';

import { User, Mail, Briefcase, Shield, Calendar, AlertCircle } from 'lucide-react';
import { useDeveloperAuth } from '@/hooks/useDeveloperAuth';

export default function ProfilePage() {
  const { user } = useDeveloperAuth(true);

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        <p className="mt-2 text-gray-600">
          View your account information and settings
        </p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header Banner */}
        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600"></div>

        {/* Profile Content */}
        <div className="px-6 pb-6">
          {/* Avatar */}
          <div className="-mt-16 mb-4">
            <div className="inline-flex items-center justify-center w-32 h-32 bg-white rounded-full border-4 border-white shadow-lg">
              <div className="w-28 h-28 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                <span className="text-4xl font-bold text-white">
                  {user.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="space-y-6">
            {/* Name and Role */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{user.full_name}</h2>
              <div className="mt-2 flex items-center space-x-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 capitalize">
                  {user.role}
                </span>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${
                    user.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {user.status}
                </span>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Email */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Mail className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700">Email Address</h3>
                </div>
                <p className="text-gray-900 font-medium">{user.email}</p>
              </div>

              {/* Title */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <Briefcase className="h-5 w-5 text-purple-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700">Job Title</h3>
                </div>
                <p className="text-gray-900 font-medium">{user.title}</p>
              </div>

              {/* Government ID */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <Shield className="h-5 w-5 text-green-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700">Government ID</h3>
                </div>
                <p className="text-gray-900 font-mono text-sm">{user.government_id}</p>
              </div>

              {/* User ID */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="bg-indigo-100 p-2 rounded-lg">
                    <User className="h-5 w-5 text-indigo-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700">User ID</h3>
                </div>
                <p className="text-gray-900 font-mono text-sm">{user.id}</p>
              </div>

              {/* Created Date */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="bg-orange-100 p-2 rounded-lg">
                    <Calendar className="h-5 w-5 text-orange-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700">Account Created</h3>
                </div>
                <p className="text-gray-900 font-medium">
                  {new Date(user.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>

              {/* Last Login */}
              {user.last_login && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="bg-teal-100 p-2 rounded-lg">
                      <Calendar className="h-5 w-5 text-teal-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700">Last Login</h3>
                  </div>
                  <p className="text-gray-900 font-medium">
                    {new Date(user.last_login).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Security Settings</h2>

        <div className="space-y-4">
          {/* MFA Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${user.mfa_enabled ? 'bg-green-100' : 'bg-yellow-100'}`}>
                <Shield className={`h-5 w-5 ${user.mfa_enabled ? 'text-green-600' : 'text-yellow-600'}`} />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Multi-Factor Authentication</h3>
                <p className="text-sm text-gray-600">
                  {user.mfa_enabled ? 'Currently enabled' : 'Not enabled'}
                </p>
              </div>
            </div>
            <a
              href="/developer/security"
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              {user.mfa_enabled ? 'Manage' : 'Enable'}
            </a>
          </div>

          {/* Failed Login Attempts */}
          {user.failed_login_attempts > 0 && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-yellow-900">
                    Failed Login Attempts: {user.failed_login_attempts}
                  </p>
                  <p className="mt-1 text-xs text-yellow-800">
                    Your account will be locked after 5 failed attempts. Current count will reset upon successful login.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Account Locked */}
          {user.locked_until && new Date(user.locked_until) > new Date() && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-900">
                    Account Temporarily Locked
                  </p>
                  <p className="mt-1 text-xs text-red-800">
                    Your account is locked until {new Date(user.locked_until).toLocaleString()} due to multiple failed login attempts.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* API Key Expiry */}
          {user.api_key_expiry_days && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900">
                    API Key Expiration Policy
                  </p>
                  <p className="mt-1 text-xs text-blue-800">
                    Your API keys expire after {user.api_key_expiry_days} days. This policy is set by your government administrator.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Account Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <AlertCircle className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900">
              Profile Management
            </h3>
            <p className="mt-2 text-xs text-blue-800">
              Your profile information is managed by your government administrator.
              If you need to update your name, title, or email address, please contact your administrator.
              You can manage your password and security settings from the Security page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
