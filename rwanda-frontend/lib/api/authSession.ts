/**
 * Client-side session expiry handling (no secrets in URLs; generic user messaging).
 */
import { RW_AUTH_TOKEN_KEY, RW_USER_KEY } from '@/lib/auth/storageKeys';

const LOGIN_SESSION_REASON = 'session_expired';

/** Opaque query flag — login page maps to i18n copy only. */
export function redirectToLoginSessionExpired(): void {
  if (typeof window === 'undefined') return;
  clearAuthStorage();
  const url = new URL('/login', window.location.origin);
  url.searchParams.set('reason', LOGIN_SESSION_REASON);
  window.location.replace(url.toString());
}

export function clearAuthStorage(): void {
  try {
    localStorage.removeItem(RW_AUTH_TOKEN_KEY);
    localStorage.removeItem(RW_USER_KEY);
  } catch {
    /* ignore */
  }
}

export function isLoginSessionExpiredReason(reason: string | null): boolean {
  return reason === LOGIN_SESSION_REASON;
}
