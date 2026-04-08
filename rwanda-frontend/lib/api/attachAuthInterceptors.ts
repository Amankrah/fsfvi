/**
 * Shared axios auth: Bearer injection, refresh+retry on auth failure, graceful login redirect.
 * Does not log tokens or server error bodies beyond safe handling.
 */
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { RW_AUTH_TOKEN_KEY } from '@/lib/auth/storageKeys';
import { redirectToLoginSessionExpired } from '@/lib/api/authSession';
import { tryRefreshAccessToken } from '@/lib/api/tokenRefresh';

/** Do not run “session recovery\" on these paths — 401 is expected for wrong password / 2FA code, etc. */
const SKIP_SESSION_RECOVERY_PARTS = [
  '/api/auth/login',
  '/api/auth/2fa/verify',
  '/api/auth/refresh',
] as const;

function fullRequestUrl(config: InternalAxiosRequestConfig): string {
  const base = (config.baseURL || '').replace(/\/$/, '');
  const path = (config.url || '').replace(/^\//, '');
  if (!path) return base;
  if (path.startsWith('http')) return path;
  return `${base}/${path}`;
}

function shouldSkipSessionRecovery(config: InternalAxiosRequestConfig): boolean {
  const url = fullRequestUrl(config);
  return SKIP_SESSION_RECOVERY_PARTS.some((part) => url.includes(part));
}

function getAuthorizationHeader(config: InternalAxiosRequestConfig): string | undefined {
  const h = config.headers;
  if (!h) return undefined;
  const direct = (h as { Authorization?: unknown }).Authorization;
  if (typeof direct === 'string') return direct;
  if (Array.isArray(direct) && typeof direct[0] === 'string') return direct[0];
  const setFn = (h as { get?: (key: string) => unknown }).get;
  if (typeof setFn === 'function') {
    const v = setFn.call(h, 'Authorization') ?? setFn.call(h, 'authorization');
    if (typeof v === 'string') return v;
  }
  return undefined;
}

function sentBearer(config: InternalAxiosRequestConfig): boolean {
  const auth = getAuthorizationHeader(config);
  return typeof auth === 'string' && auth.startsWith('Bearer ');
}

function looksLikeAuthRelated403(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const o = data as Record<string, unknown>;
  const detail = typeof o.detail === 'string' ? o.detail.toLowerCase() : '';
  const err = typeof o.error === 'string' ? o.error.toLowerCase() : '';
  const text = `${detail} ${err}`;
  return (
    text.includes('not authenticated') ||
    text.includes('credentials were not provided') ||
    text.includes('invalid token') ||
    text.includes('token expired') ||
    text.includes('authentication credentials')
  );
}

type ConfigWithRetry = InternalAxiosRequestConfig & { _authRetry?: boolean };

export function attachAuthInterceptors(client: AxiosInstance): void {
  client.interceptors.request.use(
    (config) => {
      const tokenData = localStorage.getItem(RW_AUTH_TOKEN_KEY);
      if (tokenData) {
        try {
          const parsed = JSON.parse(tokenData) as { token?: string };
          if (parsed.token) {
            config.headers.Authorization = `Bearer ${parsed.token}`;
          }
        } catch {
          /* ignore corrupt storage */
        }
      }
      return config;
    },
    (error) => Promise.reject(error),
  );

  client.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
      const ax = error as {
        config?: ConfigWithRetry;
        response?: { status?: number; data?: unknown };
      };
      const config = ax.config;
      if (!config) return Promise.reject(error);

      const status = ax.response?.status;
      if (status !== 401 && status !== 403) {
        return Promise.reject(error);
      }

      if (shouldSkipSessionRecovery(config)) {
        return Promise.reject(error);
      }

      const bearer = sentBearer(config);
      const authRelated403 = status === 403 && looksLikeAuthRelated403(ax.response?.data);

      const treatAsSessionLoss = status === 401 ? bearer : bearer && authRelated403;

      if (!treatAsSessionLoss) {
        return Promise.reject(error);
      }

      if (config._authRetry) {
        redirectToLoginSessionExpired();
        return Promise.reject(error);
      }

      const refreshed = await tryRefreshAccessToken();
      if (refreshed) {
        config._authRetry = true;
        const tokenData = localStorage.getItem(RW_AUTH_TOKEN_KEY);
        if (tokenData) {
          try {
            const parsed = JSON.parse(tokenData) as { token?: string };
            if (parsed.token && config.headers) {
              const h = config.headers as {
                set?: (k: string, v: string) => void;
                Authorization?: string;
              };
              const value = `Bearer ${parsed.token}`;
              if (typeof h.set === 'function') {
                h.set('Authorization', value);
              } else {
                h.Authorization = value;
              }
            }
          } catch {
            /* ignore */
          }
        }
        return client.request(config);
      }

      redirectToLoginSessionExpired();
      return Promise.reject(error);
    },
  );
}
