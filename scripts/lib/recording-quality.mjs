/** Shared Playwright recording dimensions for PR evidence, demos, and E2E video capture. */
export const RECORDING_VIEWPORT = { width: 1920, height: 1080 };

/** GIF frame rate for all local recording exports (PR evidence + demo GIFs). */
export const RECORDING_GIF_FPS = 15;

/** Downscale width for GIF output; source WebM stays at RECORDING_VIEWPORT resolution. */
export const RECORDING_GIF_OUTPUT_WIDTH = 1280;

/**
 * Probe encoded video dimensions with ffprobe.
 * @param {string} videoPath
 * @returns {Promise<{ width: number, height: number }>}
 */
export async function probeVideoDimensions(videoPath) {
  const { spawn } = await import('child_process');

  return new Promise((resolve, reject) => {
    const child = spawn(
      'ffprobe',
      [
        '-v',
        'error',
        '-select_streams',
        'v:0',
        '-show_entries',
        'stream=width,height',
        '-of',
        'csv=s=x:p=0',
        videoPath,
      ],
      { shell: false, stdio: ['ignore', 'pipe', 'pipe'] },
    );

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe failed for ${videoPath}: ${stderr.trim() || stdout.trim()}`));
        return;
      }

      const parts = stdout.trim().split('x');
      if (parts.length !== 2) {
        reject(new Error(`Unexpected ffprobe dimensions for ${videoPath}: ${stdout.trim()}`));
        return;
      }

      resolve({
        width: Number.parseInt(parts[0], 10),
        height: Number.parseInt(parts[1], 10),
      });
    });
  });
}

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
  viewport = RECORDING_VIEWPORT,
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
 * @param {number} inputWidth
 * @param {number} inputHeight
 * @param {{ width: number, height: number }} viewport
 * @param {number} [outputWidth]
 * @returns {{ cropWidth: number, cropHeight: number, cropX: number, cropY: number, scaleFilter: string }}
 */
export function buildRecordingGifVideoFilter(
  inputWidth,
  inputHeight,
  viewport = RECORDING_VIEWPORT,
  outputWidth = RECORDING_GIF_OUTPUT_WIDTH,
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
 * @param {number} [fps]
 * @returns {string}
 */
export function buildRecordingGifFfmpegFilter(
  inputWidth,
  inputHeight,
  viewport = RECORDING_VIEWPORT,
  outputWidth = RECORDING_GIF_OUTPUT_WIDTH,
  fps = RECORDING_GIF_FPS,
) {
  const { cropWidth, cropHeight, cropX, cropY, scaleFilter } = buildRecordingGifVideoFilter(
    inputWidth,
    inputHeight,
    viewport,
    outputWidth,
  );

  return `crop=${cropWidth}:${cropHeight}:${cropX}:${cropY},fps=${fps},${scaleFilter}`;
}
