'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authAPI, User, LoginData, RegisterData } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginData) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  const initializeAuth = async () => {
    console.log('🔄 AuthContext: Initializing authentication...');
    try {
      const token = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('user');

      console.log('🔑 AuthContext: Token exists:', !!token);
      console.log('👤 AuthContext: Stored user exists:', !!storedUser);

      if (token && storedUser) {
        const userData = JSON.parse(storedUser);
        console.log('✅ AuthContext: Setting user from localStorage:', userData.username);
        setUser(userData);
        
        // Verify token is still valid - but don't throw on failure during init
        try {
          console.log('🔍 AuthContext: Validating token...');
          await refreshUser();
          console.log('✅ AuthContext: Token validation successful');
        } catch (error) {
          console.error('❌ AuthContext: Token validation failed during initialization:', error);
          // Clear invalid token and user data
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
          setUser(null);
        }
      } else {
        console.log('ℹ️ AuthContext: No stored authentication data found');
      }
    } catch (error) {
      console.error('❌ AuthContext: Auth initialization error:', error);
      // Clear invalid data
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      setUser(null);
    } finally {
      console.log('✅ AuthContext: Initialization complete, setting loading to false');
      setIsLoading(false);
    }
  };

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (credentials: LoginData) => {
    try {
      console.log('🔐 AuthContext: Attempting login for user:', credentials.username);
      setIsLoading(true);
      const response = await authAPI.login(credentials);
      
      console.log('✅ AuthContext: Login successful, storing auth data');
      // Store auth data
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      setUser(response.user);
      console.log('👤 AuthContext: User set in context:', response.user.username);
    } catch (error: unknown) {
      console.error('❌ AuthContext: Login error:', error);
      throw new Error(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      setIsLoading(true);
      const response = await authAPI.register(userData);
      
      // Store auth data
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      setUser(response.user);
    } catch (error: unknown) {
      console.error('Registration error:', error);
      throw new Error(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local state
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await authAPI.getProfile();
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      console.error('Profile refresh error:', error);
      // Token might be invalid, clear auth state
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      setUser(null);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 