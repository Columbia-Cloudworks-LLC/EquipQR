/**
 * CLI argument parsing for demo-gif.mjs (unit-tested from src/tests/scripts).
 * @typedef {object} DemoGifCliArgs
 * @property {string | null} scenarioName
 * @property {boolean} listOnly
 * @property {string | null} category
 * @property {string | null} audience
 * @property {string | null} tag
 * @property {boolean} videoOnly
 * @property {boolean} smoke
 * @property {string} baseUrl
 * @property {string | null} out
 * @property {string | null} persona
 */

const DEFAULT_BASE_URL = 'http://localhost:8080';

/**
 * @param {string[]} argv
 * @returns {DemoGifCliArgs}
 */
export function parseDemoGifArgs(argv) {
  /** @type {DemoGifCliArgs} */
  const parsed = {
    scenarioName: null,
    listOnly: false,
    category: null,
    audience: null,
    tag: null,
    videoOnly: false,
    smoke: false,
    baseUrl: DEFAULT_BASE_URL,
    out: null,
    persona: null
  };

  for (const arg of argv) {
    if (arg === '--list') {
      parsed.listOnly = true;
      continue;
    }
    if (arg === '--video-only') {
      parsed.videoOnly = true;
      continue;
    }
    if (arg === '--smoke') {
      parsed.smoke = true;
      continue;
    }
    if (arg.startsWith('--category=')) {
      parsed.category = arg.split('=')[1] || null;
      continue;
    }
    if (arg.startsWith('--audience=')) {
      parsed.audience = arg.split('=')[1] || null;
      continue;
    }
    if (arg.startsWith('--tag=')) {
      parsed.tag = arg.split('=')[1] || null;
      continue;
    }
    if (arg.startsWith('--base-url=')) {
      const raw = arg.slice('--base-url='.length).trim();
      parsed.baseUrl = normalizeBaseUrl(raw);
      continue;
    }
    if (arg.startsWith('--out=')) {
      parsed.out = arg.slice('--out='.length).trim() || null;
      continue;
    }
    if (arg.startsWith('--persona=')) {
      parsed.persona = arg.slice('--persona='.length).trim() || null;
      continue;
    }
    if (!arg.startsWith('--') && !parsed.scenarioName) {
      parsed.scenarioName = arg;
    }
  }

  if (parsed.smoke) {
    parsed.videoOnly = true;
  }

  if (parsed.smoke && parsed.scenarioName) {
    throw new Error('Invalid arguments: use either --smoke or a scenario name, not both.');
  }

  validateBaseUrl(parsed.baseUrl);
  if (parsed.out) {
    validateOutPath(parsed.out);
  }

  return parsed;
}

/**
 * @param {string} raw
 */
export function normalizeBaseUrl(raw) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return DEFAULT_BASE_URL;
  }
  return trimmed.replace(/\/+$/, '');
}

/**
 * @param {string} baseUrl
 */
export function validateBaseUrl(baseUrl) {
  let url;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error(`Invalid --base-url: "${baseUrl}" is not a valid URL.`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Invalid --base-url: only http and https are allowed (got ${url.protocol}).`);
  }
}

/**
 * Reject path traversal in user-provided --out=
 * @param {string} out
 */
export function validateOutPath(out) {
  const normalized = out.replace(/\\/g, '/');
  if (normalized.includes('..')) {
    throw new Error('Invalid --out: path must not contain "..".');
  }
  if (!normalized.toLowerCase().endsWith('.webm')) {
    throw new Error('Invalid --out: must end with .webm');
  }
}

/**
 * @param {string} baseUrl
 */
export function isLocalhostBaseUrl(baseUrl) {
  try {
    const { hostname } = new URL(baseUrl);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

/**
 * @param {{ out: string | null, defaultBasename?: string }} opts
 * @returns {string} repo-relative posix path
 */
export function resolveSmokeWebmRelativePath({ out, defaultBasename = 'demo-smoke' }) {
  if (!out) {
    return `tmp/demos/${defaultBasename}.webm`;
  }
  const normalized = out.replace(/\\/g, '/');
  validateOutPath(normalized);
  if (normalized.startsWith('tmp/')) {
    return normalized;
  }
  const base = normalized.split('/').pop();
  return `tmp/demos/${base}`;
}

/**
 * @param {string} scenarioName
 */
export function resolveScenarioWebmRelativePath(scenarioName) {
  const safe = scenarioName.replace(/[/\\]/g, '_');
  return `tmp/demos/${safe}.webm`;
}
