import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolvePrEvidenceViewport } from './pr-evidence-video.mjs';
import {
  MOBILE_RECORDING_VIEWPORT,
  RECORDING_VIEWPORT,
  computePlaywrightScaledContentRect,
} from './recording-quality.mjs';

describe('recording-quality / pr-evidence-video', () => {
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
});
