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
  if (inputWidth <= 0 || inputHeight <= 0) {
    throw new Error(`Invalid video dimensions: ${inputWidth}x${inputHeight}`);
  }
  if (viewport.width <= 0 || viewport.height <= 0) {
    throw new Error(`Invalid viewport: ${viewport.width}x${viewport.height}`);
  }

  const targetAspect = viewport.width / viewport.height;
  const inputAspect = inputWidth / inputHeight;

  let cropWidth;
  let cropHeight;
  let cropX;
  let cropY;

  if (inputAspect > targetAspect) {
    cropHeight = toEvenDimension(inputHeight);
    cropWidth = toEvenDimension(inputHeight * targetAspect);
    cropX = toEvenDimension((inputWidth - cropWidth) / 2);
    cropY = 0;
  } else {
    cropWidth = toEvenDimension(inputWidth);
    cropHeight = toEvenDimension(inputWidth / targetAspect);
    cropX = 0;
    cropY = toEvenDimension((inputHeight - cropHeight) / 2);
  }

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
