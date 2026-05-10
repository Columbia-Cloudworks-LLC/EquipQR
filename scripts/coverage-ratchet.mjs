import fs from 'fs';

/**
 * Enforces merged CI coverage floors against `coverage/coverage-summary.json`
 * (istanbul json-summary shape: total.{lines,statements,functions,branches}.pct).
 *
 * Vitest disables `coverage.thresholds` during `--shard=` runs because each shard
 * only sees a subset of files; this script runs once on the merged report in CI.
 *
 * Default floors MUST stay aligned with `vitest.config.ts` → `coverage.thresholds.global`.
 * Override per metric with env: COVERAGE_THRESHOLD_BRANCHES, _FUNCTIONS, _LINES, _STATEMENTS.
 */
const summaryPath = 'coverage/coverage-summary.json';

/** @type {const} */
const METRICS = ['branches', 'functions', 'lines', 'statements'];

// Baseline reset 2026-05: honest merged-report floors after Vitest 4 + coverage scope changes (PR #799).
// Raise intentionally via https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/816
const DEFAULT_THRESHOLDS = {
  branches: 47,
  functions: 50,
  lines: 55,
  statements: 54,
};

function thresholdFor(metric) {
  const envName = `COVERAGE_THRESHOLD_${metric.toUpperCase()}`;
  if (process.env[envName] !== undefined && process.env[envName] !== '') {
    return Number(process.env[envName]);
  }
  return DEFAULT_THRESHOLDS[metric];
}

if (!fs.existsSync(summaryPath)) {
  console.error(`Coverage summary not found at ${summaryPath}`);
  process.exit(1);
}

const raw = fs.readFileSync(summaryPath, 'utf8');
let summary;
try {
  summary = JSON.parse(raw);
} catch (e) {
  console.error('Failed to parse coverage summary JSON:', e);
  process.exit(1);
}

const failures = [];

for (const metric of METRICS) {
  const required = thresholdFor(metric);
  const pct = Number(summary?.total?.[metric]?.pct);
  if (Number.isNaN(pct)) {
    failures.push(`${metric}: missing or invalid total.${metric}.pct`);
    continue;
  }
  if (pct < required) {
    failures.push(`${metric}: ${pct}% is below required ${required}%`);
  }
}

if (failures.length > 0) {
  console.error('❌ Coverage thresholds not met (merged report):');
  for (const line of failures) {
    console.error(`   - ${line}`);
  }
  process.exit(1);
}

const parts = METRICS.map((m) => `${m} ${Number(summary.total[m].pct)}% (≥${thresholdFor(m)}%)`);
console.log(`✅ Merged coverage OK: ${parts.join('; ')}`);
process.exit(0);
