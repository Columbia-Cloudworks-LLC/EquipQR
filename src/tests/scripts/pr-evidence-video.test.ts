import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  buildPrEvidenceGifFfmpegFilter,
  computePlaywrightScaledContentRect,
  PR_EVIDENCE_VIEWPORT,
  PR_EVIDENCE_MOBILE_VIEWPORT,
  resolvePrEvidenceViewport,
  resolvePrEvidenceGifOutputWidth,
} from '../../../scripts/lib/pr-evidence-video.mjs';
import {
  MOBILE_RECORDING_VIEWPORT,
  RECORDING_GIF_FPS,
  RECORDING_GIF_OUTPUT_WIDTH,
  RECORDING_VIEWPORT,
} from '../../../scripts/lib/recording-quality.mjs';

describe('recording-quality / pr-evidence-video', () => {
  it('uses shared 1920x1080 recording viewport', () => {
    expect(PR_EVIDENCE_VIEWPORT).toEqual(RECORDING_VIEWPORT);
    expect(RECORDING_VIEWPORT).toEqual({ width: 1920, height: 1080 });
  });

  it('exposes mobile recording viewport for PR evidence captures', () => {
    expect(PR_EVIDENCE_MOBILE_VIEWPORT).toEqual(MOBILE_RECORDING_VIEWPORT);
    expect(MOBILE_RECORDING_VIEWPORT).toEqual({ width: 390, height: 844 });
  });

  const originalWidth = process.env.PR_EVIDENCE_VIEWPORT_WIDTH;
  const originalHeight = process.env.PR_EVIDENCE_VIEWPORT_HEIGHT;

  beforeEach(() => {
    delete process.env.PR_EVIDENCE_VIEWPORT_WIDTH;
    delete process.env.PR_EVIDENCE_VIEWPORT_HEIGHT;
  });

  afterEach(() => {
    if (originalWidth === undefined) {
      delete process.env.PR_EVIDENCE_VIEWPORT_WIDTH;
    } else {
      process.env.PR_EVIDENCE_VIEWPORT_WIDTH = originalWidth;
    }
    if (originalHeight === undefined) {
      delete process.env.PR_EVIDENCE_VIEWPORT_HEIGHT;
    } else {
      process.env.PR_EVIDENCE_VIEWPORT_HEIGHT = originalHeight;
    }
  });

  it('resolvePrEvidenceViewport prefers env overrides', () => {
    expect(resolvePrEvidenceViewport()).toEqual(RECORDING_VIEWPORT);

    process.env.PR_EVIDENCE_VIEWPORT_WIDTH = '390';
    process.env.PR_EVIDENCE_VIEWPORT_HEIGHT = '844';
    expect(resolvePrEvidenceViewport()).toEqual(MOBILE_RECORDING_VIEWPORT);
  });

  it('resolvePrEvidenceGifOutputWidth keeps mobile GIFs at native width', () => {
    expect(resolvePrEvidenceGifOutputWidth(RECORDING_VIEWPORT)).toBe(RECORDING_GIF_OUTPUT_WIDTH);
    expect(resolvePrEvidenceGifOutputWidth(MOBILE_RECORDING_VIEWPORT)).toBe(MOBILE_RECORDING_VIEWPORT.width);
  });

  it('crops legacy 1280x720 recordings captured with 1280x960 viewport', () => {
    const crop = computePlaywrightScaledContentRect(1280, 720, {
      width: 1280,
      height: 960,
    });

    expect(crop).toEqual({
      cropWidth: 960,
      cropHeight: 720,
      cropX: 0,
      cropY: 0,
    });
  });

  it('keeps full frame when video size matches recording viewport', () => {
    const crop = computePlaywrightScaledContentRect(1920, 1080, RECORDING_VIEWPORT);

    expect(crop).toEqual({
      cropWidth: 1920,
      cropHeight: 1080,
      cropX: 0,
      cropY: 0,
    });
  });

  it('builds high-quality ffmpeg filter for current recordings', () => {
    const filter = buildPrEvidenceGifFfmpegFilter(1920, 1080, RECORDING_VIEWPORT);

    expect(filter).toBe(
      `crop=1920:1080:0:0,fps=${RECORDING_GIF_FPS},scale=${RECORDING_GIF_OUTPUT_WIDTH}:-1:flags=lanczos`,
    );
  });
});
