import { describe, it, expect } from 'vitest';
import {
  buildPrEvidenceGifFfmpegFilter,
  buildPrEvidenceGifVideoFilter,
  PR_EVIDENCE_VIEWPORT,
} from '../../../scripts/lib/pr-evidence-video.mjs';

describe('pr-evidence-video', () => {
  it('center-crops 16:9 video to 4:3 viewport aspect ratio', () => {
    const crop = buildPrEvidenceGifVideoFilter(1280, 720, PR_EVIDENCE_VIEWPORT);

    expect(crop.cropWidth).toBe(960);
    expect(crop.cropHeight).toBe(720);
    expect(crop.cropX).toBe(160);
    expect(crop.cropY).toBe(0);
  });

  it('keeps full frame when input already matches viewport aspect ratio', () => {
    const crop = buildPrEvidenceGifVideoFilter(1280, 960, PR_EVIDENCE_VIEWPORT);

    expect(crop.cropWidth).toBe(1280);
    expect(crop.cropHeight).toBe(960);
    expect(crop.cropX).toBe(0);
    expect(crop.cropY).toBe(0);
  });

  it('builds ffmpeg filter with crop, fps, and scale', () => {
    const filter = buildPrEvidenceGifFfmpegFilter(1280, 720, PR_EVIDENCE_VIEWPORT);

    expect(filter).toBe('crop=960:720:160:0,fps=10,scale=960:-1:flags=lanczos');
  });
});
