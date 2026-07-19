#!/usr/bin/env node
/**
 * Aggregate Vitest JSON reporter output (CI shard artifacts or local results)
 * and rank slowest files / individual tests by assertion duration.
 *
 * Usage:
 *   node scripts/vitest-perf/report-vitest-durations.mjs [paths...]
 *   npm run test:perf:report -- tmp/vitest-perf/ci-<runId>
 *   npm run test:perf:report -- --markdown --github-summary vitest-results
 *
 * Paths may be JSON files or directories (recursively walked for *.json).
 * Defaults to artifacts/vitest-results when no paths are given.
 *
 * Writes:
 *   tmp/vitest-perf/latest-report.txt
 *   tmp/vitest-perf/latest-report.md
 *   tmp/vitest-perf/latest-report.json
 *
 * Flags:
 *   --markdown          Also print markdown (always written to latest-report.md)
 *   --github-summary    Append markdown to $GITHUB_STEP_SUMMARY when set
 *   --top-files N       Cap file table (default 25)
 *   --top-tests N       Cap individual-test table (default 30)
 *   --slow-ms N         Slow threshold for offender section (default 200)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');

export const DEFAULT_TOP_FILES = 25;
export const DEFAULT_TOP_TESTS = 30;
export const DEFAULT_SLOW_MS = 200;
export const PR_COMMENT_MARKER = '<!-- vitest-duration-report -->';

/**
 * @param {string} dir
 * @param {string[]} out
 */
function collectJsonFiles(dir, out) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectJsonFiles(full, out);
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      out.push(full);
    }
  }
}

/**
 * Expand CLI path args into concrete JSON file paths (files or directories only).
 * @param {string[]} args
 * @returns {string[]}
 */
export function resolveResultFiles(args) {
  const inputs = args.length > 0 ? args : [path.join(repoRoot, 'artifacts', 'vitest-results')];
  /** @type {string[]} */
  const files = [];

  for (const raw of inputs) {
    const resolved = path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
    if (!fs.existsSync(resolved)) {
      console.warn(`[vitest-perf] path not found, skipping: ${resolved}`);
      continue;
    }
    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) {
      collectJsonFiles(resolved, files);
    } else if (stat.isFile() && resolved.endsWith('.json')) {
      files.push(resolved);
    } else {
      console.warn(`[vitest-perf] not a JSON file or directory, skipping: ${resolved}`);
    }
  }

  return [...new Set(files)].sort();
}

/**
 * Normalize a Vitest file path for display (strip CI / local absolute prefixes).
 * @param {string} name
 * @returns {string}
 */
export function normalizeTestFilePath(name) {
  if (!name) return '(unknown)';
  let n = name.replace(/\\/g, '/');
  const markers = [
    '/home/runner/work/EquipQR/EquipQR/',
    'EquipQR/EquipQR/',
  ];
  for (const marker of markers) {
    const idx = n.indexOf(marker);
    if (idx !== -1) {
      n = n.slice(idx + marker.length);
      break;
    }
  }
  const repoNorm = repoRoot.replace(/\\/g, '/');
  if (n.startsWith(`${repoNorm}/`)) {
    n = n.slice(repoNorm.length + 1);
  }
  if (n.includes('/src/')) {
    n = n.slice(n.indexOf('/src/') + 1);
  } else if (n.includes('/scripts/')) {
    n = n.slice(n.indexOf('/scripts/') + 1);
  } else if (n.includes('/vitest/')) {
    n = n.slice(n.indexOf('/vitest/') + 1);
  } else if (n.includes('/e2e/')) {
    n = n.slice(n.indexOf('/e2e/') + 1);
  } else if (n.includes('/supabase/')) {
    n = n.slice(n.indexOf('/supabase/') + 1);
  }
  return n;
}

/**
 * @param {unknown} value
 * @param {number} fallback
 * @returns {number}
 */
export function sanitizePositiveInt(value, fallback) {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

/**
 * @param {string[]} jsonFiles
 * @param {{ slowMs?: number }} [opts]
 * @returns {{
 *   files: Array<{ file: string; ms: number; tests: number; avg: number; fails: number }>;
 *   tests: Array<{ file: string; title: string; ms: number; status: string }>;
 *   summary: {
 *     sourceFiles: number;
 *     tests: number;
 *     totalMs: number;
 *     slowMs: number;
 *     overSlowMs: number;
 *     over200ms: number;
 *     over500ms: number;
 *   };
 * }}
 */
export function aggregateVitestDurations(jsonFiles, opts = {}) {
  const slowMs = sanitizePositiveInt(opts.slowMs, DEFAULT_SLOW_MS);
  /** @type {Map<string, { duration: number; tests: number; fails: number }>} */
  const fileStats = new Map();
  /** @type {Array<{ file: string; title: string; ms: number; status: string }>} */
  const testStats = [];

  for (const filePath of jsonFiles) {
    let payload;
    try {
      payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
      console.warn(`[vitest-perf] failed to parse ${filePath}: ${err instanceof Error ? err.message : err}`);
      continue;
    }

    if (!payload || !Array.isArray(payload.testResults)) {
      continue;
    }

    for (const tr of payload.testResults) {
      const file = normalizeTestFilePath(tr.name ?? '');
      let fileDur = 0;
      const assertions = Array.isArray(tr.assertionResults) ? tr.assertionResults : [];

      for (const a of assertions) {
        const ms = typeof a.duration === 'number' && Number.isFinite(a.duration) ? a.duration : 0;
        fileDur += ms;
        const status = typeof a.status === 'string' ? a.status : 'unknown';
        testStats.push({
          file,
          title: typeof a.fullName === 'string' ? a.fullName : (a.title ?? '(untitled)'),
          ms,
          status,
        });
      }

      const prev = fileStats.get(file) ?? { duration: 0, tests: 0, fails: 0 };
      prev.duration += fileDur;
      prev.tests += assertions.length;
      prev.fails += assertions.filter((a) => a.status && a.status !== 'passed').length;
      fileStats.set(file, prev);
    }
  }

  const files = [...fileStats.entries()]
    .map(([file, v]) => ({
      file,
      ms: Math.round(v.duration),
      tests: v.tests,
      avg: v.tests > 0 ? Math.round(v.duration / v.tests) : 0,
      fails: v.fails,
    }))
    .sort((a, b) => b.ms - a.ms);

  const tests = [...testStats].sort((a, b) => b.ms - a.ms);
  const totalMs = testStats.reduce((sum, t) => sum + t.ms, 0);
  const overSlowMs = testStats.filter((t) => t.ms >= slowMs).length;
  const over200ms = testStats.filter((t) => t.ms >= 200).length;
  const over500ms = testStats.filter((t) => t.ms >= 500).length;

  return {
    files,
    tests,
    summary: {
      sourceFiles: jsonFiles.length,
      tests: testStats.length,
      totalMs: Math.round(totalMs),
      slowMs,
      overSlowMs,
      over200ms,
      over500ms,
    },
  };
}

/**
 * @param {string} title
 * @param {number} max
 */
function truncateTitle(title, max = 100) {
  if (title.length <= max) return title;
  return `${title.slice(0, max - 3)}...`;
}

/** Escape backslashes then pipes for GitHub markdown table cells (CodeQL-complete). */
function escapeMarkdownTableCell(text) {
  return String(text).replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
}

/**
 * @param {ReturnType<typeof aggregateVitestDurations>} report
 * @param {{ topFiles?: number; topTests?: number }} opts
 * @returns {string}
 */
export function formatDurationReport(report, opts = {}) {
  const topFiles = sanitizePositiveInt(opts.topFiles, DEFAULT_TOP_FILES);
  const topTests = sanitizePositiveInt(opts.topTests, DEFAULT_TOP_TESTS);
  const slowMs = report.summary.slowMs;
  const lines = [];

  lines.push('=== Vitest duration report ===');
  lines.push(
    `sources=${report.summary.sourceFiles} tests=${report.summary.tests} totalMs=${report.summary.totalMs} over${slowMs}ms=${report.summary.overSlowMs} over500ms=${report.summary.over500ms}`,
  );
  lines.push('');
  lines.push(`=== TOP ${topFiles} FILES BY TOTAL ASSERTION DURATION (ms) ===`);
  lines.push('ms\ttests\tavg\tfile');
  for (const row of report.files.slice(0, topFiles)) {
    lines.push(`${row.ms}\t${row.tests}\t${row.avg}\t${row.file}`);
  }
  lines.push('');
  lines.push(`=== TOP ${topTests} INDIVIDUAL TESTS ===`);
  lines.push('ms\tstatus\ttitle\tfile');
  for (const row of report.tests.slice(0, topTests)) {
    lines.push(`${Math.round(row.ms)}\t${row.status}\t${truncateTitle(row.title)}\t${path.basename(row.file)}`);
  }
  lines.push('');
  return lines.join('\n');
}

/**
 * GitHub-flavored markdown for Actions job summary / sticky PR comment.
 * @param {ReturnType<typeof aggregateVitestDurations>} report
 * @param {{ topFiles?: number; topTests?: number }} opts
 * @returns {string}
 */
export function formatDurationMarkdown(report, opts = {}) {
  const topFiles = sanitizePositiveInt(opts.topFiles, DEFAULT_TOP_FILES);
  const topTests = sanitizePositiveInt(opts.topTests, DEFAULT_TOP_TESTS);
  const slowMs = report.summary.slowMs;
  const offenders = report.tests.filter((t) => t.ms >= slowMs).slice(0, topTests);
  const totalSec = (report.summary.totalMs / 1000).toFixed(1);
  const lines = [];

  lines.push('## Vitest Duration Report');
  lines.push('');
  lines.push(
    `Threshold: **${slowMs}ms** (\`slowTestThreshold\` in \`vitest.config.ts\` — visibility only; does not fail CI).`,
  );
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| --- | ---: |');
  lines.push(`| Source JSON files | ${report.summary.sourceFiles} |`);
  lines.push(`| Tests | ${report.summary.tests} |`);
  lines.push(`| Total assertion time | ${totalSec}s |`);
  lines.push(`| ≥${slowMs}ms | ${report.summary.overSlowMs} |`);
  lines.push(`| ≥500ms | ${report.summary.over500ms} |`);
  lines.push('');

  if (offenders.length === 0) {
    lines.push(`### Worst offenders (≥${slowMs}ms)`);
    lines.push('');
    lines.push(`None — every assertion was under ${slowMs}ms.`);
    lines.push('');
  } else {
    lines.push(`### Worst offenders (≥${slowMs}ms)`);
    lines.push('');
    lines.push('| ms | Test | File |');
    lines.push('| ---: | --- | --- |');
    for (const row of offenders) {
      const title = escapeMarkdownTableCell(truncateTitle(row.title, 80));
      const file = escapeMarkdownTableCell(path.basename(row.file));
      lines.push(`| ${Math.round(row.ms)} | ${title} | \`${file}\` |`);
    }
    if (report.summary.overSlowMs > offenders.length) {
      lines.push('');
      lines.push(
        `_Showing top ${offenders.length} of ${report.summary.overSlowMs} tests ≥${slowMs}ms._`,
      );
    }
    lines.push('');
  }

  lines.push('### Slowest files (by total assertion time)');
  lines.push('');
  lines.push('| ms | tests | avg | File |');
  lines.push('| ---: | ---: | ---: | --- |');
  for (const row of report.files.slice(0, topFiles)) {
    const file = escapeMarkdownTableCell(row.file);
    lines.push(`| ${row.ms} | ${row.tests} | ${row.avg} | \`${file}\` |`);
  }
  lines.push('');
  lines.push(
    '<sub>Generated by <code>npm run test:perf:report</code> from Vitest JSON shard artifacts (#1349 / #1314).</sub>',
  );
  lines.push('');
  return lines.join('\n');
}

/**
 * @param {string[]} argv
 */
export function parseCliArgs(argv) {
  /** @type {string[]} */
  const paths = [];
  let topFiles = DEFAULT_TOP_FILES;
  let topTests = DEFAULT_TOP_TESTS;
  let slowMs = DEFAULT_SLOW_MS;
  let markdown = false;
  let githubSummary = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--top-files') {
      topFiles = Number(argv[++i]);
      continue;
    }
    if (arg.startsWith('--top-files=')) {
      topFiles = Number(arg.slice('--top-files='.length));
      continue;
    }
    if (arg === '--top-tests') {
      topTests = Number(argv[++i]);
      continue;
    }
    if (arg.startsWith('--top-tests=')) {
      topTests = Number(arg.slice('--top-tests='.length));
      continue;
    }
    if (arg === '--slow-ms') {
      slowMs = Number(argv[++i]);
      continue;
    }
    if (arg.startsWith('--slow-ms=')) {
      slowMs = Number(arg.slice('--slow-ms='.length));
      continue;
    }
    if (arg === '--markdown') {
      markdown = true;
      continue;
    }
    if (arg === '--github-summary') {
      githubSummary = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      return { help: true, paths, topFiles, topTests, slowMs, markdown, githubSummary };
    }
    paths.push(arg);
  }

  return {
    help: false,
    paths,
    topFiles: sanitizePositiveInt(topFiles, DEFAULT_TOP_FILES),
    topTests: sanitizePositiveInt(topTests, DEFAULT_TOP_TESTS),
    slowMs: sanitizePositiveInt(slowMs, DEFAULT_SLOW_MS),
    markdown,
    githubSummary,
  };
}

function main() {
  const cli = parseCliArgs(process.argv.slice(2));
  if (cli.help) {
    console.log(`Usage: node scripts/vitest-perf/report-vitest-durations.mjs [paths...] [flags]

Paths: JSON files or directories (walked for *.json). Defaults to artifacts/vitest-results.

Flags:
  --markdown          Print markdown to stdout (always writes latest-report.md)
  --github-summary    Append markdown to $GITHUB_STEP_SUMMARY when set
  --top-files N       Cap file table (default ${DEFAULT_TOP_FILES})
  --top-tests N       Cap individual-test / offender tables (default ${DEFAULT_TOP_TESTS})
  --slow-ms N         Offender threshold (default ${DEFAULT_SLOW_MS})

Example (CI artifacts):
  gh run download <runId> -n vitest-results-shard-1 -n vitest-results-shard-2 -n vitest-results-shard-3 -n vitest-results-shard-4 -D tmp/vitest-perf/ci-<runId>
  npm run test:perf:report -- tmp/vitest-perf/ci-<runId>`);
    process.exit(0);
  }

  const jsonFiles = resolveResultFiles(cli.paths);
  if (jsonFiles.length === 0) {
    console.error('[vitest-perf] no Vitest JSON result files found');
    process.exit(1);
  }

  const report = aggregateVitestDurations(jsonFiles, { slowMs: cli.slowMs });
  if (report.summary.tests === 0) {
    console.error('[vitest-perf] no testResults found in input JSON (wrong files?)');
    process.exit(1);
  }

  const limits = { topFiles: cli.topFiles, topTests: cli.topTests };
  const text = formatDurationReport(report, limits);
  const markdown = formatDurationMarkdown(report, limits);

  const outDir = path.join(repoRoot, 'tmp', 'vitest-perf');
  fs.mkdirSync(outDir, { recursive: true });
  const txtPath = path.join(outDir, 'latest-report.txt');
  const mdPath = path.join(outDir, 'latest-report.md');
  const jsonPath = path.join(outDir, 'latest-report.json');
  fs.writeFileSync(txtPath, text, 'utf8');
  fs.writeFileSync(mdPath, markdown, 'utf8');
  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        sources: jsonFiles.map((f) => path.relative(repoRoot, f).replace(/\\/g, '/')),
        summary: report.summary,
        topFiles: report.files.slice(0, cli.topFiles),
        topTests: report.tests.slice(0, cli.topTests).map((t) => ({
          ...t,
          ms: Math.round(t.ms),
        })),
        offenders: report.tests
          .filter((t) => t.ms >= cli.slowMs)
          .slice(0, cli.topTests)
          .map((t) => ({ ...t, ms: Math.round(t.ms) })),
      },
      null,
      2,
    ),
    'utf8',
  );

  if (cli.githubSummary && process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`, 'utf8');
    console.log(`[vitest-perf] appended markdown to GITHUB_STEP_SUMMARY`);
  }

  if (cli.markdown) {
    process.stdout.write(markdown);
  } else {
    process.stdout.write(text);
  }
  console.log(`Wrote ${path.relative(repoRoot, txtPath)}`);
  console.log(`Wrote ${path.relative(repoRoot, mdPath)}`);
  console.log(`Wrote ${path.relative(repoRoot, jsonPath)}`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main();
}
