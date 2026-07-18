/**
 * Redirect URL validation utilities.
 *
 * Prevents open-redirect attacks by ensuring redirect targets are safe,
 * same-origin relative paths.  Used by every consumer of the
 * `pendingRedirect` sessionStorage value (AuthContext, Auth page,
 * usePendingRedirectHandler) and Google OAuth `redirectTo` / `?next=` flow.
 */

const PENDING_REDIRECT_STORAGE_KEY = 'pendingRedirect';

/** sessionStorage may throw (private mode / blocked storage) — never crash auth. */
export function getPendingRedirect(): string | null {
  try {
    return typeof sessionStorage !== 'undefined'
      ? sessionStorage.getItem(PENDING_REDIRECT_STORAGE_KEY)
      : null;
  } catch {
    return null;
  }
}

export function clearPendingRedirect(): void {
  try {
    sessionStorage?.removeItem(PENDING_REDIRECT_STORAGE_KEY);
  } catch {
    // ignore unavailable storage
  }
}

/**
 * Returns `true` when `path` is a same-origin relative path that is safe
 * to use with `window.location.href` or React Router `navigate()`.
 *
 * Blocks:
 * - Protocol-relative URLs (`//evil.com`)
 * - Absolute URLs (`https://evil.com`)
 * - `javascript:`, `data:`, and other URI schemes
 * - Empty / non-string values
 */
export function isSafeRedirectPath(path: string): boolean {
  if (!path || typeof path !== 'string') return false;

  // Must start with exactly one forward slash (relative path)
  if (!path.startsWith('/') || path.startsWith('//')) return false;

  // Block javascript:, data:, vbscript:, etc.
  // This check is defense-in-depth — the startsWith('/') check above
  // already blocks these, but we guard explicitly in case of future changes.
  if (/^[a-z]+:/i.test(path)) return false;

  return true;
}

/**
 * Returns `path` if it is safe, otherwise returns `fallback`.
 */
export function getSafeRedirectPath(path: string, fallback = '/'): string {
  return isSafeRedirectPath(path) ? path : fallback;
}

/**
 * Builds the Supabase Auth `redirectTo` URL for Google OAuth.
 *
 * Always lands on `/auth` so the Auth page can honor `pendingRedirect`.
 * When a safe pending path exists, it is carried in `?next=` so the
 * destination survives OAuth even if sessionStorage is unavailable.
 */
export function buildGoogleOAuthRedirectTo(
  origin: string,
  pendingRedirect: string | null | undefined,
): string {
  const base = `${origin}/auth`;
  if (!pendingRedirect || !isSafeRedirectPath(pendingRedirect)) {
    return base;
  }
  return `${base}?next=${encodeURIComponent(pendingRedirect)}`;
}

/**
 * Reads and validates a `next` query param from a search string
 * (`?next=/path` or `next=/path`). Returns null when missing/unsafe.
 */
export function getSafeNextParam(search: string): string | null {
  if (!search || typeof search !== 'string') return null;
  const normalized = search.startsWith('?') ? search : `?${search}`;
  const next = new URLSearchParams(normalized).get('next');
  if (!next || !isSafeRedirectPath(next)) return null;
  return next;
}

/**
 * Rebuilds a validated relative path through the URL parser so assignment to
 * `window.location` cannot carry an unsanitized taint chain (CodeQL js/xss).
 */
export function toSameOriginPath(path: string, fallback = '/'): string {
  if (!isSafeRedirectPath(path)) return fallback;
  try {
    const parsed = new URL(path, 'https://equipqr.invalid');
    if (parsed.hostname !== 'equipqr.invalid') return fallback;
    const rebuilt = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    return isSafeRedirectPath(rebuilt) ? rebuilt : fallback;
  } catch {
    return fallback;
  }
}
