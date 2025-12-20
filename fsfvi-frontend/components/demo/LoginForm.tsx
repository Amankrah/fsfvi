'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { demoAuthAPI } from '@/lib/demoAuthApi';
import type { LoginResponse } from '@/lib/types/demoAuth';
import {
  Shield,
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';

interface LoginFormProps {
  onTwoFactorRequired?: (tempToken: string, username: string) => void;
}

export function LoginForm({ onTwoFactorRequired }: LoginFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response: LoginResponse = await demoAuthAPI.login(username, password);

      if (response.requires_two_fa && response.two_fa_temp_token) {
        // 2FA is required
        if (onTwoFactorRequired) {
          onTwoFactorRequired(response.two_fa_temp_token, username);
        }
      } else {
        // Successful login - check if password change is required
        if (response.user.is_temporary_password) {
          // Redirect to password change page
          router.push('/demo/change-password');
        } else {
          // Go to dashboard
          router.push('/demo/dashboard');
        }
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Invalid username or password'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Header with Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl shadow-lg mb-4">
          <Shield className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Demo Government Portal
        </h1>
        <p className="text-gray-600">
          Sign in to access the FSFVI Dashboard
        </p>
      </div>

      {/* Login Card */}
      <div className="bg-white shadow-xl rounded-2xl border-2 border-gray-100 overflow-hidden">
        {/* Card Header */}
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 px-8 py-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Lock className="h-5 w-5 mr-2 text-blue-600" />
            Secure Authentication
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Enter your credentials to continue
          </p>
        </div>

        {/* Card Body */}
        <div className="p-8">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg animate-shake">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-900">Authentication Failed</p>
                  <p className="text-sm text-red-800 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-2">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
                  maxLength={50}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                  placeholder="Enter your username"
                  disabled={isLoading}
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full pl-10 pr-12 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                  placeholder="Enter your password"
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={isLoading}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !username || !password}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl font-semibold flex items-center justify-center group"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Card Footer */}
        <div className="px-8 py-6 bg-gray-50 border-t border-gray-200">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-gray-900 mb-1">
                Secure Government Authentication System
              </p>
              <p className="text-xs text-gray-600">
                This system is for authorized personnel only. Unauthorized access is prohibited and
                will be prosecuted to the fullest extent of the law. All activity is monitored and logged.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="mt-6 text-center">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900 mb-2">
            <strong>Need help accessing your account?</strong>
          </p>
          <p className="text-xs text-blue-800">
            Contact your system administrator or IT support for assistance with login issues,
            password resets, or account access.
          </p>
        </div>
      </div>

      {/* Demo Credentials (for testing only) */}
      <div className="mt-4 text-center">
        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer hover:text-gray-700 font-medium">
            Demo Credentials (Testing Only)
          </summary>
          <div className="mt-3 bg-gray-100 border border-gray-300 rounded-lg p-3 text-left space-y-2">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span className="font-mono text-xs">
                <strong>Username:</strong> demo_admin
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span className="font-mono text-xs">
                <strong>Password:</strong> Demo@2024
              </span>
            </div>
            <p className="text-xs text-gray-600 pt-2 border-t border-gray-300">
              Use these credentials to test the authentication system. In production, these would not be visible.
            </p>
          </div>
        </details>
      </div>
    </div>
  );
}
