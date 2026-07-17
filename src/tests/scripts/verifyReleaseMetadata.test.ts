import { describe, it, expect } from 'vitest';
import {
  collectReleaseMetadataErrors,
  compareSemver,
  getReleasedSectionBody,
  getTopReleasedVersion,
  hasNonEmptyReleaseSection,
  hasNonEmptyUnreleasedBullets,
  isReleaseRelevantPath,
  isUnreleasedSectionEmpty,
  parseSemver,
  topReleasedSectionMatches,
} from '../../../scripts/verify-release-metadata.mjs';

const sampleChangelog = `# Changelog

## [Unreleased]

## [3.11.0] - 2026-06-29

### Added

- Historical work orders

## [3.10.0] - 2026-06-24

### Fixed

- Dashboard filter
`;

describe('parseSemver', () => {
  it('parses valid semver strings', () => {
    expect(parseSemver('3.11.0')).toEqual({ major: 3, minor: 11, patch: 0 });
  });

  it('rejects invalid versions', () => {
    expect(parseSemver('3.11')).toBeNull();
    expect(parseSemver('v3.11.0')).toBeNull();
  });
});

describe('compareSemver', () => {
  it('orders versions correctly', () => {
    expect(compareSemver('3.11.1', '3.11.0')).toBe(1);
    expect(compareSemver('3.11.0', '3.11.0')).toBe(0);
    expect(compareSemver('3.10.9', '3.11.0')).toBe(-1);
  });
});

describe('isReleaseRelevantPath', () => {
  it('ignores workflow and docs-only paths', () => {
    expect(isReleaseRelevantPath('AGENTS.md')).toBe(false);
    expect(isReleaseRelevantPath('.cursor/rules/foo.mdc')).toBe(false);
    expect(isReleaseRelevantPath('docs/ops/deployment.md')).toBe(false);
    expect(isReleaseRelevantPath('CHANGELOG.md')).toBe(false);
  });

  it('treats product paths as release relevant', () => {
    expect(isReleaseRelevantPath('src/App.tsx')).toBe(true);
    expect(isReleaseRelevantPath('.github/workflows/ci.yml')).toBe(true);
    expect(isReleaseRelevantPath('scripts/verify-release-metadata.mjs')).toBe(true);
  });
});

describe('changelog parsing', () => {
  it('detects an empty Unreleased section', () => {
    expect(isUnreleasedSectionEmpty(sampleChangelog)).toBe(true);
  });

  it('detects non-empty Unreleased content', () => {
    const changelog = sampleChangelog.replace(
      '## [Unreleased]\n\n## [3.11.0]',
      '## [Unreleased]\n\n### Added\n\n- Pending feature\n\n## [3.11.0]',
    );
    expect(isUnreleasedSectionEmpty(changelog)).toBe(false);
  });

  it('reads version section bodies', () => {
    expect(getReleasedSectionBody(sampleChangelog, '3.11.0')).toContain('Historical work orders');
    expect(hasNonEmptyReleaseSection(sampleChangelog, '3.11.0')).toBe(true);
    expect(hasNonEmptyReleaseSection(sampleChangelog, '9.9.9')).toBe(false);
    expect(getTopReleasedVersion(sampleChangelog)).toBe('3.11.0');
    expect(topReleasedSectionMatches(sampleChangelog, '3.11.0')).toBe(true);
  });

  it('rejects heading-only release sections', () => {
    const changelog = sampleChangelog.replace(
      '### Added\n\n- Historical work orders',
      '### Added\n',
    );

    expect(hasNonEmptyReleaseSection(changelog, '3.11.0')).toBe(false);
  });

  it('rejects out-of-order top release sections', () => {
    const changelog = sampleChangelog.replace(
      '## [Unreleased]\n\n## [3.11.0]',
      '## [Unreleased]\n\n## [9.9.9] - 2099-01-01\n\n### Added\n\n- Future\n\n## [3.11.0]',
    );

    expect(topReleasedSectionMatches(changelog, '3.11.0')).toBe(false);
  });
});

describe('collectReleaseMetadataErrors', () => {
  it('requires a semver bump when release-relevant files changed', () => {
    const errors = collectReleaseMetadataErrors({
      packageVersion: '3.11.0',
      packageLockVersion: '3.11.0',
      changelog: sampleChangelog,
      changedFiles: ['src/features/work-orders/Foo.tsx'],
      baseVersion: '3.11.0',
    });

    expect(errors).toContain(
      'Release-relevant files changed but package.json version "3.11.0" is not newer than base "3.11.0"',
    );
  });

  it('requires a changelog section when the version changes', () => {
    const errors = collectReleaseMetadataErrors({
      packageVersion: '3.11.1',
      packageLockVersion: '3.11.1',
      changelog: sampleChangelog,
      changedFiles: ['scripts/verify-release-metadata.mjs'],
      baseVersion: '3.11.0',
    });

    expect(errors.some((error) => error.includes('CHANGELOG.md must include'))).toBe(true);
  });

  it('passes when version, lockfile, and changelog align', () => {
    const changelog = sampleChangelog.replace(
      '## [Unreleased]\n\n## [3.11.0]',
      '## [Unreleased]\n\n## [3.11.1] - 2026-07-03\n\n### Added\n\n- Release metadata CI gate\n\n## [3.11.0]',
    );

    const errors = collectReleaseMetadataErrors({
      packageVersion: '3.11.1',
      packageLockVersion: '3.11.1',
      changelog,
      changedFiles: ['scripts/verify-release-metadata.mjs'],
      baseVersion: '3.11.0',
    });

    expect(errors).toEqual([]);
  });

  it('allows workflow-only changes without a version bump', () => {
    const errors = collectReleaseMetadataErrors({
      packageVersion: '3.11.0',
      packageLockVersion: '3.11.0',
      changelog: sampleChangelog,
      changedFiles: ['AGENTS.md', '.cursor/rules/foo.mdc'],
      baseVersion: '3.11.0',
    });

    expect(errors).toEqual([]);
  });

  it('preview mode forbids version bumps and requires Unreleased for product changes', () => {
    const withUnreleased = sampleChangelog.replace(
      '## [Unreleased]\n\n## [3.11.0]',
      '## [Unreleased]\n\n### Changed\n\n- Pending integration work\n\n## [3.11.0]',
    );

    expect(collectReleaseMetadataErrors({
      packageVersion: '3.11.0',
      packageLockVersion: '3.11.0',
      changelog: withUnreleased,
      changedFiles: ['src/features/work-orders/Foo.tsx'],
      baseVersion: '3.11.0',
      mode: 'preview',
    })).toEqual([]);

    const bumped = collectReleaseMetadataErrors({
      packageVersion: '3.11.1',
      packageLockVersion: '3.11.1',
      changelog: withUnreleased.replace(
        '## [Unreleased]\n\n### Changed\n\n- Pending integration work\n\n## [3.11.0]',
        '## [Unreleased]\n\n### Changed\n\n- Pending integration work\n\n## [3.11.1] - 2026-07-17\n\n### Changed\n\n- Early bump\n\n## [3.11.0]',
      ),
      changedFiles: ['src/features/work-orders/Foo.tsx'],
      baseVersion: '3.11.0',
      mode: 'preview',
    });
    expect(bumped.some((error) => error.includes('must not bump'))).toBe(true);

    const missingUnreleased = collectReleaseMetadataErrors({
      packageVersion: '3.11.0',
      packageLockVersion: '3.11.0',
      changelog: sampleChangelog,
      changedFiles: ['src/features/work-orders/Foo.tsx'],
      baseVersion: '3.11.0',
      mode: 'preview',
    });
    expect(missingUnreleased.some((error) => error.includes('[Unreleased] has no list bullets'))).toBe(true);

    const headingOnly = sampleChangelog.replace(
      '## [Unreleased]\n\n## [3.11.0]',
      '## [Unreleased]\n\n### Changed\n\n## [3.11.0]',
    );
    expect(hasNonEmptyUnreleasedBullets(headingOnly)).toBe(false);
    const headingOnlyErrors = collectReleaseMetadataErrors({
      packageVersion: '3.11.0',
      packageLockVersion: '3.11.0',
      changelog: headingOnly,
      changedFiles: ['src/features/work-orders/Foo.tsx'],
      baseVersion: '3.11.0',
      mode: 'preview',
    });
    expect(headingOnlyErrors.some((error) => error.includes('[Unreleased] has no list bullets'))).toBe(true);
  });

  it('preview mode allows workflow-only changes without Unreleased notes', () => {
    const errors = collectReleaseMetadataErrors({
      packageVersion: '3.11.0',
      packageLockVersion: '3.11.0',
      changelog: sampleChangelog,
      changedFiles: ['AGENTS.md', '.cursor/rules/foo.mdc'],
      baseVersion: '3.11.0',
      mode: 'preview',
    });

    expect(errors).toEqual([]);
  });

  it('main mode accepts post-release sync bumps that empty Unreleased', () => {
    const changelog = sampleChangelog.replace(
      '## [Unreleased]\n\n## [3.11.0]',
      '## [Unreleased]\n\n## [3.11.1] - 2026-07-17\n\n### Changed\n\n- Release sync\n\n## [3.11.0]',
    );

    const errors = collectReleaseMetadataErrors({
      packageVersion: '3.11.1',
      packageLockVersion: '3.11.1',
      changelog,
      changedFiles: ['scripts/verify-release-metadata.mjs'],
      baseVersion: '3.11.0',
      mode: 'main',
    });

    expect(errors).toEqual([]);
  });
});
