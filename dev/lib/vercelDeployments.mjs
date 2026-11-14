/**
 * Helpers shared by dev/release/promote-vercel-production.mjs and
 * dev/release/wait-for-vercel-deployment.mjs.
 */

export const DEFAULT_TEAM = 'team_78VeGDURoofThjZNJOKEBpP5';
export const DEFAULT_PROJECT = 'prj_P9hRun4B2OdGy8ACCnb0f7jNG6UA';

/** @param {number} ms */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Integer env var with a fallback (used when unset, empty, or non-numeric) and a lower bound.
 * @param {string} name
 * @param {number} fallback
 * @param {number} min
 */
export function envIntAtLeast(name, fallback, min) {
  return Math.max(min, Number.parseInt(process.env[name] || String(fallback), 10) || fallback);
}

/**
 * GET a Vercel API URL with a bearer token and an abort timeout. `handleResponse(res, text)`
 * maps the response to a result; thrown errors (including timeouts) become transient failures.
 *
 * @template T
 * @param {URL} url
 * @param {{ token: string, timeoutMs: number, handleResponse: (res: Response, text: string) => T }} options
 * @returns {Promise<T | { ok: false, transient: true, detail: string }>}
 */
export async function fetchVercelWithTimeout(url, { token, timeoutMs, handleResponse }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    const text = await res.text();
    return handleResponse(res, text);
  } catch (err) {
    const message =
      err && typeof err === 'object' && 'name' in err && err.name === 'AbortError'
        ? `request timeout after ${timeoutMs}ms`
        : err instanceof Error
          ? err.message
          : String(err);
    return { ok: false, transient: true, detail: message };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Prints usage and exits 0 when `--help` / `-h` was passed.
 * @param {() => void} usage
 */
export function exitIfHelpRequested(usage) {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    usage();
    process.exit(0);
  }
}

/** Token, team, project and branch shared by both release scripts. */
export function readVercelEnv() {
  return {
    token: process.env.VERCEL_TOKEN || '',
    teamId: process.env.VERCEL_TEAM_ID || DEFAULT_TEAM,
    projectId: process.env.VERCEL_PROJECT_ID || DEFAULT_PROJECT,
    branch: process.env.VERCEL_BRANCH || 'main',
  };
}
