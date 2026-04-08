import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api/authApi';
import { clearAuthStorage, redirectToLoginSessionExpired } from '@/lib/api/authSession';
import type { UserResponse } from '@/lib/types/auth';

export function useAuth(requireAuth: boolean = true) {
  const router = useRouter();
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = authAPI.isAuthenticated();
      setIsAuthenticated(authenticated);

      if (requireAuth && !authenticated) {
        setIsLoading(false);
        router.push('/login');
        return;
      }

      if (authenticated) {
        const cachedUser = authAPI.getCurrentUser();
        if (cachedUser) setUser(cachedUser);

        try {
          const freshUser = await authAPI.verifyToken();
          setUser(freshUser);
        } catch {
          setIsAuthenticated(false);
          if (requireAuth) redirectToLoginSessionExpired();
        }
      }

      setIsLoading(false);
    };

    checkAuth();
  }, [requireAuth, router]);

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch {
      clearAuthStorage();
    }
    router.push('/login');
  };

  const refreshUser = async (): Promise<UserResponse | null> => {
    if (!authAPI.isAuthenticated()) return null;
    try {
      const fresh = await authAPI.verifyToken();
      setUser(fresh);
      return fresh;
    } catch {
      setIsAuthenticated(false);
      setUser(null);
      if (requireAuth) redirectToLoginSessionExpired();
      return null;
    }
  };

  return { user, isLoading, isAuthenticated, logout, refreshUser };
}
