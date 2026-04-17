import fs from 'fs/promises';
import path from 'path';

const DEMO_DIR = 'tmp/demos';

/**
 * @param {Date} date
 * @returns {string}
 */
export function formatArtifactTimestamp(date = new Date()) {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

/**
 * @param {string} flow
 * @returns {string}
 */
export function sanitizeFlowToken(flow) {
  return String(flow)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'demo';
}

/**
 * @param {number | null | undefined} runIndex
 * @returns {string}
 */
export function formatRunSuffix(runIndex) {
  if (!Number.isInteger(runIndex) || runIndex <= 0) {
    return '';
  }
  return `-run${String(runIndex).padStart(2, '0')}`;
}

/**
 * @param {{ flow: string, runIndex?: number | null, timestamp?: string, extension?: string }} options
 * @returns {string}
 */
export function buildCanonicalArtifactFilename(options) {
  const timestamp = options.timestamp || formatArtifactTimestamp();
  const flow = sanitizeFlowToken(options.flow);
  const ext = options.extension || '.webm';
  const extension = ext.startsWith('.') ? ext : `.${ext}`;
  const runSuffix = formatRunSuffix(options.runIndex);
  return `${timestamp}-${flow}${runSuffix}${extension}`;
}

/**
 * @param {{ flow: string, runIndex?: number | null, timestamp?: string, extension?: string }} options
 * @returns {string}
 */
export function buildCanonicalArtifactRelativePath(options) {
  return `${DEMO_DIR}/${buildCanonicalArtifactFilename(options)}`;
}

/**
 * @param {string} relativePath
 * @returns {Promise<boolean>}
 */
async function relativePathExists(relativePath) {
  try {
    await fs.access(path.resolve(process.cwd(), relativePath));
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} relativePath
 * @returns {Promise<string>}
 */
export async function ensureUniqueRelativePath(relativePath) {
  if (!(await relativePathExists(relativePath))) {
    return relativePath;
  }

  const ext = path.extname(relativePath);
  const base = relativePath.slice(0, -ext.length);
  let attempt = 2;
  while (attempt <= 99) {
    const candidate = `${base}-dup${String(attempt).padStart(2, '0')}${ext}`;
    if (!(await relativePathExists(candidate))) {
      return candidate;
    }
    attempt += 1;
  }

  throw new Error(`Could not allocate unique demo artifact path for ${relativePath}`);
}

/**
 * @param {{ flow: string, runIndex?: number | null, extension?: string, timestamp?: string }} options
 * @returns {Promise<string>}
 */
export async function allocateCanonicalArtifactRelativePath(options) {
  const base = buildCanonicalArtifactRelativePath(options);
  return ensureUniqueRelativePath(base);
}

/**
 * @returns {Promise<void>}
 */
export async function ensureDemoDirectory() {
  await fs.mkdir(path.resolve(process.cwd(), DEMO_DIR), { recursive: true });
}

/**
 * @returns {string}
 */
export function getDemoDirectoryRelativePath() {
  return DEMO_DIR;
}
