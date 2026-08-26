import { describe, expect, it } from 'vitest';
import { loadPublicReleases, parsePublicReleases } from './publicReleases';

describe('parsePublicReleases', () => {
  it('omits Unreleased notes, keeps customer-facing bullets, and drops internal-only noise', () => {
    const releases = parsePublicReleases(`
# Changelog

## [Unreleased]

### Changed

- **Unreleased note** — Should not appear.

## [3.1.0] - 2026-08-25

### Added

- **Public releases page (#1460)** — Customers can review published EquipQR changes without opening GitHub.
- **Cloud Agent ephemeral Supabase stack (#1249)** — Internal preview workflow for hosted branches.

### Fixed

- **Notification links (#1431)** — Tapping a notification opens the relevant work order page.

## [3.0.9] - 2026-08-20

### Changed

- **CodeQL Action 4.37.3 (#1402)** — Bump the workflow action to keep Security Scan aligned.
    `);

    expect(releases.map((release) => release.version)).toEqual(['3.1.0', '3.0.9']);
    expect(releases[0].isLatest).toBe(true);
    expect(releases[0].sections).toHaveLength(2);
    expect(releases[0].sections[0]?.entries[0]).toEqual({
      title: 'Public releases page',
      body: 'Customers can review published EquipQR changes without opening GitHub.',
      issueRefs: ['#1460'],
    });
    expect(releases[0].sections.flatMap((section) => section.entries)).not.toContainEqual(
      expect.objectContaining({ title: 'Cloud Agent ephemeral Supabase stack' }),
    );
    expect(releases[1]?.sections).toHaveLength(0);
  });

  it('fails fast when no released section can be extracted', () => {
    expect(() =>
      parsePublicReleases(`
# Changelog

## [Unreleased]

### Added

- Placeholder.
      `),
    ).toThrow(/Unable to extract any released sections/i);
  });

  it('loads the repository changelog into at least one published release', () => {
    const releases = loadPublicReleases();

    expect(releases.length).toBeGreaterThan(0);
    expect(releases[0]?.version).toMatch(/\d+\.\d+\.\d+/);
    expect(releases[0]?.sections.length).toBeGreaterThan(0);
  });
});
