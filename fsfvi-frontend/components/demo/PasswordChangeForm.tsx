'use client';

import { useState, useEffect } from 'react';
import { demoPasswordAPI } from '@/lib/demoAuthApi';
import type { PasswordStrengthResponse } from '@/lib/types/demoAuth';

interface PasswordChangeFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function PasswordChangeForm({ onSuccess, onCancel }: PasswordChangeFormProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrengthResponse | null>(null);

  // Check password strength as user types
  useEffect(() => {
    if (newPassword.length >= 8) {
      const checkStrength = async () => {
        try {
          const strength = await demoPasswordAPI.checkPasswordStrength(newPassword);
          setPasswordStrength(strength);
        } catch (err) {
          console.error('Failed to check password strength:', err);
        }
      };

      const debounce = setTimeout(checkStrength, 500);
      return () => clearTimeout(debounce);
    } else {
      setPasswordStrength(null);
    }
  }, [newPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match');
      setIsLoading(false);
      return;
    }

    try {
      const response = await demoPasswordAPI.changePassword(
        currentPassword,
        newPassword,
        confirmPassword
      );
      setSuccess(response.message || 'Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordStrength(null);

      if (onSuccess) {
        setTimeout(onSuccess, 2000);
      }
    } catch (err: any) {
      console.error('Password change error:', err);
      const errorData = err.response?.data;
      if (errorData?.details && Array.isArray(errorData.details)) {
        setError(errorData.details.join(', '));
      } else {
        setError(
          errorData?.error ||
          errorData?.message ||
          'Failed to change password'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getStrengthColor = (strength: string | undefined) => {
    if (!strength) return 'text-gray-600';

    switch (strength.toLowerCase()) {
      case 'very strong':
        return 'text-green-600';
      case 'strong':
        return 'text-blue-600';
      case 'moderate':
        return 'text-yellow-600';
      case 'weak':
        return 'text-orange-600';
      case 'very weak':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Change Password</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Current Password
          </label>
          <input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            minLength={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
            New Password
          </label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={12}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          {passwordStrength && (
            <div className="mt-2 text-sm">
              <p className={`font-medium ${getStrengthColor(passwordStrength.strength)}`}>
                Strength: {passwordStrength.strength || 'Unknown'}
              </p>
              {passwordStrength.errors && passwordStrength.errors.length > 0 && (
                <ul className="mt-1 text-red-600 list-disc list-inside">
                  {passwordStrength.errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              )}
              {passwordStrength.suggestions && passwordStrength.suggestions.length > 0 && (
                <ul className="mt-1 text-gray-600 list-disc list-inside">
                  {passwordStrength.suggestions.map((suggestion, idx) => (
                    <li key={idx}>{suggestion}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm New Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={12}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isLoading || !passwordStrength?.is_valid}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Changing Password...' : 'Change Password'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-sm text-blue-800 font-medium">Password Requirements:</p>
        <ul className="text-xs text-blue-700 mt-1 list-disc list-inside">
          <li>Minimum 12 characters</li>
          <li>At least one uppercase letter</li>
          <li>At least one lowercase letter</li>
          <li>At least one number</li>
          <li>At least one special character</li>
          <li>No common patterns or words</li>
        </ul>
      </div>
    </div>
  );
}
