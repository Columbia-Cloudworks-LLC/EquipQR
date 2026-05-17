// Tests for schema-drift-lib.js using Node.js built-in test runner (Node 18+).
// Run with: node --test .github/scripts/schema-drift-lib.test.js
//
// These cover the four drift-classification cases the plan requires:
//   1. clean        - no drift at all
//   2. local-only   - local name not on production (pending)
//   3. versionMismatch - same name, different timestamp (blocks db push)
//   4. orphanRemote - remote version with no local name match

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { classifyDrift, formatVersionMismatchRepair, formatOrphanRemoteRepair } from './schema-drift-lib.js';

// ---------------------------------------------------------------------------
// classifyDrift
// ---------------------------------------------------------------------------

describe('classifyDrift - clean state', () => {
  test('single migration, exact version match — no drift', () => {
    const local = [{ filename: '20260101000000_foo.sql', version: '20260101000000', name: 'foo' }];
    const applied = [{ version: '20260101000000', name: 'foo' }];
    const { pending, versionMismatch, orphanRemote } = classifyDrift(local, applied);
    assert.equal(pending.length, 0, 'pending should be empty');
    assert.equal(versionMismatch.length, 0, 'versionMismatch should be empty');
    assert.equal(orphanRemote.length, 0, 'orphanRemote should be empty');
  });

  test('multiple migrations, all matched — no drift', () => {
    const local = [
      { filename: '20260101000000_foo.sql', version: '20260101000000', name: 'foo' },
      { filename: '20260102000000_bar.sql', version: '20260102000000', name: 'bar' },
    ];
    const applied = [
      { version: '20260101000000', name: 'foo' },
      { version: '20260102000000', name: 'bar' },
    ];
    const { pending, versionMismatch, orphanRemote } = classifyDrift(local, applied);
    assert.equal(pending.length, 0);
    assert.equal(versionMismatch.length, 0);
    assert.equal(orphanRemote.length, 0);
  });

  test('empty local and empty applied — no drift', () => {
    const { pending, versionMismatch, orphanRemote } = classifyDrift([], []);
    assert.equal(pending.length, 0);
    assert.equal(versionMismatch.length, 0);
    assert.equal(orphanRemote.length, 0);
  });
});

describe('classifyDrift - pending (local-only)', () => {
  test('one local migration not on production', () => {
    const local = [
      { filename: '20260101000000_foo.sql', version: '20260101000000', name: 'foo' },
      { filename: '20260102000000_bar.sql', version: '20260102000000', name: 'bar' },
    ];
    const applied = [{ version: '20260101000000', name: 'foo' }];
    const { pending, versionMismatch, orphanRemote } = classifyDrift(local, applied);
    assert.equal(pending.length, 1);
    assert.equal(pending[0].name, 'bar');
    assert.equal(versionMismatch.length, 0);
    assert.equal(orphanRemote.length, 0);
  });

  test('all local migrations missing from production', () => {
    const local = [
      { filename: '20260101000000_foo.sql', version: '20260101000000', name: 'foo' },
      { filename: '20260102000000_bar.sql', version: '20260102000000', name: 'bar' },
    ];
    const { pending } = classifyDrift(local, []);
    assert.equal(pending.length, 2);
    const names = pending.map((p) => p.name).sort();
    assert.deepEqual(names, ['bar', 'foo']);
  });
});

describe('classifyDrift - versionMismatch (same name, different timestamp)', () => {
  test('production version does not match local version for same name', () => {
    const local = [{ filename: '20260101120000_fix_advisor.sql', version: '20260101120000', name: 'fix_advisor' }];
    const applied = [{ version: '20260101075846', name: 'fix_advisor' }];
    const { pending, versionMismatch, orphanRemote } = classifyDrift(local, applied);
    assert.equal(pending.length, 0, 'name is on production so not pending');
    assert.equal(versionMismatch.length, 1);
    assert.equal(versionMismatch[0].remoteVersion, '20260101075846');
    assert.equal(versionMismatch[0].name, 'fix_advisor');
    assert.equal(versionMismatch[0].localFilename, '20260101120000_fix_advisor.sql');
    assert.equal(versionMismatch[0].localVersion, '20260101120000');
    assert.equal(orphanRemote.length, 0);
  });

  test('multiple version mismatches detected separately from pending', () => {
    const local = [
      { filename: '20260101120000_alpha.sql', version: '20260101120000', name: 'alpha' },
      { filename: '20260102120000_beta.sql', version: '20260102120000', name: 'beta' },
      { filename: '20260103000000_gamma.sql', version: '20260103000000', name: 'gamma' },
    ];
    // alpha and beta have wrong remote versions; gamma is correct; delta is pending local-only
    const local2 = [
      ...local,
      { filename: '20260104000000_delta.sql', version: '20260104000000', name: 'delta' },
    ];
    const applied = [
      { version: '20260101075846', name: 'alpha' },
      { version: '20260102040440', name: 'beta' },
      { version: '20260103000000', name: 'gamma' },
    ];
    const { pending, versionMismatch, orphanRemote } = classifyDrift(local2, applied);
    assert.equal(pending.length, 1, 'delta is pending');
    assert.equal(pending[0].name, 'delta');
    assert.equal(versionMismatch.length, 2);
    assert.equal(orphanRemote.length, 0);
    const mismatchNames = versionMismatch.map((m) => m.name).sort();
    assert.deepEqual(mismatchNames, ['alpha', 'beta']);
  });

  test('exact version match is NOT classified as mismatch', () => {
    const local = [{ filename: '20260101120000_foo.sql', version: '20260101120000', name: 'foo' }];
    const applied = [{ version: '20260101120000', name: 'foo' }];
    const { versionMismatch } = classifyDrift(local, applied);
    assert.equal(versionMismatch.length, 0);
  });
});

describe('classifyDrift - orphanRemote (no local name match)', () => {
  test('production row with unknown name and version', () => {
    const local = [{ filename: '20260101000000_foo.sql', version: '20260101000000', name: 'foo' }];
    const applied = [
      { version: '20260101000000', name: 'foo' },
      { version: '20260201000000', name: 'completely_unknown' },
    ];
    const { pending, versionMismatch, orphanRemote } = classifyDrift(local, applied);
    assert.equal(pending.length, 0);
    assert.equal(versionMismatch.length, 0);
    assert.equal(orphanRemote.length, 1);
    assert.equal(orphanRemote[0].remoteVersion, '20260201000000');
    assert.equal(orphanRemote[0].name, 'completely_unknown');
  });

  test('multiple orphan remote rows', () => {
    const local = [];
    const applied = [
      { version: '20251030013619', name: 'disable_rls_temporarily_test' },
      { version: '20251030013646', name: 'disable_rls_temporarily_test' },
    ];
    const { orphanRemote } = classifyDrift(local, applied);
    assert.equal(orphanRemote.length, 2);
  });
});

describe('classifyDrift - mixed categories', () => {
  test('all four outcomes simultaneously', () => {
    const local = [
      { filename: '20260101120000_foo.sql', version: '20260101120000', name: 'foo' },
      { filename: '20260102000000_bar.sql', version: '20260102000000', name: 'bar' }, // pending
    ];
    const applied = [
      { version: '20260101075846', name: 'foo' }, // versionMismatch
      { version: '20260201000000', name: 'orphan' }, // orphanRemote
    ];
    const { pending, versionMismatch, orphanRemote } = classifyDrift(local, applied);
    assert.equal(pending.length, 1, 'bar is pending');
    assert.equal(versionMismatch.length, 1, 'foo has version mismatch');
    assert.equal(orphanRemote.length, 1, 'orphan has no local match');
  });
});

// ---------------------------------------------------------------------------
// formatVersionMismatchRepair
// ---------------------------------------------------------------------------

describe('formatVersionMismatchRepair', () => {
  test('includes remote version and local filename in output', () => {
    const mismatches = [
      {
        remoteVersion: '20260401075846',
        name: 'fix_advisor_warn_bucket',
        localFilename: '20260401120000_fix_advisor_warn_bucket.sql',
        localVersion: '20260401120000',
      },
    ];
    const out = formatVersionMismatchRepair(mismatches);
    assert.ok(out.includes('20260401075846'), 'should include remote version');
    assert.ok(out.includes('20260401120000_fix_advisor_warn_bucket.sql'), 'should include local filename');
    assert.ok(out.includes('supabase migration repair --status reverted'), 'should include repair command');
    assert.ok(out.includes('supabase db push --include-all --yes'), 'should include push command');
  });
});

// ---------------------------------------------------------------------------
// formatOrphanRemoteRepair
// ---------------------------------------------------------------------------

describe('formatOrphanRemoteRepair', () => {
  test('includes remote version and repair options', () => {
    const orphans = [{ remoteVersion: '20260201000000', name: 'completely_unknown' }];
    const out = formatOrphanRemoteRepair(orphans);
    assert.ok(out.includes('20260201000000'), 'should include remote version');
    assert.ok(out.includes('supabase migration repair --status reverted'), 'should include revert option');
    assert.ok(out.includes('placeholder'), 'should mention placeholder option');
  });
});
