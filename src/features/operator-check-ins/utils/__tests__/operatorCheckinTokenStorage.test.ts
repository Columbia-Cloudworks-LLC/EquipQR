import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  clearStoredOperatorCheckinToken,
  getStoredOperatorCheckinToken,
  OPERATOR_CHECKIN_TOKEN_CHANGED_EVENT,
  storeOperatorCheckinToken,
} from '@/features/operator-check-ins/utils/operatorCheckinTokenStorage';

describe('operatorCheckinTokenStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores and retrieves tokens by assignment id', () => {
    storeOperatorCheckinToken('assignment-1', 'raw-token-abc');
    expect(getStoredOperatorCheckinToken('assignment-1')).toBe('raw-token-abc');
    expect(getStoredOperatorCheckinToken('assignment-2')).toBeNull();
  });

  it('clears stored tokens by assignment id', () => {
    storeOperatorCheckinToken('assignment-1', 'raw-token-abc');
    clearStoredOperatorCheckinToken('assignment-1');
    expect(getStoredOperatorCheckinToken('assignment-1')).toBeNull();
  });

  it('dispatches a token-changed event when storing', () => {
    const handler = vi.fn();
    window.addEventListener(OPERATOR_CHECKIN_TOKEN_CHANGED_EVENT, handler);
    storeOperatorCheckinToken('assignment-1', 'raw-token-abc');
    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener(OPERATOR_CHECKIN_TOKEN_CHANGED_EVENT, handler);
  });
});
