const DOCS_MEDIA_BUCKET = 'docs-media';

/**
 * @param {string} label
 * @returns {string}
 */
export function sanitizeDocsMediaLabel(label) {
  const normalized = String(label)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return normalized || 'screenshot';
}

/**
 * @param {{ collection: string, variant: string, label: string, extension: string }} options
 * @returns {string}
 */
export function buildDocsMediaStoragePath({ collection, variant, label, extension }) {
  const safeCollection = sanitizeDocsMediaLabel(collection);
  const safeVariant = sanitizeDocsMediaLabel(variant);
  const safeLabel = sanitizeDocsMediaLabel(label);
  const safeExtension = String(extension).replace(/^\./, '').toLowerCase();

  return `support/${safeCollection}/${safeVariant}/${safeLabel}.${safeExtension}`;
}

/**
 * @param {string} supabaseUrl
 * @param {string} storagePath
 * @returns {string}
 */
export function buildDocsMediaPublicUrl(supabaseUrl, storagePath) {
  const base = String(supabaseUrl).replace(/\/$/, '');
  const encodedPath = storagePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  return `${base}/storage/v1/object/public/${DOCS_MEDIA_BUCKET}/${encodedPath}`;
}

/**
 * @param {{ alt: string, publicUrl: string }} options
 * @returns {string}
 */
export function buildDocsMediaMarkdownImage({ alt, publicUrl }) {
  return `![${alt}](${publicUrl})`;
}

/**
 * @param {{ publicUrl: string }} options
 * @returns {string}
 */
export function buildDocsMediaMarkdownVideo({ publicUrl }) {
  return publicUrl;
}

export { DOCS_MEDIA_BUCKET };
