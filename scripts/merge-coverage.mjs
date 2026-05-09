#!/usr/bin/env node

/**
 * Merge coverage artifacts produced by sharded test jobs.
 *
 * Expects each shard's artifact to be downloaded into:
 *   coverage-shards/shard-<N>/coverage/{coverage-final.json,lcov.info,coverage-summary.json}
 *
 * Produces, in `coverage/`:
 *   - coverage-final.json   (merged via istanbul-lib-coverage)
 *   - coverage-summary.json (regenerated from the merged map)
 *   - lcov.info             (regenerated from the merged map)
 *
 * Uses dependencies that ship with @vitest/coverage-v8 (istanbul-lib-coverage,
 * istanbul-lib-report, istanbul-reports), so no new top-level deps required.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import libCoverage from 'istanbul-lib-coverage';
import libReport from 'istanbul-lib-report';
import reports from 'istanbul-reports';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const shardsRoot = path.join(repoRoot, 'coverage-shards');
const outDir = path.join(repoRoot, 'coverage');

if (!fs.existsSync(shardsRoot)) {
  console.error(`❌ Expected shard directory not found: ${shardsRoot}`);
  process.exit(1);
}

const shardDirs = fs
  .readdirSync(shardsRoot)
  .map((d) => path.join(shardsRoot, d))
  .filter((d) => fs.statSync(d).isDirectory());

if (shardDirs.length === 0) {
  console.error('❌ No shard directories found to merge');
  process.exit(1);
}

console.log(`📦 Merging coverage from ${shardDirs.length} shards...`);

const map = libCoverage.createCoverageMap({});
let mergedCount = 0;

for (const dir of shardDirs) {
  const finalPath = path.join(dir, 'coverage', 'coverage-final.json');
  if (!fs.existsSync(finalPath)) {
    console.warn(`⚠️  Skipping ${dir} — no coverage-final.json`);
    continue;
  }
  const data = JSON.parse(fs.readFileSync(finalPath, 'utf8'));
  map.merge(data);
  mergedCount += 1;
}

if (mergedCount === 0) {
  console.error('❌ No shard coverage files were merged');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

// Write coverage-final.json (merged)
fs.writeFileSync(
  path.join(outDir, 'coverage-final.json'),
  JSON.stringify(map.toJSON()),
);

// Regenerate lcov.info and json-summary from the merged map
const context = libReport.createContext({
  dir: outDir,
  coverageMap: map,
});

reports.create('lcov').execute(context);
reports.create('json-summary').execute(context);

console.log(`✅ Merged ${mergedCount} shard(s) → ${outDir}`);
