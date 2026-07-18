import { describe, it, expect } from 'vitest';
import { blockHasCatchAllRedirect } from './verify-spa-shell.mjs';

describe('blockHasCatchAllRedirect', () => {
  it('returns true when all required keys are active', () => {
    const block = `
  from = "/*"
  to = "/app-shell.html"
  status = 200
`;
    expect(blockHasCatchAllRedirect(block)).toBe(true);
  });

  it('returns true with comments and extra fields around active keys', () => {
    const block = `
  # catch-all SPA fallback
  from = "/*"
  force = true
  to = "/app-shell.html"
  # optional note
  status = 200
`;
    expect(blockHasCatchAllRedirect(block)).toBe(true);
  });

  it('returns false when to is only present in a full-line comment', () => {
    const block = `
  from = "/*"
  # to = "/app-shell.html"
  status = 200
`;
    expect(blockHasCatchAllRedirect(block)).toBe(false);
  });

  it('returns false when status is only present in a full-line comment', () => {
    const block = `
  from = "/*"
  to = "/app-shell.html"
  # status = 200
`;
    expect(blockHasCatchAllRedirect(block)).toBe(false);
  });
});
