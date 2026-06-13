/** PR evidence Playwright viewport (keep in sync with playwright.pr-evidence.config.ts). */
export const PR_EVIDENCE_VIEWPORT = { width: 1280, height: 960 };

/**
 * Even dimensions required by ffmpeg crop/scale filters.
 * @param {number} value
 * @returns {number}
 */
export function toEvenDimension(value) {
  const rounded = Math.floor(value);
  return rounded - (rounded % 2);
}

/**
 * Playwright scales the viewport to fit recordVideo.size and letterboxes the result.
 * Empirically the scaled viewport is anchored top-left (padding appears on the right/bottom).
 *
 * @param {number} videoWidth
 * @param {number} videoHeight
 * @param {{ width: number, height: number }} viewport
 * @returns {{ cropWidth: number, cropHeight: number, cropX: number, cropY: number }}
 */
export function computePlaywrightScaledContentRect(
  videoWidth,
  videoHeight,
  viewport = PR_EVIDENCE_VIEWPORT,
) {
  if (videoWidth <= 0 || videoHeight <= 0) {
    throw new Error(`Invalid video dimensions: ${videoWidth}x${videoHeight}`);
  }
  if (viewport.width <= 0 || viewport.height <= 0) {
    throw new Error(`Invalid viewport: ${viewport.width}x${viewport.height}`);
  }

  const scale = Math.min(
    videoWidth / viewport.width,
    videoHeight / viewport.height,
  );
  const contentWidth = toEvenDimension(viewport.width * scale);
  const contentHeight = toEvenDimension(viewport.height * scale);

  return {
    cropWidth: contentWidth,
    cropHeight: contentHeight,
    cropX: 0,
    cropY: 0,
  };
}

/**
 * Center-crop input video to the viewport aspect ratio, then scale for GIF output.
 *
 * @param {number} inputWidth
 * @param {number} inputHeight
 * @param {{ width: number, height: number }} viewport
 * @param {number} [outputWidth]
 * @returns {{ cropWidth: number, cropHeight: number, cropX: number, cropY: number, scaleFilter: string }}
 */
export function buildPrEvidenceGifVideoFilter(
  inputWidth,
  inputHeight,
  viewport = PR_EVIDENCE_VIEWPORT,
  outputWidth = 960,
) {
  const { cropWidth, cropHeight, cropX, cropY } = computePlaywrightScaledContentRect(
    inputWidth,
    inputHeight,
    viewport,
  );

  const scaleFilter = `scale=${outputWidth}:-1:flags=lanczos`;

  return { cropWidth, cropHeight, cropX, cropY, scaleFilter };
}

/**
 * @param {number} inputWidth
 * @param {number} inputHeight
 * @param {{ width: number, height: number }} viewport
 * @param {number} [outputWidth]
 * @returns {string}
 */
export function buildPrEvidenceGifFfmpegFilter(
  inputWidth,
  inputHeight,
  viewport = PR_EVIDENCE_VIEWPORT,
  outputWidth = 960,
) {
  const { cropWidth, cropHeight, cropX, cropY, scaleFilter } = buildPrEvidenceGifVideoFilter(
    inputWidth,
    inputHeight,
    viewport,
    outputWidth,
  );

  return `crop=${cropWidth}:${cropHeight}:${cropX}:${cropY},fps=10,${scaleFilter}`;
}
