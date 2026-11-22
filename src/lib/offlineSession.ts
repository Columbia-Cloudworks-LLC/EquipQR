/**
 * Offline sign-in fallback.
 *
 * supabase-js can only hand out a session when it can reach the Auth server
 * once the one-hour access token has expired, and it can only verify claims
 * after downloading the signing keys. With no signal both fail, and the app
 * would treat a signed-in technician as signed out.
 *
 * The SDK leaves the stored session in place when a refresh fails for
 * connectivity reasons and removes it when the server actually rejects it, so
 * a session still present in storage is the last one the server accepted.
 * Reading it here only decides what the UI shows from local caches; every
 * server request is still authorised by the server (JWT + RLS) once a
 * connection is back.
 */

import { isAuthRetryableFetchError } from '@supabase/supabase-js';
import type { Session } from '@supabase/supabase-js';

/** Mirrors supabase-js' default `storageKey` (`sb-<project ref>-auth-token`). */
function authStorageKey(): string | null {
  try {
    const url = new URL(import.meta.env.VITE_SUPABASE_URL as string);
    return `sb-${url.hostname.split('.')[0]}-auth-token`;
  } catch {
    return null;
  }
}

function isStoredSession(value: unknown): value is Session {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<Session>;
  return (
    typeof candidate.access_token === 'string' &&
    typeof candidate.refresh_token === 'string' &&
    typeof candidate.user?.id === 'string' &&
    candidate.user.id.length > 0
  );
}

/** The session supabase-js last persisted on this device, or null. */
export function readStoredAuthSession(): Session | null {
  const key = authStorageKey();
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isStoredSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * True when an auth call failed because the server could not be reached,
 * as opposed to the server rejecting the session.
 */
export function isAuthConnectivityFailure(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  return isAuthRetryableFetchError(error);
}
