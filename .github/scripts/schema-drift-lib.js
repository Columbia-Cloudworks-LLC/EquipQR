#!/usr/bin/env node
// Pure classification helpers for Supabase migration drift detection.
// Imported by check-schema-drift.js and tested by schema-drift-lib.test.js.

/**
 * Classify the drift between local migration files and remote schema_migrations rows.
 *
 * @param {Array<{filename: string, version: string, name: string}>} localMigrations
 * @param {Array<{version: string, name: string}>} appliedRows
 * @returns {{
 *   pending: Array<{filename: string, version: string, name: string}>,
 *   versionMismatch: Array<{remoteVersion: string, name: string, localFilename: string, localVersion: string}>,
 *   orphanRemote: Array<{remoteVersion: string, name: string}>,
 * }}
 *
 * Categories:
 *   pending       - local migrations whose name is absent from production. These represent
 *                   SQL that hasn't run on production yet and blocks release PRs.
 *   versionMismatch - production rows whose name matches a local file but the version timestamp
 *                   differs. The SQL ran under a different version (e.g. via Supabase MCP
 *                   apply_migration which records wall-clock timestamps). supabase db push
 *                   will fail because it cannot find the remote version locally. Requires
 *                   supabase migration repair --status reverted <remoteVersion> followed by
 *                   supabase db push --include-all to re-record under the local version.
 *   orphanRemote  - production rows whose version is absent locally AND whose name has no
 *                   local match either. These are genuinely unknown remote migrations; operator
 *                   must decide whether to create a placeholder file or repair the history.
 */
export function classifyDrift(localMigrations, appliedRows) {
  const localByName = new Map();
  const localVersions = new Set();
  for (const m of localMigrations) {
    localByName.set(m.name, m);
    localVersions.add(m.version);
  }

  const prodNames = new Set(appliedRows.map((r) => r.name));

  // Local migrations whose name is not present in production at all.
  const pending = localMigrations.filter((m) => !prodNames.has(m.name));

  const versionMismatch = [];
  const orphanRemote = [];
  for (const row of appliedRows) {
    if (localVersions.has(row.version)) {
      // Exact version present locally — no action needed for this row.
      continue;
    }
    const local = localByName.get(row.name);
    if (local) {
      // Same name exists locally under a different timestamp.
      versionMismatch.push({
        remoteVersion: row.version,
        name: row.name,
        localFilename: local.filename,
        localVersion: local.version,
      });
    } else {
      // Production has a migration version with no local counterpart by name or version.
      orphanRemote.push({ remoteVersion: row.version, name: row.name });
    }
  }

  return { pending, versionMismatch, orphanRemote };
}

/**
 * Build a markdown repair block for version-mismatch entries, suitable for a GitHub
 * step summary or annotation body.
 *
 * @param {Array<{remoteVersion: string, name: string, localFilename: string, localVersion: string}>} mismatches
 * @returns {string}
 */
export function formatVersionMismatchRepair(mismatches) {
  const lines = [];
  lines.push(
    `**${mismatches.length}** production migration version${mismatches.length === 1 ? '' : 's'} ` +
      `found in remote history but absent from \`supabase/migrations/\` by version timestamp:`,
  );
  lines.push('');
  lines.push('| Remote version | Name | Local file |');
  lines.push('|----------------|------|------------|');
  for (const m of mismatches) {
    lines.push(`| \`${m.remoteVersion}\` | \`${m.name}\` | \`${m.localFilename}\` |`);
  }
  lines.push('');
  lines.push('**Why this happens:** The migration was applied to production via Supabase MCP');
  lines.push('`apply_migration` or another path that records a wall-clock timestamp instead of');
  lines.push('the file timestamp. `supabase db push --include-all` cannot reconcile the history');
  lines.push('because no local file matches the remote version string.');
  lines.push('');
  lines.push('**Repair:** Run the following commands against the production project');
  lines.push('(`supabase link --project-ref <prod-ref>` first):');
  lines.push('');
  const versions = mismatches.map((m) => m.remoteVersion).join(' ');
  lines.push('```bash');
  lines.push(`supabase migration repair --status reverted ${versions}`);
  lines.push('supabase db push --include-all --yes');
  lines.push('```');
  lines.push('');
  lines.push(
    'This marks the remote-only versions as reverted, then attempts `supabase db push --include-all --yes` ',
  );
  lines.push('so production history aligns with `supabase/migrations/**` by version.');
  lines.push('');
  lines.push(
    '**Caution:** Not every migration in this repo is safe to replay blindly (for example plain `CREATE POLICY` statements that error when run twice).',
  );
  lines.push(
    'If `db push` fails or replay is unsafe, prefer the **placeholder migration file** path: add `supabase/migrations/<remoteVersion>_<name>.sql` (minimal SQL or `SELECT 1;`) and use `migration repair` as needed, same pattern as orphan-remote repairs below.',
  );
  return lines.join('\n');
}

/**
 * Build a markdown repair block for orphan remote entries (no local name match).
 *
 * @param {Array<{remoteVersion: string, name: string}>} orphans
 * @returns {string}
 */
export function formatOrphanRemoteRepair(orphans) {
  const lines = [];
  lines.push(
    `**${orphans.length}** production migration version${orphans.length === 1 ? '' : 's'} ` +
      `with no matching local file (by version or name):`,
  );
  lines.push('');
  lines.push('| Remote version | Name |');
  lines.push('|----------------|------|');
  for (const o of orphans) {
    lines.push(`| \`${o.remoteVersion}\` | \`${o.name}\` |`);
  }
  lines.push('');
  lines.push('**Why this happens:** These migrations exist in production history but have no');
  lines.push('corresponding file in `supabase/migrations/`. This may indicate a migration was');
  lines.push('applied manually or via a path that never committed the file to the repo.');
  lines.push('');
  lines.push(
    '**Repair options (choose one per orphan):**',
  );
  lines.push(
    '1. If the SQL is no longer needed, mark the remote version as reverted:',
  );
  lines.push('   ```bash');
  const versions = orphans.map((o) => o.remoteVersion).join(' ');
  lines.push(`   supabase migration repair --status reverted ${versions}`);
  lines.push('   ```');
  lines.push(
    '2. If the SQL must stay, create a placeholder file in `supabase/migrations/` matching',
  );
  lines.push('   the exact remote version, e.g.:');
  for (const o of orphans) {
    lines.push(`   \`supabase/migrations/${o.remoteVersion}_${o.name}.sql\` — body: \`SELECT 1;\``);
  }
  return lines.join('\n');
}
