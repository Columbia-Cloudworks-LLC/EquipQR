import { describe, expect, it } from 'vitest';
import {
  formatArtifactTimestamp,
  sanitizeFlowToken,
  formatRunSuffix,
  buildCanonicalArtifactFilename,
  buildCanonicalArtifactRelativePath
} from '../../../scripts/lib/demoArtifactPaths.mjs';

describe('formatArtifactTimestamp', () => {
  it('formats lexically sortable timestamp', () => {
    const date = new Date('2026-04-17T15:06:07.000Z');
    const ts = formatArtifactTimestamp(new Date(date.getTime() - date.getTimezoneOffset() * 60000));
    expect(ts).toMatch(/^\d{8}-\d{6}$/);
  });
});

describe('sanitizeFlowToken', () => {
  it('normalizes flow token', () => {
    expect(sanitizeFlowToken('Demo Prod !!')).toBe('demo-prod');
    expect(sanitizeFlowToken('  ')).toBe('demo');
  });
});

describe('formatRunSuffix', () => {
  it('renders padded run suffix for reliability loops', () => {
    expect(formatRunSuffix(1)).toBe('-run01');
    expect(formatRunSuffix(12)).toBe('-run12');
    expect(formatRunSuffix(null)).toBe('');
  });
});

describe('buildCanonicalArtifactFilename', () => {
  it('builds canonical shape', () => {
    const name = buildCanonicalArtifactFilename({
      timestamp: '20260417-120000',
      flow: 'demo-prod',
      runIndex: 2
    });
    expect(name).toBe('20260417-120000-demo-prod-run02.webm');
  });
});

describe('buildCanonicalArtifactRelativePath', () => {
  it('builds tmp/demos path with canonical filename', () => {
    const relative = buildCanonicalArtifactRelativePath({
      timestamp: '20260417-120000',
      flow: 'demo-smoke'
    });
    expect(relative).toBe('tmp/demos/20260417-120000-demo-smoke.webm');
  });
});
