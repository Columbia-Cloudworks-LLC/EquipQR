// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { measureColumnAutoFitWidth } from './tableColumnAutoFit';

// jsdom has no canvas implementation, so stub a 2D context whose text is 10px per character.
const CHAR_WIDTH = 10;
const HEADER_EXTRA_WIDTH = 28;

describe('tableColumnAutoFitWidth', () => {
  let originalGetContext: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalGetContext = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'getContext');
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: () => ({
        font: '',
        measureText: (text: string) => ({ width: text.length * CHAR_WIDTH }),
      }),
    });
  });

  afterEach(() => {
    if (originalGetContext) {
      Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', originalGetContext);
    }
  });

  it('sizes the column to the widest sample plus header padding', () => {
    const width = measureColumnAutoFitWidth(['ABC', 'ABCDEFGHIJ'], { minWidth: 48, maxWidth: 600 });
    expect(width).toBe(10 * CHAR_WIDTH + HEADER_EXTRA_WIDTH);
  });

  it('returns at least the configured minimum width', () => {
    const width = measureColumnAutoFitWidth(['A'], { minWidth: 120, maxWidth: 400 });
    expect(width).toBe(120);
  });

  it('respects the configured maximum width', () => {
    const width = measureColumnAutoFitWidth(['A very long part number that should clamp'], {
      minWidth: 80,
      maxWidth: 160,
    });
    expect(width).toBe(160);
  });
});
