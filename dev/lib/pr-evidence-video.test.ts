import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  buildPrEvidenceGifEncodingConfig,
  buildPrEvidenceGifFfmpegFilter,
  buildPrEvidenceMp4EncodingConfig,
  buildPrEvidenceMp4FfmpegFilter,
  computePlaywrightScaledContentRect,
  PR_EVIDENCE_GIF_DEFAULT_LEADIN_SKIP_SECONDS,
  PR_EVIDENCE_GIF_FPS_DESKTOP,
  PR_EVIDENCE_GIF_FPS_MOBILE,
  PR_EVIDENCE_GIF_MAX_OUTPUT_WIDTH,
  PR_EVIDENCE_GIF_PALETTE_COLORS,
  PR_EVIDENCE_MP4_CRF,
  PR_EVIDENCE_MP4_PRESET,
  PR_EVIDENCE_VIEWPORT,
  PR_EVIDENCE_MOBILE_VIEWPORT,
  resolvePrEvidenceGifFps,
  resolvePrEvidenceGifOutputWidthForUpload,
  resolvePrEvidenceGifPaletteColors,
  resolvePrEvidenceGifStartSeconds,
  resolvePrEvidenceViewport,
  resolvePrEvidenceGifOutputWidth,
} from './pr-evidence-video.mjs';
import {
  MOBILE_RECORDING_VIEWPORT,
  RECORDING_GIF_OUTPUT_WIDTH,
  RECORDING_VIEWPORT,
} from './recording-quality.mjs';

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
  const originalGifStart = process.env.PR_EVIDENCE_GIF_START_SECONDS;

  beforeEach(() => {
    delete process.env.PR_EVIDENCE_VIEWPORT_WIDTH;
    delete process.env.PR_EVIDENCE_VIEWPORT_HEIGHT;
    delete process.env.PR_EVIDENCE_GIF_START_SECONDS;
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
    if (originalGifStart === undefined) {
      delete process.env.PR_EVIDENCE_GIF_START_SECONDS;
    } else {
      process.env.PR_EVIDENCE_GIF_START_SECONDS = originalGifStart;
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

  it('resolvePrEvidenceGifOutputWidthForUpload caps desktop width for bucket limits', () => {
    expect(resolvePrEvidenceGifOutputWidthForUpload(RECORDING_VIEWPORT)).toBe(
      PR_EVIDENCE_GIF_MAX_OUTPUT_WIDTH,
    );
    expect(resolvePrEvidenceGifOutputWidthForUpload(MOBILE_RECORDING_VIEWPORT)).toBe(
      MOBILE_RECORDING_VIEWPORT.width,
    );
  });

  it('resolvePrEvidenceGifFps uses shared mobile/desktop defaults', () => {
    expect(resolvePrEvidenceGifFps(RECORDING_VIEWPORT)).toBe(PR_EVIDENCE_GIF_FPS_DESKTOP);
    expect(resolvePrEvidenceGifFps(MOBILE_RECORDING_VIEWPORT)).toBe(PR_EVIDENCE_GIF_FPS_MOBILE);
  });

  it('resolvePrEvidenceGifStartSeconds trims lead-in only on longer clips', () => {
    expect(resolvePrEvidenceGifStartSeconds(2)).toBe(0);
    expect(resolvePrEvidenceGifStartSeconds(4)).toBe(PR_EVIDENCE_GIF_DEFAULT_LEADIN_SKIP_SECONDS);

    process.env.PR_EVIDENCE_GIF_START_SECONDS = '1.5';
    expect(resolvePrEvidenceGifStartSeconds(10)).toBe(1.5);
  });

  it('buildPrEvidenceGifEncodingConfig centralizes upload encoding defaults', () => {
    expect(buildPrEvidenceGifEncodingConfig(RECORDING_VIEWPORT, 10)).toEqual({
      fps: PR_EVIDENCE_GIF_FPS_DESKTOP,
      outputWidth: PR_EVIDENCE_GIF_MAX_OUTPUT_WIDTH,
      paletteColors: PR_EVIDENCE_GIF_PALETTE_COLORS,
      startSeconds: PR_EVIDENCE_GIF_DEFAULT_LEADIN_SKIP_SECONDS,
    });
    expect(resolvePrEvidenceGifPaletteColors()).toBe(PR_EVIDENCE_GIF_PALETTE_COLORS);
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
    const filter = buildPrEvidenceGifFfmpegFilter(
      1920,
      1080,
      RECORDING_VIEWPORT,
      PR_EVIDENCE_GIF_MAX_OUTPUT_WIDTH,
      PR_EVIDENCE_GIF_FPS_DESKTOP,
    );

    expect(filter).toBe(
      `crop=1920:1080:0:0,fps=${PR_EVIDENCE_GIF_FPS_DESKTOP},scale=${PR_EVIDENCE_GIF_MAX_OUTPUT_WIDTH}:-1:flags=lanczos`,
    );
  });

  it('buildPrEvidenceMp4EncodingConfig centralizes H.264 defaults', () => {
    expect(buildPrEvidenceMp4EncodingConfig(RECORDING_VIEWPORT, 10)).toEqual({
      crf: PR_EVIDENCE_MP4_CRF,
      preset: PR_EVIDENCE_MP4_PRESET,
      startSeconds: PR_EVIDENCE_GIF_DEFAULT_LEADIN_SKIP_SECONDS,
    });
  });

  it('buildPrEvidenceMp4FfmpegFilter crops without downscaling for GitHub upload', () => {
    const filter = buildPrEvidenceMp4FfmpegFilter(1920, 1080, RECORDING_VIEWPORT);
    expect(filter).toBe('crop=1920:1080:0:0');
  });
});
