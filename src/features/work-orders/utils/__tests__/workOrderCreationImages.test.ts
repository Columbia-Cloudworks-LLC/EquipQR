import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateAndAppendWorkOrderCreationImages,
  WORK_ORDER_CREATION_MAX_IMAGES,
} from '../workOrderCreationImages';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), warning: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

describe('workOrderCreationImages', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });
  });

  it('does not append when offline and incoming files exist', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true, writable: true });

    const existing = [new File(['a'], 'keep.jpg', { type: 'image/jpeg' })];
    const incoming = [new File(['b'], 'reject.jpg', { type: 'image/jpeg' })];
    expect(validateAndAppendWorkOrderCreationImages(existing, incoming)).toEqual(existing);
  });

  it('appends valid jpeg files up to max count', () => {
    const first = new File(['a'], 'a.jpg', { type: 'image/jpeg' });
    const second = new File(['b'], 'b.jpg', { type: 'image/jpeg' });
    const out = validateAndAppendWorkOrderCreationImages([], [first, second]);
    expect(out).toHaveLength(2);
    expect(out[0].name).toBe('a.jpg');
  });

  it('enforces max image count', () => {
    const files = Array.from({ length: WORK_ORDER_CREATION_MAX_IMAGES + 2 }, (_, i) =>
      new File(['x'], `p${i}.jpg`, { type: 'image/jpeg' }),
    );
    const out = validateAndAppendWorkOrderCreationImages([], files);
    expect(out.length).toBe(WORK_ORDER_CREATION_MAX_IMAGES);
  });
});
