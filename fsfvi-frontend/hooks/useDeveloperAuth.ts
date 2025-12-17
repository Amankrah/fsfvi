import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { developerAuthAPI, developerProfileAPI } from '@/lib/developerApi';
import type { User } from '@/lib/types/developer';

export function useDeveloperAuth(requireAuth: boolean = true) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = developerAuthAPI.isAuthenticated();
      setIsAuthenticated(authenticated);

      // Redirect to login if authentication is required and user is not authenticated
      if (requireAuth && !authenticated) {
        setIsLoading(false);
        router.push('/developer/login');
        return;
      }

      if (authenticated) {
        // First, set cached profile data immediately (for faster UI rendering)
        const cachedUser = developerProfileAPI.getCachedProfile();
        if (cachedUser) {
          setUser(cachedUser);
        }

        // Then fetch fresh profile data from backend
        try {
          const response = await developerProfileAPI.getProfile();
          if (response.success) {
            setUser(response.data);
          }
        } catch (error) {
          console.error('Failed to fetch user profile:', error);
          // If profile fetch fails but we have cached data, keep using it
          // If no cached data, user will see partial info from login
        }
      }

      setIsLoading(false);
    };

    checkAuth();
  }, [requireAuth, router]);

  const logout = async () => {
    try {
      await developerAuthAPI.logout();
      router.push('/developer/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, clear local storage and redirect
      localStorage.removeItem('developer_access_token');
      localStorage.removeItem('developer_refresh_token');
      localStorage.removeItem('developer_user');
      localStorage.removeItem('developer_user_full');
      router.push('/developer/login');
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    logout,
  };
}
