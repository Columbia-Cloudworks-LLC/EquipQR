import fs from 'fs';

const summaryPath = 'coverage/coverage-summary.json';
// Note: CI uses istanbul provider which reports lower coverage than v8 (local)
// Istanbul is ~15-20% more conservative. Baseline adjusted accordingly.
const baseline = Number(process.env.COVERAGE_BASELINE || 51);

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

const pct = Number(summary?.total?.lines?.pct);
if (Number.isNaN(pct)) {
  console.error('Invalid coverage summary format: total.lines.pct missing or not a number');
  process.exit(1);
}

if (pct < baseline) {
  console.error(`❌ Line coverage ${pct}% is below baseline ${baseline}%`);
  process.exit(1);
}

console.log(`✅ Line coverage ${pct}% meets or exceeds baseline ${baseline}%`);
process.exit(0);