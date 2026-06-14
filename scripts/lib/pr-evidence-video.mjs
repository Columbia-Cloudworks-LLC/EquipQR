import {
  RECORDING_GIF_OUTPUT_WIDTH,
  RECORDING_VIEWPORT,
  computePlaywrightScaledContentRect,
} from './recording-quality.mjs';

export {
  RECORDING_VIEWPORT as PR_EVIDENCE_VIEWPORT,
  MOBILE_RECORDING_VIEWPORT as PR_EVIDENCE_MOBILE_VIEWPORT,
  computePlaywrightScaledContentRect,
  buildRecordingGifFfmpegFilter as buildPrEvidenceGifFfmpegFilter,
} from './recording-quality.mjs';

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

/**
 * Keep mobile GIFs at native width so uploads stay under storage limits.
 * @param {{ width: number, height: number }} viewport
 * @returns {number}
 */
export function resolvePrEvidenceGifOutputWidth(viewport = RECORDING_VIEWPORT) {
  if (viewport.width < 768) {
    return viewport.width;
  }
  return RECORDING_GIF_OUTPUT_WIDTH;
}

/** Max GIF width for Supabase landing-page-images bucket (5MB file_size_limit). */
export const PR_EVIDENCE_GIF_MAX_OUTPUT_WIDTH = 896;

/** GIF fps tuned for PR evidence uploads (desktop). */
export const PR_EVIDENCE_GIF_FPS_DESKTOP = 8;

/** GIF fps for mobile PR evidence captures. */
export const PR_EVIDENCE_GIF_FPS_MOBILE = 6;

/** Palette colors for PR evidence GIF encoding (mobile + desktop). */
export const PR_EVIDENCE_GIF_PALETTE_COLORS = 96;

/** Apply lead-in trim when source WebM exceeds this duration (seconds). */
export const PR_EVIDENCE_GIF_LEADIN_SKIP_THRESHOLD_SECONDS = 3;

/** Default lead-in trim when threshold exceeded (seconds). */
export const PR_EVIDENCE_GIF_DEFAULT_LEADIN_SKIP_SECONDS = 2;

/**
 * @param {{ width: number, height: number }} viewport
 * @returns {number}
 */
export function resolvePrEvidenceGifFps(viewport = RECORDING_VIEWPORT) {
  return viewport.width < 768 ? PR_EVIDENCE_GIF_FPS_MOBILE : PR_EVIDENCE_GIF_FPS_DESKTOP;
}

/**
 * Cap GIF width for Supabase upload limits while keeping mobile at native width.
 * @param {{ width: number, height: number }} viewport
 * @returns {number}
 */
export function resolvePrEvidenceGifOutputWidthForUpload(viewport = RECORDING_VIEWPORT) {
  return Math.min(resolvePrEvidenceGifOutputWidth(viewport), PR_EVIDENCE_GIF_MAX_OUTPUT_WIDTH);
}

/**
 * @returns {number}
 */
export function resolvePrEvidenceGifPaletteColors() {
  return PR_EVIDENCE_GIF_PALETTE_COLORS;
}

/**
 * Resolve ffmpeg -ss skip for PR evidence GIF conversion.
 * Env PR_EVIDENCE_GIF_START_SECONDS overrides; otherwise trim lead-in only on longer clips.
 * @param {number} durationSeconds
 * @returns {number}
 */
export function resolvePrEvidenceGifStartSeconds(durationSeconds) {
  const fromEnv = Number.parseFloat(process.env.PR_EVIDENCE_GIF_START_SECONDS ?? '');
  if (Number.isFinite(fromEnv) && fromEnv >= 0) {
    return fromEnv;
  }
  if (durationSeconds > PR_EVIDENCE_GIF_LEADIN_SKIP_THRESHOLD_SECONDS) {
    return PR_EVIDENCE_GIF_DEFAULT_LEADIN_SKIP_SECONDS;
  }
  return 0;
}

/**
 * Shared PR evidence GIF encoding parameters for PowerShell/ffmpeg callers.
 * @param {{ width: number, height: number }} viewport
 * @param {number} durationSeconds
 * @returns {{ fps: number, outputWidth: number, paletteColors: number, startSeconds: number }}
 */
export function buildPrEvidenceGifEncodingConfig(
  viewport = RECORDING_VIEWPORT,
  durationSeconds = 0,
) {
  return {
    fps: resolvePrEvidenceGifFps(viewport),
    outputWidth: resolvePrEvidenceGifOutputWidthForUpload(viewport),
    paletteColors: resolvePrEvidenceGifPaletteColors(),
    startSeconds: resolvePrEvidenceGifStartSeconds(durationSeconds),
  };
}

/** H.264 CRF for PR evidence MP4 exports (GitHub inline video). */
export const PR_EVIDENCE_MP4_CRF = 23;

/** x264 preset balancing size and encode speed for local capture runs. */
export const PR_EVIDENCE_MP4_PRESET = 'fast';

/**
 * Crop-only ffmpeg filter for PR evidence MP4 (full recording resolution).
 * @param {number} inputWidth
 * @param {number} inputHeight
 * @param {{ width: number, height: number }} viewport
 * @returns {string}
 */
export function buildPrEvidenceMp4FfmpegFilter(
  inputWidth,
  inputHeight,
  viewport = RECORDING_VIEWPORT,
) {
  const { cropWidth, cropHeight, cropX, cropY } = computePlaywrightScaledContentRect(
    inputWidth,
    inputHeight,
    viewport,
  );

  return `crop=${cropWidth}:${cropHeight}:${cropX}:${cropY}`;
}

/**
 * Shared PR evidence MP4 encoding parameters for PowerShell/ffmpeg callers.
 * @param {{ width: number, height: number }} viewport
 * @param {number} durationSeconds
 * @returns {{ crf: number, preset: string, startSeconds: number }}
 */
export function buildPrEvidenceMp4EncodingConfig(
  viewport = RECORDING_VIEWPORT,
  durationSeconds = 0,
) {
  return {
    crf: PR_EVIDENCE_MP4_CRF,
    preset: PR_EVIDENCE_MP4_PRESET,
    startSeconds: resolvePrEvidenceGifStartSeconds(durationSeconds),
  };
}
