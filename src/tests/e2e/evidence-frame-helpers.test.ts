import { describe, expect, it } from 'vitest';
import {
  EVIDENCE_FRAME_PADDING_PX,
  evaluateFrameReadiness,
} from '../../../e2e/pr-evidence/shared/evidence-frame-helpers';

describe('evaluateFrameReadiness', () => {
  const viewport = { width: 390, height: 844 };

  it('passes when there is no overflow and the target fits with padding', () => {
    const result = evaluateFrameReadiness(viewport, 390, {
      top: 16,
      left: 16,
      bottom: 80,
      right: 200,
      width: 184,
      height: 64,
    });

    expect(result.ok).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it('flags horizontal overflow', () => {
    const result = evaluateFrameReadiness(viewport, 420);

    expect(result.ok).toBe(false);
    expect(result.violations[0]).toMatch(/horizontal overflow/);
  });

  it('flags targets clipped by the viewport edges', () => {
    const result = evaluateFrameReadiness(
      viewport,
      viewport.width,
      {
        top: 2,
        left: 2,
        bottom: viewport.height - 2,
        right: viewport.width - 2,
        width: viewport.width - 4,
        height: viewport.height - 4,
      },
      EVIDENCE_FRAME_PADDING_PX,
    );

    expect(result.ok).toBe(false);
    expect(result.violations.join(' ')).toMatch(/clipped at top/);
    expect(result.violations.join(' ')).toMatch(/clipped at bottom/);
  });

  it('flags zero-size targets', () => {
    const result = evaluateFrameReadiness(viewport, viewport.width, {
      top: 40,
      left: 40,
      bottom: 40,
      right: 40,
      width: 0,
      height: 0,
    });

    expect(result.ok).toBe(false);
    expect(result.violations.join(' ')).toMatch(/zero rendered size/);
  });
});
