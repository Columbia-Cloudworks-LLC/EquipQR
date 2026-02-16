/**
 * Redirect URL validation utilities.
 *
 * Prevents open-redirect attacks by ensuring redirect targets are safe,
 * same-origin relative paths.  Used by every consumer of the
 * `pendingRedirect` sessionStorage value (AuthContext, Auth page,
 * usePendingRedirectHandler).
 */

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
