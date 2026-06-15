/**
 * Local stack probes for Playwright user regression runs.
 */

/**
 * Permissive probe: any sub-500 response means the process is listening
 * (200, 304, 401, etc.). Used for Supabase REST where auth may return 401.
 *
 * @param {number} status
 * @returns {boolean}
 */
export function isProbeHttpListening(status) {
  return status >= 200 && status < 500;
}

/**
 * @deprecated Use {@link isProbeHttpListening} — kept for existing imports/tests.
 * @param {number} status
 * @returns {boolean}
 */
export function isProbeHttpSuccess(status) {
  return isProbeHttpListening(status);
}

/**
 * Strict app probe: 2xx or 304 only. Rejects 404/4xx from unrelated listeners.
 *
 * @param {number} status
 * @returns {boolean}
 */
export function isProbeHttpAppReady(status) {
  return (status >= 200 && status < 300) || status === 304;
}

/**
 * @param {string} url
 * @param {(status: number) => boolean} predicate
 * @param {number} [timeoutMs]
 * @returns {Promise<boolean>}
 */
async function probeHttpWithPredicate(url, predicate, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    });
    return predicate(res.status);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Strict probe for the Vite app URL (2xx or 304).
 *
 * @param {string} url
 * @param {number} [timeoutMs]
 * @returns {Promise<boolean>}
 */
export async function probeHttpOk(url, timeoutMs = 5000) {
  return probeHttpWithPredicate(url, isProbeHttpAppReady, timeoutMs);
}

/**
 * Permissive probe for services like Supabase REST (any sub-500 listener).
 *
 * @param {string} url
 * @param {number} [timeoutMs]
 * @returns {Promise<boolean>}
 */
export async function probeHttpListening(url, timeoutMs = 5000) {
  return probeHttpWithPredicate(url, isProbeHttpListening, timeoutMs);
}

/**
 * @param {{ appUrl?: string, supabaseUrl?: string }} [options]
 * @returns {Promise<{ appReady: boolean, supabaseReady: boolean }>}
 */
export async function evaluateLocalStack(options = {}) {
  const appUrl = options.appUrl ?? 'http://localhost:8080';
  const supabaseUrl =
    options.supabaseUrl ?? 'http://127.0.0.1:54321/rest/v1/';

  const [appReady, supabaseReady] = await Promise.all([
    probeHttpOk(appUrl),
    probeHttpListening(supabaseUrl),
  ]);

  return { appReady, supabaseReady };
}
