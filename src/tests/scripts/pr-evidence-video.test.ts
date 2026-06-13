import { describe, it, expect } from 'vitest';
import {
  buildPrEvidenceGifFfmpegFilter,
  computePlaywrightScaledContentRect,
  PR_EVIDENCE_VIEWPORT,
} from '../../../scripts/lib/pr-evidence-video.mjs';

describe('pr-evidence-video', () => {
  it('crops legacy 1280x720 recordings to top-left scaled viewport (960x720)', () => {
    const crop = computePlaywrightScaledContentRect(1280, 720, PR_EVIDENCE_VIEWPORT);

    expect(crop).toEqual({
      cropWidth: 960,
      cropHeight: 720,
      cropX: 0,
      cropY: 0,
    });
  });

  it('keeps full frame when video size matches viewport', () => {
    const crop = computePlaywrightScaledContentRect(1280, 960, PR_EVIDENCE_VIEWPORT);

    expect(crop).toEqual({
      cropWidth: 1280,
      cropHeight: 960,
      cropX: 0,
      cropY: 0,
    });
  });

  it('builds ffmpeg filter with left-anchored crop, fps, and scale', () => {
    const filter = buildPrEvidenceGifFfmpegFilter(1280, 720, PR_EVIDENCE_VIEWPORT);

    expect(filter).toBe('crop=960:720:0:0,fps=10,scale=960:-1:flags=lanczos');
  });
});
