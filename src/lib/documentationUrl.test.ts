import { describe, expect, it } from 'vitest';
import { resolveDocumentationUrl } from './documentationUrl';

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
