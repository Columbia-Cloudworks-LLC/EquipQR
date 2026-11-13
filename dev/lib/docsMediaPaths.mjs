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
