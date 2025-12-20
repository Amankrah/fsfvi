import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { demoAuthAPI } from '@/lib/demoAuthApi';
import type { UserResponse } from '@/lib/types/demoAuth';

export function useDemoAuth(requireAuth: boolean = true) {
  const router = useRouter();
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = demoAuthAPI.isAuthenticated();
      setIsAuthenticated(authenticated);

      // Redirect to login if authentication is required and user is not authenticated
      if (requireAuth && !authenticated) {
        setIsLoading(false);
        router.push('/demo/login');
        return;
      }

      if (authenticated) {
        // First, set cached user data immediately (for faster UI rendering)
        const cachedUser = demoAuthAPI.getCurrentUser();
        if (cachedUser) {
          setUser(cachedUser);
        }

        // Then verify token and get fresh user data from backend
        try {
          const freshUser = await demoAuthAPI.verifyToken();
          setUser(freshUser);
        } catch (error) {
          console.error('Failed to verify token:', error);
          // If verification fails, user is not authenticated
          setIsAuthenticated(false);
          if (requireAuth) {
            router.push('/demo/login');
          }
        }
      }

      setIsLoading(false);
    };

    checkAuth();
  }, [requireAuth, router]);

  const logout = async () => {
    try {
      await demoAuthAPI.logout();
      router.push('/demo/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, clear local storage and redirect
      localStorage.removeItem('demo_auth_token');
      localStorage.removeItem('demo_user');
      router.push('/demo/login');
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    logout,
  };
}
