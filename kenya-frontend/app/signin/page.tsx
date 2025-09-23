'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield,
  Eye,
  EyeOff,
  AlertTriangle,
  Lock,
  User,
  Clock,
  XCircle,
  Globe
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import TwoFAVerify from '@/components/TwoFAVerify';
import { LoginResponse } from '@/lib/api';

export default function SignIn() {
  const router = useRouter();
  const { login, isAuthenticated, user } = useAuth();
  const kenyaGreen = '#006600';
  const kenyaRed = '#BB0000';

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [attemptCount, setAttemptCount] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(0);
  
  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [currentUsername, setCurrentUsername] = useState('');

  // Security features
  const [sessionInfo, setSessionInfo] = useState({
    ipAddress: '',
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
  });

  // Password strength validation
  const [passwordStrength, setPasswordStrength] = useState({
    hasMinLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumbers: false,
    hasSpecialChars: false,
    hasNoSequence: true,
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.is_temporary_password) {
        router.push('/change-password');
      } else if (!user.two_fa_enabled) {
        router.push('/2fa-setup');
      } else {
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, user, router]);

  // Lockout timer
  useEffect(() => {
    if (isLocked && lockoutTime > 0) {
      const timer = setInterval(() => {
        setLockoutTime(prev => {
          if (prev <= 1) {
            setIsLocked(false);
            setError('');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isLocked, lockoutTime]);

  // Password validation (for new password requirements display)
  useEffect(() => {
    const password = formData.password;
    setPasswordStrength({
      hasMinLength: password.length >= 12,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSpecialChars: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(password),
      hasNoSequence: !/(.)\1{2,}/.test(password) && !/123|abc|qwe/i.test(password),
    });
  }, [formData.password]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setError(''); // Clear error on input change
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLocked) {
      setError(`Account locked. Try again in ${lockoutTime} seconds.`);
      return;
    }

    if (!formData.username || !formData.password) {
      setError('Please enter both username and password.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await login({
        username: formData.username,
        password: formData.password,
      });

      if (result.success) {
        setAttemptCount(0);

        if (result.requires2FA) {
          // 2FA required, switch to 2FA verification mode
          setRequires2FA(true);
          setTempToken(result.tempToken || '');
          setCurrentUsername(formData.username);
        } else if (result.requiresPasswordChange) {
          router.push('/change-password');
        } else {
          // Check if user needs to set up 2FA
          if (result.user && !result.user.two_fa_enabled) {
            router.push('/2fa-setup');
          } else {
            router.push('/dashboard');
          }
        }
      } else {
        const newAttemptCount = attemptCount + 1;
        setAttemptCount(newAttemptCount);
        setError(result.error || 'Login failed');

        // Implement progressive lockout
        if (newAttemptCount >= 5) {
          setIsLocked(true);
          setLockoutTime(300); // 5 minutes lockout
          setError('Too many failed attempts. Account locked for 5 minutes.');
        } else if (newAttemptCount >= 3) {
          setError(`${result.error}. ${5 - newAttemptCount} attempts remaining before lockout.`);
        }
      }
    } catch (error) {
      setError('Connection error. Please check your internet connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatLockoutTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // 2FA handlers
  const handle2FASuccess = (response: LoginResponse) => {
    setRequires2FA(false);
    setTempToken('');
    setCurrentUsername('');
    
    if (response.user.is_temporary_password) {
      router.push('/change-password');
    } else {
      // After successful 2FA verification, user already has 2FA enabled, go to dashboard
      router.push('/dashboard');
    }
  };

  const handle2FABack = () => {
    setRequires2FA(false);
    setTempToken('');
    setCurrentUsername('');
  };

  // Show 2FA verification if required
  if (requires2FA) {
    return (
      <TwoFAVerify
        tempToken={tempToken}
        username={currentUsername}
        onSuccess={handle2FASuccess}
        onBack={handle2FABack}
      />
    );
  }

  return (
    <div className="min-h-screen pt-16 section-padding py-12">
      <div className="relative max-w-md mx-auto">
        {/* Background Elements */}
        <div className="absolute inset-0 -z-10">
          <div
            className="absolute -top-20 -left-20 w-64 h-64 rounded-full blur-3xl"
            style={{ backgroundColor: `${kenyaGreen}10` }}
          ></div>
          <div
            className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full blur-3xl"
            style={{ backgroundColor: `${kenyaRed}10` }}
          ></div>
        </div>

        <div className="card-glass">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div
                className="p-4 rounded-2xl shadow-lg"
                style={{ background: `linear-gradient(to right, ${kenyaGreen}, ${kenyaRed})` }}
              >
                <Shield className="w-12 h-12 text-white" />
              </div>
            </div>

            <h1 className="text-2xl font-bold mb-2">
              <span className="text-gradient-kenya">Kenya Government</span>
            </h1>
            <p className="text-gray-600">FSFVI Secure Access Portal</p>

            {/* Security Indicator */}
            <div className="flex items-center justify-center mt-4 text-sm text-gray-500">
              <Lock className="w-4 h-4 mr-1" />
              <span>256-bit SSL Encrypted Connection</span>
            </div>
          </div>

          {/* Session Info */}
          <div className="mb-6 p-3 glass rounded-lg text-xs text-gray-600">
            <div className="flex items-center mb-1">
              <Globe className="w-3 h-3 mr-1" />
              <span>Session: {new Date().toLocaleString()}</span>
            </div>
            <div className="text-gray-500 truncate">
              User Agent: {sessionInfo.userAgent.substring(0, 50)}...
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 rounded-lg border" style={{
              backgroundColor: `${kenyaRed}15`,
              borderColor: `${kenyaRed}30`
            }}>
              <div className="flex items-center">
                {isLocked ? (
                  <Clock className="w-5 h-5 mr-2" style={{ color: kenyaRed }} />
                ) : (
                  <AlertTriangle className="w-5 h-5 mr-2" style={{ color: kenyaRed }} />
                )}
                <div>
                  <p className="text-sm font-medium" style={{ color: kenyaRed }}>
                    {error}
                  </p>
                  {isLocked && lockoutTime > 0 && (
                    <p className="text-xs text-gray-600 mt-1">
                      Lockout expires in: {formatLockoutTime(lockoutTime)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Field */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: kenyaGreen }}>
                Government Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 glass rounded-lg border border-gray-300 focus:ring-2 focus:ring-opacity-50 focus:border-transparent transition-all"
                  style={{ '--tw-ring-color': kenyaGreen } as React.CSSProperties}
                  placeholder="Enter your government username"
                  disabled={isLoading || isLocked}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: kenyaGreen }}>
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-12 py-3 glass rounded-lg border border-gray-300 focus:ring-2 focus:ring-opacity-50 focus:border-transparent transition-all"
                  placeholder="Enter your password"
                  disabled={isLoading || isLocked}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isLoading || isLocked}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Security Notice */}
            <div className="text-xs text-gray-600 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start">
                <AlertTriangle className="w-4 h-4 mr-2 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800 mb-1">Security Notice:</p>
                  <ul className="text-yellow-700 space-y-1">
                    <li>• First-time login requires immediate password change</li>
                    <li>• Sessions expire after 30 minutes of inactivity</li>
                    <li>• All access attempts are logged and monitored</li>
                    <li>• Maximum 5 failed attempts before account lockout</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Attempt Counter */}
            {attemptCount > 0 && !isLocked && (
              <div className="flex items-center justify-center text-sm" style={{ color: kenyaRed }}>
                <XCircle className="w-4 h-4 mr-1" />
                <span>Failed attempts: {attemptCount}/5</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || isLocked}
              className="w-full btn-kenya py-4 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Authenticating...
                </div>
              ) : isLocked ? (
                `Locked - Wait ${formatLockoutTime(lockoutTime)}`
              ) : (
                'Secure Sign In'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500 mb-2">
              Authorized Government Personnel Only
            </p>
            <Link href="/" className="text-xs hover:underline" style={{ color: kenyaGreen }}>
              ← Back to Homepage
            </Link>
          </div>

          {/* Additional Security Info */}
          <div className="mt-4 text-xs text-gray-400 text-center space-y-1">
            <p>Protected by advanced encryption and multi-layer security</p>
            <p>All activities are monitored and logged for security purposes</p>
          </div>
        </div>
      </div>
    </div>
  );
}