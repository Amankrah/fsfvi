/**
 * Access-token refresh using a bare axios call (no auth interceptors) to avoid loops.
 */
import axios from 'axios';
import { RW_AUTH_TOKEN_KEY } from '@/lib/auth/storageKeys';

const RWANDA_API_BASE_URL =
  process.env.NEXT_PUBLIC_RWANDA_API_URL || 'http://localhost:8000';

let refreshPromise: Promise<boolean> | null = null;

/**
 * POST /api/auth/refresh/ — returns true if access (and refresh) tokens were stored.
 */
export function tryRefreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  const p = (async (): Promise<boolean> => {
    try {
      const raw = localStorage.getItem(RW_AUTH_TOKEN_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as { token?: string; refresh_token?: string };
      const refreshToken = parsed.refresh_token;
      if (!refreshToken || typeof refreshToken !== 'string') return false;

      const { data } = await axios.post<{
        token: string;
        refresh_token?: string;
      }>(
        `${RWANDA_API_BASE_URL}/api/auth/refresh/`,
        { refresh_token: refreshToken },
        { headers: { 'Content-Type': 'application/json' }, timeout: 20000 },
      );

      if (!data?.token || typeof data.token !== 'string') return false;

      localStorage.setItem(
        RW_AUTH_TOKEN_KEY,
        JSON.stringify({
          token: data.token,
          refresh_token: data.refresh_token ?? refreshToken,
        }),
      );
      return true;
    } catch {
      return false;
    }
  })();

  refreshPromise = p;
  void p.finally(() => {
    refreshPromise = null;
  });
  return p;
}
