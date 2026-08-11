import { vi } from 'vitest';

/** input-otp reads document.elementFromPoint for PWM badge positioning in tests. */
export function ensureElementFromPointMock(): void {
  if (!document.elementFromPoint) {
    document.elementFromPoint = vi.fn().mockReturnValue(null);
  }
}
