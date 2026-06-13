/**
 * Local stack probes for Playwright user regression runs.
 */

/**
 * @param {number} status
 * @returns {boolean}
 */
export function isProbeHttpSuccess(status) {
  // Any sub-500 response means the process is listening (200, 304, 401, etc.).
  return status >= 200 && status < 500;
}

/**
 * @param {string} url
 * @param {number} [timeoutMs]
 * @returns {Promise<boolean>}
 */
export async function probeHttpOk(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    });
    return isProbeHttpSuccess(res.status);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
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
    probeHttpOk(supabaseUrl),
  ]);

  return { appReady, supabaseReady };
}
