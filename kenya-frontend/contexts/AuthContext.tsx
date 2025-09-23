'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  authApi,
  ApiError,
  getErrorMessage,
  isAuthError,
  type User,
  type LoginRequest,
  type ChangePasswordRequest
} from '@/lib/api';

interface LoginCredentials {
  username: string;
  password: string;
  two_fa_code?: string;
}

interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<{
    success: boolean;
    error?: string;
    requiresPasswordChange?: boolean;
    requires2FA?: boolean;
    tempToken?: string;
    user?: User;
  }>;
  verify2FA: (tempToken: string, totpCode: string) => Promise<{
    success: boolean;
    error?: string;
    requiresPasswordChange?: boolean;
  }>;
  logout: () => void;
  changePassword: (data: ChangePasswordData) => Promise<{
    success: boolean;
    error?: string;
  }>;
  checkSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Kenya Government Authentication Context

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Check existing session on app load
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('kenya_auth_token');

      if (!token) {
        setIsLoading(false);
        return false;
      }

      // Verify token with backend
      const tokenData = await authApi.verifyToken();
      setUser(tokenData.user);
      setIsLoading(false);
      return true;
    } catch (error) {
      // Only log unexpected errors - authentication errors are expected when tokens expire
      if (!isAuthError(error)) {
        console.error('Session check error:', error);
      }
      setUser(null);
      setIsLoading(false);
      return false;
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      const loginData = await authApi.login({
        username: credentials.username,
        password: credentials.password,
        two_fa_code: credentials.two_fa_code,
      });

      // Check if 2FA is required
      if (loginData.requires_two_fa) {
        return {
          success: true,
          requires2FA: true,
          tempToken: loginData.two_fa_temp_token,
        };
      }

      // Set user data for successful login
      setUser(loginData.user);

      return {
        success: true,
        requiresPasswordChange: loginData.user.is_temporary_password,
        user: loginData.user,
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: getErrorMessage(error),
      };
    }
  };

  const verify2FA = async (tempToken: string, totpCode: string) => {
    try {
      const loginData = await authApi.verify2FA({
        temp_token: tempToken,
        totp_code: totpCode,
      });

      // Set user data after successful 2FA verification
      setUser(loginData.user);

      return {
        success: true,
        requiresPasswordChange: loginData.user.is_temporary_password,
      };
    } catch (error) {
      console.error('2FA verification error:', error);
      return {
        success: false,
        error: getErrorMessage(error),
      };
    }
  };

  const changePassword = async (data: ChangePasswordData) => {
    try {
      const token = localStorage.getItem('kenya_auth_token');

      if (!token) {
        return {
          success: false,
          error: 'Not authenticated',
        };
      }

      await authApi.changePassword({
        current_password: data.currentPassword,
        new_password: data.newPassword,
        confirm_password: data.confirmPassword,
      });

      // Update user state
      setUser(prev => prev ? {
        ...prev,
        is_temporary_password: false,
      } : null);

      return {
        success: true,
      };
    } catch (error) {
      console.error('Password change error:', error);
      return {
        success: false,
        error: getErrorMessage(error),
      };
    }
  };

  const logout = async () => {
    try {
      // Call backend to invalidate token
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear user state
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    verify2FA,
    logout,
    changePassword,
    checkSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}