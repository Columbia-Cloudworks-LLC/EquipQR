#!/usr/bin/env node
/**
 * Aggregate Vitest JSON reporter output (CI shard artifacts or local results)
 * and rank slowest files / individual tests by assertion duration.
 *
 * Usage:
 *   node scripts/vitest-perf/report-vitest-durations.mjs [paths...]
 *   npm run test:perf:report -- tmp/vitest-perf/ci-<runId>
 *
 * Paths may be JSON files, directories (walked for *.json), or globs.
 * Defaults to artifacts/vitest-results when no paths are given.
 *
 * Writes:
 *   tmp/vitest-perf/latest-report.txt
 *   tmp/vitest-perf/latest-report.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');

const DEFAULT_TOP_FILES = 25;
const DEFAULT_TOP_TESTS = 30;
const SLOW_MS = 200;

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
 * Expand CLI path args into concrete JSON file paths.
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
  if (n.startsWith(repoNorm + '/')) {
    n = n.slice(repoNorm.length + 1);
  }
  // Drop leading drive-relative cwd residue
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
 * @param {string[]} jsonFiles
 * @returns {{
 *   files: Array<{ file: string; ms: number; tests: number; avg: number; fails: number }>;
 *   tests: Array<{ file: string; title: string; ms: number; status: string }>;
 *   summary: { sourceFiles: number; tests: number; totalMs: number; over200ms: number; over500ms: number };
 * }}
 */
export function aggregateVitestDurations(jsonFiles) {
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
      // Skip coverage summaries / other JSON
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

  return {
    files,
    tests,
    summary: {
      sourceFiles: jsonFiles.length,
      tests: testStats.length,
      totalMs: Math.round(totalMs),
      over200ms: testStats.filter((t) => t.ms >= SLOW_MS).length,
      over500ms: testStats.filter((t) => t.ms >= 500).length,
    },
  };
}

/**
 * @param {ReturnType<typeof aggregateVitestDurations>} report
 * @param {{ topFiles?: number; topTests?: number }} opts
 * @returns {string}
 */
export function formatDurationReport(report, opts = {}) {
  const topFiles = opts.topFiles ?? DEFAULT_TOP_FILES;
  const topTests = opts.topTests ?? DEFAULT_TOP_TESTS;
  const lines = [];

  lines.push('=== Vitest duration report ===');
  lines.push(
    `sources=${report.summary.sourceFiles} tests=${report.summary.tests} totalMs=${report.summary.totalMs} over${SLOW_MS}ms=${report.summary.over200ms} over500ms=${report.summary.over500ms}`,
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
    const title = row.title.length > 100 ? `${row.title.slice(0, 97)}...` : row.title;
    lines.push(`${Math.round(row.ms)}\t${row.status}\t${title}\t${path.basename(row.file)}`);
  }
  lines.push('');
  return lines.join('\n');
}

function parseCliArgs(argv) {
  /** @type {string[]} */
  const paths = [];
  let topFiles = DEFAULT_TOP_FILES;
  let topTests = DEFAULT_TOP_TESTS;

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
    if (arg === '--help' || arg === '-h') {
      return { help: true, paths, topFiles, topTests };
    }
    paths.push(arg);
  }

  return { help: false, paths, topFiles, topTests };
}

function main() {
  const cli = parseCliArgs(process.argv.slice(2));
  if (cli.help) {
    console.log(`Usage: node scripts/vitest-perf/report-vitest-durations.mjs [paths...] [--top-files N] [--top-tests N]

Defaults to artifacts/vitest-results when no paths are given.
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

  const report = aggregateVitestDurations(jsonFiles);
  if (report.summary.tests === 0) {
    console.error('[vitest-perf] no testResults found in input JSON (wrong files?)');
    process.exit(1);
  }

  const text = formatDurationReport(report, {
    topFiles: Number.isFinite(cli.topFiles) ? cli.topFiles : DEFAULT_TOP_FILES,
    topTests: Number.isFinite(cli.topTests) ? cli.topTests : DEFAULT_TOP_TESTS,
  });

  const outDir = path.join(repoRoot, 'tmp', 'vitest-perf');
  fs.mkdirSync(outDir, { recursive: true });
  const txtPath = path.join(outDir, 'latest-report.txt');
  const jsonPath = path.join(outDir, 'latest-report.json');
  fs.writeFileSync(txtPath, text, 'utf8');
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
      },
      null,
      2,
    ),
    'utf8',
  );

  process.stdout.write(text);
  console.log(`Wrote ${path.relative(repoRoot, txtPath)}`);
  console.log(`Wrote ${path.relative(repoRoot, jsonPath)}`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main();
}
