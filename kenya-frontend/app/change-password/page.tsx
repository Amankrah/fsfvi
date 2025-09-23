'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Eye,
  EyeOff,
  AlertTriangle,
  Lock,
  CheckCircle,
  XCircle,
  Info,
  Key
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function ChangePassword() {
  const router = useRouter();
  const { user, changePassword, logout, isAuthenticated } = useAuth();
  const kenyaGreen = '#006600';
  const kenyaRed = '#BB0000';

  // Form state
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // UI state
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Password strength validation
  const [passwordStrength, setPasswordStrength] = useState({
    hasMinLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumbers: false,
    hasSpecialChars: false,
    hasNoSequence: true,
    hasNoUserInfo: true,
    score: 0,
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/signin');
    }
  }, [isAuthenticated, router]);

  // Password validation
  useEffect(() => {
    const password = formData.newPassword;
    const username = user?.username || '';

    const checks = {
      hasMinLength: password.length >= 12,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSpecialChars: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(password),
      hasNoSequence: !/(.)\1{2,}/.test(password) && !/123|abc|qwe|password/i.test(password),
      hasNoUserInfo: !username || !password.toLowerCase().includes(username.toLowerCase()),
    };

    const score = Object.values(checks).filter(Boolean).length;

    setPasswordStrength({
      ...checks,
      score,
    });
  }, [formData.newPassword, user?.username]);

  const getPasswordStrengthColor = () => {
    if (passwordStrength.score < 3) return kenyaRed;
    if (passwordStrength.score < 5) return '#FF8C00';
    if (passwordStrength.score < 7) return '#FFD700';
    return kenyaGreen;
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength.score < 3) return 'Very Weak';
    if (passwordStrength.score < 5) return 'Weak';
    if (passwordStrength.score < 7) return 'Good';
    return 'Strong';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setError('');
    setSuccess('');
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setError('All fields are required.');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      setError('New password must be different from current password.');
      return;
    }

    if (passwordStrength.score < 7) {
      setError('Password does not meet security requirements. Please choose a stronger password.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword,
      });

      if (result.success) {
        setSuccess('Password changed successfully! You will be redirected to the dashboard.');
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });

        // Redirect after success - check if 2FA setup is needed
        setTimeout(() => {
          if (user && !user.two_fa_enabled) {
            router.push('/2fa-setup');
          } else {
            router.push('/dashboard');
          }
        }, 2000);
      } else {
        setError(result.error || 'Password change failed. Please try again.');
      }
    } catch (error) {
      setError('Connection error. Please check your internet connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (user?.isTemporaryPassword) {
      // Cannot cancel if using temporary password
      setError('You must change your temporary password before accessing the system.');
    } else {
      router.push('/dashboard');
    }
  };

  if (!user) {
    return null; // Loading or redirecting
  }

  return (
    <div className="min-h-screen pt-16 section-padding py-12">
      <div className="relative max-w-2xl mx-auto">
        {/* Background Elements */}
        <div className="absolute inset-0 -z-10">
          <div
            className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl"
            style={{ backgroundColor: `${kenyaGreen}10` }}
          ></div>
          <div
            className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full blur-3xl"
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
                <Key className="w-12 h-12 text-white" />
              </div>
            </div>

            <h1 className="text-2xl font-bold mb-2">
              {user.isTemporaryPassword ? 'Change Temporary Password' : 'Change Password'}
            </h1>
            <p className="text-gray-600">
              {user.isTemporaryPassword
                ? 'You must change your temporary password to continue'
                : 'Update your password for enhanced security'}
            </p>
          </div>

          {/* Mandatory Password Change Notice */}
          {user.isTemporaryPassword && (
            <div className="mb-6 p-4 rounded-lg border" style={{
              backgroundColor: '#FFF3CD',
              borderColor: '#FFEAA7'
            }}>
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    Mandatory Password Change Required
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    For security reasons, you must change your temporary password before accessing the system.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success/Error Messages */}
          {success && (
            <div className="mb-6 p-4 rounded-lg border" style={{
              backgroundColor: `${kenyaGreen}15`,
              borderColor: `${kenyaGreen}30`
            }}>
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 mr-2" style={{ color: kenyaGreen }} />
                <p className="text-sm font-medium" style={{ color: kenyaGreen }}>
                  {success}
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 rounded-lg border" style={{
              backgroundColor: `${kenyaRed}15`,
              borderColor: `${kenyaRed}30`
            }}>
              <div className="flex items-center">
                <XCircle className="w-5 h-5 mr-2" style={{ color: kenyaRed }} />
                <p className="text-sm font-medium" style={{ color: kenyaRed }}>
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Current Password */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: kenyaGreen }}>
                Current Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-12 py-3 glass rounded-lg border border-gray-300 focus:ring-2 focus:ring-opacity-50 focus:border-transparent transition-all"
                  placeholder="Enter your current password"
                  disabled={isLoading}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('current')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isLoading}
                >
                  {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: kenyaGreen }}>
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-12 py-3 glass rounded-lg border border-gray-300 focus:ring-2 focus:ring-opacity-50 focus:border-transparent transition-all"
                  placeholder="Enter your new password"
                  disabled={isLoading}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isLoading}
                >
                  {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {formData.newPassword && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Password Strength:</span>
                    <span
                      className="text-sm font-medium"
                      style={{ color: getPasswordStrengthColor() }}
                    >
                      {getPasswordStrengthText()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(passwordStrength.score / 7) * 100}%`,
                        backgroundColor: getPasswordStrengthColor()
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: kenyaGreen }}>
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-12 py-3 glass rounded-lg border border-gray-300 focus:ring-2 focus:ring-opacity-50 focus:border-transparent transition-all"
                  placeholder="Confirm your new password"
                  disabled={isLoading}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isLoading}
                >
                  {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Password Match Indicator */}
              {formData.confirmPassword && (
                <div className="mt-2 flex items-center">
                  {formData.newPassword === formData.confirmPassword ? (
                    <CheckCircle className="w-4 h-4 mr-1" style={{ color: kenyaGreen }} />
                  ) : (
                    <XCircle className="w-4 h-4 mr-1" style={{ color: kenyaRed }} />
                  )}
                  <span
                    className="text-sm"
                    style={{
                      color: formData.newPassword === formData.confirmPassword ? kenyaGreen : kenyaRed
                    }}
                  >
                    {formData.newPassword === formData.confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                  </span>
                </div>
              )}
            </div>

            {/* Password Requirements */}
            <div className="glass rounded-lg p-4">
              <div className="flex items-center mb-3">
                <Info className="w-5 h-5 mr-2" style={{ color: kenyaGreen }} />
                <span className="font-semibold" style={{ color: kenyaGreen }}>
                  Password Requirements
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {[
                  { key: 'hasMinLength', text: 'At least 12 characters' },
                  { key: 'hasUppercase', text: 'Contains uppercase letters' },
                  { key: 'hasLowercase', text: 'Contains lowercase letters' },
                  { key: 'hasNumbers', text: 'Contains numbers' },
                  { key: 'hasSpecialChars', text: 'Contains special characters' },
                  { key: 'hasNoSequence', text: 'No repeating patterns' },
                  { key: 'hasNoUserInfo', text: 'Does not contain username' },
                ].map((requirement, index) => (
                  <div key={index} className="flex items-center">
                    {passwordStrength[requirement.key as keyof typeof passwordStrength] ? (
                      <CheckCircle className="w-4 h-4 mr-2" style={{ color: kenyaGreen }} />
                    ) : (
                      <XCircle className="w-4 h-4 mr-2 text-gray-400" />
                    )}
                    <span className={passwordStrength[requirement.key as keyof typeof passwordStrength] ? 'text-gray-700' : 'text-gray-500'}>
                      {requirement.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="submit"
                disabled={isLoading || passwordStrength.score < 7}
                className="flex-1 btn-kenya py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Updating Password...
                  </div>
                ) : (
                  'Change Password'
                )}
              </button>

              {!user.isTemporaryPassword && (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="px-6 py-3 glass hover:bg-white/20 rounded-lg font-semibold transition-all"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          {/* Security Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-xs text-gray-500 text-center space-y-2">
            <p>🔒 Your new password will be encrypted using industry-standard security protocols</p>
            <p>⚠️ For security reasons, do not share your password with anyone</p>
            <p>📝 Password changes are logged for audit purposes</p>
          </div>
        </div>
      </div>
    </div>
  );
}