import { describe, expect, it } from 'vitest';
import { measureColumnAutoFitWidth } from '../tableColumnAutoFit';

describe('tableColumnAutoFitWidth', () => {
  it('returns at least the configured minimum width', () => {
    const width = measureColumnAutoFitWidth(['A'], { minWidth: 120, maxWidth: 400 });
    expect(width).toBeGreaterThanOrEqual(120);
  });

  it('respects the configured maximum width', () => {
    const width = measureColumnAutoFitWidth(['A very long part number that should clamp'], {
      minWidth: 80,
      maxWidth: 160,
    });
    expect(width).toBeLessThanOrEqual(160);
  });
});
