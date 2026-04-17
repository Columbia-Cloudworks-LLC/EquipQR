#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  allocateCanonicalArtifactRelativePath,
  ensureDemoDirectory
} from './lib/demoArtifactPaths.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const flowArg = process.argv.find((arg) => arg.startsWith('--flow=')) || '--flow=demo-record';
const flow = flowArg.split('=')[1] || 'demo-record';
const runIndex = Number.parseInt(process.env.DEMO_RUN_INDEX || '', 10);

/**
 * @param {string} rootDir
 * @returns {Promise<string[]>}
 */
async function collectWebmFiles(rootDir) {
  const results = [];

  /**
   * @param {string} currentDir
   */
  async function walk(currentDir) {
    let entries;
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.webm')) {
        results.push(full);
      }
    }
  }

  await walk(rootDir);
  return results;
}

/**
 * @param {number} startedAtMs
 * @returns {Promise<string | null>}
 */
async function findLatestPlaywrightVideo(startedAtMs) {
  const candidates = await collectWebmFiles(path.join(repoRoot, 'test-results'));
  if (!candidates.length) {
    return null;
  }

  const withTimes = await Promise.all(
    candidates.map(async (candidate) => {
      const stat = await fs.stat(candidate);
      return { candidate, mtimeMs: stat.mtimeMs };
    })
  );

  const recent = withTimes
    .filter((entry) => entry.mtimeMs >= startedAtMs - 1000)
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return (recent[0] || withTimes.sort((a, b) => b.mtimeMs - a.mtimeMs)[0]).candidate;
}

/**
 * @returns {Promise<number>}
 */
async function runPlaywrightTest() {
  return new Promise((resolve, reject) => {
    const child = spawn('playwright test e2e/demo-smoke.spec.ts', {
      cwd: repoRoot,
      stdio: 'inherit',
      shell: true
    });
    child.on('error', reject);
    child.on('close', (code) => resolve(typeof code === 'number' ? code : 1));
  });
}

async function main() {
  const startedAtMs = Date.now();
  const testExitCode = await runPlaywrightTest();

  await ensureDemoDirectory();
  const latestVideo = await findLatestPlaywrightVideo(startedAtMs);
  if (!latestVideo) {
    if (testExitCode === 0) {
      throw new Error('Playwright test passed, but no video artifact was found in test-results.');
    }
    process.exit(testExitCode);
  }

  const relativeTarget = await allocateCanonicalArtifactRelativePath({
    flow,
    runIndex: Number.isInteger(runIndex) ? runIndex : null
  });
  const absoluteTarget = path.resolve(repoRoot, relativeTarget);
  await fs.copyFile(latestVideo, absoluteTarget);
  console.log(`Finalized video: ${absoluteTarget}`);

  process.exit(testExitCode);
}

main().catch((error) => {
  console.error(`Demo record finalization failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
