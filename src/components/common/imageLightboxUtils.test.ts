import { describe, expect, it } from 'vitest';
import {
  applyPinchScale,
  clampScale,
  getTouchDistance,
  LIGHTBOX_MAX_SCALE,
  LIGHTBOX_MIN_SCALE,
} from '@/components/common/imageLightboxUtils';

describe('imageLightboxUtils', () => {
  it('computes distance between two touch points', () => {
    expect(getTouchDistance({ clientX: 0, clientY: 0 }, { clientX: 3, clientY: 4 })).toBe(5);
  });

  it('clamps scale within lightbox bounds', () => {
    expect(clampScale(0.5)).toBe(LIGHTBOX_MIN_SCALE);
    expect(clampScale(10)).toBe(LIGHTBOX_MAX_SCALE);
    expect(clampScale(2)).toBe(2);
  });

  it('scales proportionally during pinch gestures', () => {
    expect(applyPinchScale(1, 100, 200)).toBe(2);
    expect(applyPinchScale(2, 200, 100)).toBe(1);
  });
});
