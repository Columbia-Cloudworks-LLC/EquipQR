import { RECORDING_VIEWPORT } from './recording-quality.mjs';

export { RECORDING_VIEWPORT as PR_EVIDENCE_VIEWPORT } from './recording-quality.mjs';

/**
 * Resolve Playwright viewport for PR evidence capture.
 * Env overrides support mobile captures without changing desktop defaults.
 * @returns {{ width: number, height: number }}
 */
export function resolvePrEvidenceViewport(defaultViewport = RECORDING_VIEWPORT) {
  const width = Number.parseInt(process.env.PR_EVIDENCE_VIEWPORT_WIDTH ?? '', 10);
  const height = Number.parseInt(process.env.PR_EVIDENCE_VIEWPORT_HEIGHT ?? '', 10);
  if (Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0) {
    return { width, height };
  }
  return defaultViewport;
}
