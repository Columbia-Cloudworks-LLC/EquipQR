import { describe, expect, it } from 'vitest';
import {
  PRIVACY_REQUEST_DETAILS_MAX_LENGTH,
  PRIVACY_REQUEST_NAME_MAX_LENGTH,
  privacyRequestFieldTooLong,
} from './privacyRequestLimits';

describe('privacy request length caps (RT-06)', () => {
  it('rejects oversized name and details independently of captcha', () => {
    expect(privacyRequestFieldTooLong('a'.repeat(PRIVACY_REQUEST_NAME_MAX_LENGTH + 1), PRIVACY_REQUEST_NAME_MAX_LENGTH)).toBe(true);
    expect(privacyRequestFieldTooLong('ok', PRIVACY_REQUEST_NAME_MAX_LENGTH)).toBe(false);
    expect(
      privacyRequestFieldTooLong(
        'x'.repeat(PRIVACY_REQUEST_DETAILS_MAX_LENGTH + 1),
        PRIVACY_REQUEST_DETAILS_MAX_LENGTH,
      ),
    ).toBe(true);
  });

  it('allows omitted details', () => {
    expect(privacyRequestFieldTooLong(undefined, PRIVACY_REQUEST_DETAILS_MAX_LENGTH)).toBe(false);
  });
});
