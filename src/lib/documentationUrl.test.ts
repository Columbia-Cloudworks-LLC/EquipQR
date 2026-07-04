import { describe, expect, it } from 'vitest';
import {
  OPERATOR_DAILY_CHECK_INS_DOCS_PATH,
  resolveDocumentationUrl,
  resolveOperatorDailyCheckInsDocsUrl,
  resolveSupportDocsUrl,
} from './documentationUrl';

describe('resolveDocumentationUrl', () => {
  it('uses the local VitePress dev server in local dev', () => {
    expect(resolveDocumentationUrl({ DEV: true })).toBe('http://localhost:5174');
  });

  it('uses the production docs site outside local dev', () => {
    expect(resolveDocumentationUrl({ DEV: false })).toBe('https://equipqr.info');
  });

  it('allows an explicit documentation URL override', () => {
    expect(
      resolveDocumentationUrl({
        DEV: false,
        VITE_DOCUMENTATION_URL: ' http://localhost:4173 ',
      }),
    ).toBe('http://localhost:4173');
  });
});

describe('resolveSupportDocsUrl', () => {
  it('appends /support to the documentation base URL', () => {
    expect(resolveSupportDocsUrl({ DEV: false })).toBe('https://equipqr.info/support');
  });

  it('respects a configured documentation URL override', () => {
    expect(
      resolveSupportDocsUrl({
        DEV: false,
        VITE_DOCUMENTATION_URL: 'http://localhost:4173',
      }),
    ).toBe('http://localhost:4173/support');
  });
});

describe('resolveOperatorDailyCheckInsDocsUrl', () => {
  it('appends the operator daily check-ins guide path in local dev', () => {
    expect(resolveOperatorDailyCheckInsDocsUrl({ DEV: true })).toBe(
      `http://localhost:5174${OPERATOR_DAILY_CHECK_INS_DOCS_PATH}`,
    );
  });

  it('appends the operator daily check-ins guide path in production', () => {
    expect(resolveOperatorDailyCheckInsDocsUrl({ DEV: false })).toBe(
      `https://equipqr.info${OPERATOR_DAILY_CHECK_INS_DOCS_PATH}`,
    );
  });

  it('respects a configured documentation URL override', () => {
    expect(
      resolveOperatorDailyCheckInsDocsUrl({
        DEV: false,
        VITE_DOCUMENTATION_URL: 'http://localhost:4173',
      }),
    ).toBe(`http://localhost:4173${OPERATOR_DAILY_CHECK_INS_DOCS_PATH}`);
  });
});
