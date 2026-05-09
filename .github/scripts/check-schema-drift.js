#!/usr/bin/env node
// Schema-drift gate for production Supabase project.
//
// Compares timestamps in supabase/migrations/*.sql against the production
// project's supabase_migrations.schema_migrations table. When the local set
// has migrations whose NAME is not present on production, emits a markdown
// summary and either fails (preview -> main release gate) or warns (everyday
// preview PRs).
//
// Why match by NAME, not VERSION:
//   The Supabase MCP `apply_migration` tool records wall-clock timestamps
//   instead of file timestamps when applied through that path. The production
//   project also carries 4 historical name-duplicates from before this CR
//   (e.g. `disable_rls_temporarily_test`, `remote_schema`). Matching by name
//   avoids false-positives in both cases. See AGENTS.md for the full
//   timestamp-drift discussion.
//
// Failure semantics (mirrors edge-functions-smoke-test.yml):
//   - Missing SUPABASE_ACCESS_TOKEN: emit ::warning:: and exit 0. Fork PRs
//     and pre-token-plant repos must not be red-lighted by this gate.
//   - Pending migrations on a PR targeting main: exit 1 with markdown summary.
//   - Pending migrations on a PR targeting preview, or on a push: exit 0 with
//     ::warning:: + markdown summary. Drift is expected during day-to-day
//     work; the gate only blocks the release boundary.
//
// Issue: #735.

import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

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

function step(msg) {
  process.stdout.write(`${msg}\n`);
}
function ghWarning(title, body) {
  process.stdout.write(`::warning title=${title}::${body}\n`);
}
function ghError(title, body) {
  process.stdout.write(`::error title=${title}::${body}\n`);
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

async function fetchAppliedNames(token) {
  const res = await fetch(MGMT_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query:
        "SELECT name FROM supabase_migrations.schema_migrations WHERE name IS NOT NULL",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase Management API ${res.status}: ${text.slice(0, 500)}`);
  }
  const rows = await res.json();
  const names = new Set();
  for (const row of rows) {
    if (row && typeof row.name === 'string') names.add(row.name);
  }
  return names;
}

function summary(pending) {
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
    ghWarning(
      'schema-drift-check',
      'SUPABASE_ACCESS_TOKEN not resolved from 1Password — skipping drift check. Plant OP_SERVICE_ACCOUNT_TOKEN as a repo secret to enable this gate.',
    );
    process.exit(0);
  }

  const local = await readLocalMigrations();
  step(`Local migration files: ${local.length}`);

  let applied;
  try {
    applied = await fetchAppliedNames(token);
  } catch (err) {
    ghError(
      'schema-drift-check',
      `Failed to query production schema_migrations: ${err instanceof Error ? err.message : String(err)}`,
    );
    process.exit(isReleasePR ? 1 : 0);
  }
  step(`Applied names on production: ${applied.size}`);

  const pending = local.filter((m) => !applied.has(m.name));
  step(`Pending (local-only): ${pending.length}`);

  if (pending.length === 0) {
    step('No drift detected. Local and production schema_migrations are aligned by name.');
    await appendStepSummary('## Schema-drift check\n\nNo drift detected. Local and production `schema_migrations` are aligned by name.');
    return;
  }

  const md = summary(pending);
  await appendStepSummary(`## Schema-drift check\n\n${md}`);

  if (isReleasePR) {
    ghError(
      'schema-drift-check',
      `Release PR (preview -> main) cannot proceed with ${pending.length} local migration(s) not yet applied to production. Apply the migrations first via the Supabase MCP \`apply_migration\` tool or \`supabase db push --linked --include-all\`, then re-run this check.`,
    );
    step('');
    step(md);
    process.exit(1);
  }

  ghWarning(
    'schema-drift-check',
    `${pending.length} local migration(s) not yet applied to production. The preview -> main release gate will fail until these are applied.`,
  );
  step('');
  step(md);
}

main().catch((err) => {
  ghError(
    'schema-drift-check',
    `Unexpected error: ${err instanceof Error ? err.stack || err.message : String(err)}`,
  );
  process.exit(isReleasePR ? 1 : 0);
});
