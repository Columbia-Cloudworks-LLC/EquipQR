import { describe, expect, it } from 'vitest';
import {
  sanitizePrEvidenceFlow,
  prEvidenceRelativeDir,
  sanitizeStorageBranchSlug,
  buildPrEvidenceStoragePath,
} from './prEvidencePaths.mjs';

describe('sanitizePrEvidenceFlow', () => {
  it('normalizes flow slugs', () => {
    expect(sanitizePrEvidenceFlow('GW Disconnect UX')).toBe('gw-disconnect-ux');
    expect(sanitizePrEvidenceFlow('  ')).toBe('change');
  });
});

describe('prEvidenceRelativeDir', () => {
  it('builds tmp/pr-evidence path', () => {
    expect(prEvidenceRelativeDir('my-feature')).toBe('tmp/pr-evidence/my-feature');
  });
});

describe('sanitizeStorageBranchSlug', () => {
  it('normalizes branch names for storage', () => {
    expect(sanitizeStorageBranchSlug('feat/issue-123-gw_disconnect')).toBe(
      'feat-issue-123-gw-disconnect',
    );
  });
});

describe('buildPrEvidenceStoragePath', () => {
  it('builds landing-page-images storage prefix', () => {
    expect(
      buildPrEvidenceStoragePath({
        branch: 'feat/gw-disconnect',
        filename: 'gw-disconnect-01-after.png',
      }),
    ).toBe('pr-evidence/feat-gw-disconnect/gw-disconnect-01-after.png');
  });
});
