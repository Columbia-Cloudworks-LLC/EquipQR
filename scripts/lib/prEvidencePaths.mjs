const PR_EVIDENCE_ROOT = 'tmp/pr-evidence';

/**
 * @param {string} flow
 * @returns {string}
 */
export function sanitizePrEvidenceFlow(flow) {
  return String(flow)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'change';
}

/**
 * @param {string} flow
 * @returns {string}
 */
export function prEvidenceRelativeDir(flow) {
  return `${PR_EVIDENCE_ROOT}/${sanitizePrEvidenceFlow(flow)}`;
}

/**
 * @param {string} branchOrSlug
 * @returns {string}
 */
export function sanitizeStorageBranchSlug(branchOrSlug) {
  return String(branchOrSlug)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'preview';
}

/**
 * @param {{ branch: string, filename: string }} options
 * @returns {string}
 */
export function buildPrEvidenceStoragePath({ branch, filename }) {
  const branchSlug = sanitizeStorageBranchSlug(branch);
  const safeName = String(filename).replace(/[^a-zA-Z0-9._-]+/g, '-');
  return `pr-evidence/${branchSlug}/${safeName}`;
}
