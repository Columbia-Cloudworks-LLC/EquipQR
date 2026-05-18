#!/usr/bin/env node
// Schema-drift gate for production Supabase project.
//
// Compares local supabase/migrations/*.sql against the production
// project's supabase_migrations.schema_migrations table. Three failure
// categories are detected:
//
//   pending       - local migration names not present in production. These are
//                   migrations that have never run on production and block release.
//   versionMismatch - production rows whose NAME matches a local file but the VERSION
//                   timestamp differs. Caused by apply_migration (via Supabase MCP or
//                   Dashboard) recording wall-clock timestamps instead of file timestamps.
//                   supabase db push --include-all fails because no local file matches the
//                   remote version string. Repair: supabase migration repair --status reverted
//                   <remoteVersion> followed by supabase db push --include-all --yes.
//   orphanRemote  - production versions absent locally by both version AND name. These are
//                   genuinely unknown remote migrations; operator must create a placeholder
//                   file or revert the history entry.
//
// Failure semantics:
//   - SCHEMA_DRIFT_STRICT=true (or SCHEMA_DRIFT_MODE=strict): all three categories exit 1.
//   - Release PR (base=main): pending, versionMismatch, and orphanRemote all exit 1.
//   - PR targeting preview or push: exit 0 with ::warning:: for pending; ::warning:: for
//     versionMismatch and orphanRemote (logged but not blocking on day-to-day preview work).
//   - Missing SUPABASE_ACCESS_TOKEN on non-release context: ::warning:: + exit 0.
//     Missing on strict/release-PR: ::error:: + exit 1 (fail-closed).
//
// Why match by NAME (not VERSION) for pending check:
//   The Supabase MCP apply_migration tool records wall-clock timestamps.
//   The production project carries historical name-duplicates (e.g. remote_schema,
//   disable_rls_temporarily_test). Name-matching avoids false-positives for those.
//   versionMismatch detection handles the version-drift case separately.
//
// Issue: #735.

import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  classifyDrift,
  formatVersionMismatchRepair,
  formatOrphanRemoteRepair,
} from './schema-drift-lib.js';

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'ymxkzronkhwxzcdcbnwq';
const MGMT_API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'supabase',
  'migrations',
);

const FILENAME_RE = /^(\d{14})_(.+)\.sql$/;

const baseRef = process.env.GITHUB_BASE_REF || '';
const eventName = process.env.GITHUB_EVENT_NAME || '';
const isReleasePR = eventName === 'pull_request' && baseRef === 'main';
const strict =
  process.env.SCHEMA_DRIFT_STRICT === 'true' ||
  process.env.SCHEMA_DRIFT_MODE === 'strict';

function step(msg) {
  process.stdout.write(`${msg}\n`);
}
function ghWarning(title, body) {
  process.stdout.write(`::warning title=${title}::${body}\n`);
}
function ghError(title, body) {
  process.stdout.write(`::error title=${title}::${body}\n`);
}

/**
 * Fork PRs cannot access repository secrets. Used only when the token is
 * missing: same-repo heads still fail closed on release PRs.
 */
async function isForkPullRequest() {
  const eventPath = process.env.GITHUB_EVENT_PATH || '';
  if (eventName !== 'pull_request' || !eventPath) return false;

  try {
    const raw = await readFile(eventPath, 'utf8');
    const evt = JSON.parse(raw);
    const headName = evt?.pull_request?.head?.repo?.full_name;
    const baseName = evt?.pull_request?.base?.repo?.full_name;

    if (typeof headName !== 'string' || typeof baseName !== 'string' || !headName || !baseName) {
      return false;
    }
    return headName !== baseName;
  } catch (err) {
    ghWarning(
      'schema-drift-check',
      `Could not read or parse GITHUB_EVENT_PATH for fork detection: ${err instanceof Error ? err.message : String(err)}. Treating as same-repository PR.`,
    );
    return false;
  }
}

async function readLocalMigrations() {
  const entries = await readdir(MIGRATIONS_DIR, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    if (!e.isFile()) continue;
    const m = e.name.match(FILENAME_RE);
    if (!m) continue;
    out.push({ filename: e.name, version: m[1], name: m[2] });
  }
  out.sort((a, b) => a.version.localeCompare(b.version));
  return out;
}

/** Returns [{version, name}] for all rows in production schema_migrations. */
async function fetchAppliedRows(token) {
  const res = await fetch(MGMT_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query:
        'SELECT version, name FROM supabase_migrations.schema_migrations WHERE name IS NOT NULL',
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase Management API ${res.status}: ${text.slice(0, 500)}`);
  }
  const rows = await res.json();
  const out = [];
  for (const row of rows) {
    if (row && typeof row.version === 'string' && typeof row.name === 'string') {
      out.push({ version: row.version, name: row.name });
    }
  }
  return out;
}

function pendingSummary(pending) {
  const lines = [];
  lines.push(
    `**${pending.length}** local migration${pending.length === 1 ? '' : 's'} not yet on production:`,
  );
  lines.push('');
  lines.push('| Version | Name |');
  lines.push('|---------|------|');
  for (const m of pending) {
    lines.push(`| \`${m.version}\` | \`${m.name}\` |`);
  }
  return lines.join('\n');
}

async function appendStepSummary(text) {
  const out = process.env.GITHUB_STEP_SUMMARY;
  if (!out) return;
  try {
    const fs = await import('node:fs/promises');
    await fs.appendFile(out, text + '\n');
  } catch {
    // Step summary is best-effort; do not fail the gate if it cannot be written.
  }
}

async function main() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  step(`event: ${eventName}, base: ${baseRef || '(none)'}`);
  step(`project_ref: ${PROJECT_REF}`);
  step(`migrations_dir: ${MIGRATIONS_DIR}`);

  if (!token || token.startsWith('op://')) {
    const msg =
      'SUPABASE_ACCESS_TOKEN missing or unresolved — cannot verify schema drift. Plant OP_SERVICE_ACCOUNT_TOKEN as a repo secret and ensure load-1p-secrets resolves supabase-write.';
    if (strict) {
      ghError('schema-drift-check', msg);
      process.exit(1);
    }
    const forkPR = await isForkPullRequest();
    if (isReleasePR && forkPR) {
      ghWarning(
        'schema-drift-check',
        `${msg} Fork PR — repository secrets are unavailable here; skipping drift check for this run.`,
      );
      process.exit(0);
    }
    if (isReleasePR) {
      ghError('schema-drift-check', msg);
      process.exit(1);
    }
    ghWarning('schema-drift-check', `${msg} Skipping drift check for this run.`);
    process.exit(0);
  }

  const local = await readLocalMigrations();
  step(`Local migration files: ${local.length}`);

  let appliedRows;
  try {
    appliedRows = await fetchAppliedRows(token);
  } catch (err) {
    ghError(
      'schema-drift-check',
      `Failed to query production schema_migrations: ${err instanceof Error ? err.message : String(err)}`,
    );
    process.exit(strict || isReleasePR ? 1 : 0);
  }
  step(`Applied rows on production: ${appliedRows.length}`);

  const { pending, versionMismatch, orphanRemote } = classifyDrift(local, appliedRows);
  step(`Pending (local-only names): ${pending.length}`);
  step(`Version mismatches (same name, different timestamp): ${versionMismatch.length}`);
  step(`Orphan remote (no local match by name or version): ${orphanRemote.length}`);

  const hasAnyDrift = pending.length > 0 || versionMismatch.length > 0 || orphanRemote.length > 0;

  if (!hasAnyDrift) {
    step('No drift detected. Local and production schema_migrations are aligned.');
    await appendStepSummary(
      '## Schema-drift check\n\nNo drift detected. Local and production `schema_migrations` are aligned by name and version.',
    );
    return;
  }

  // Build step summary sections.
  const summaryParts = ['## Schema-drift check', ''];
  if (pending.length > 0) {
    summaryParts.push('### Pending local migrations', '', pendingSummary(pending), '');
  }
  if (versionMismatch.length > 0) {
    summaryParts.push(
      '### Version mismatches (remote history vs local files)',
      '',
      formatVersionMismatchRepair(versionMismatch),
      '',
    );
  }
  if (orphanRemote.length > 0) {
    summaryParts.push(
      '### Orphan remote migrations (no local file)',
      '',
      formatOrphanRemoteRepair(orphanRemote),
      '',
    );
  }
  await appendStepSummary(summaryParts.join('\n'));

  // Determine whether to fail or warn for each category.
  const shouldFail = strict || isReleasePR;

  if (pending.length > 0) {
    const md = pendingSummary(pending);
    if (shouldFail) {
      const reason = strict
        ? 'Strict drift check failed'
        : 'Release PR (preview -> main) blocked';
      ghError(
        'schema-drift-check',
        `${reason}: ${pending.length} local migration(s) not yet present in production schema_migrations.`,
      );
      step('');
      step(md);
    } else {
      ghWarning(
        'schema-drift-check',
        `${pending.length} local migration(s) not yet applied to production.`,
      );
      step('');
      step(md);
    }
  }

  if (versionMismatch.length > 0) {
    const md = formatVersionMismatchRepair(versionMismatch);
    if (shouldFail) {
      const reason = strict
        ? 'Strict drift check failed'
        : 'Release PR (preview -> main) blocked';
      ghError(
        'schema-drift-check',
        `${reason}: ${versionMismatch.length} production migration version(s) differ from local file timestamps. supabase db push --include-all will fail until repaired. See step summary for repair commands.`,
      );
      step('');
      step(md);
    } else {
      ghWarning(
        'schema-drift-check',
        `${versionMismatch.length} production migration version(s) do not match local file timestamps. supabase db push --include-all will fail on the next release. See step summary for repair commands.`,
      );
      step('');
      step(md);
    }
  }

  if (orphanRemote.length > 0) {
    const md = formatOrphanRemoteRepair(orphanRemote);
    if (shouldFail) {
      const reason = strict
        ? 'Strict drift check failed'
        : 'Release PR (preview -> main) blocked';
      ghError(
        'schema-drift-check',
        `${reason}: ${orphanRemote.length} production migration version(s) have no matching local file. See step summary for repair options.`,
      );
      step('');
      step(md);
    } else {
      ghWarning(
        'schema-drift-check',
        `${orphanRemote.length} production migration version(s) have no matching local file. See step summary for repair options.`,
      );
      step('');
      step(md);
    }
  }

  if (shouldFail && hasAnyDrift) {
    process.exit(1);
  }
}

main().catch((err) => {
  ghError(
    'schema-drift-check',
    `Unexpected error: ${err instanceof Error ? err.stack || err.message : String(err)}`,
  );
  process.exit(strict || isReleasePR ? 1 : 0);
});
