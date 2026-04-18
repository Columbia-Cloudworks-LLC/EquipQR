#!/usr/bin/env node

/**
 * Test runner wrapper that prevents Vitest from hanging on Windows.
 *
 * Issue: Vitest workers don't exit cleanly due to open handles from jsdom,
 * React Query cache, or other async operations. Tests complete successfully
 * but the process hangs indefinitely before printing the final summary.
 *
 * Solution: Monitor test output for completion patterns and force exit.
 * When forcing exit, derive exit code from Vitest's summary (do not assume 0).
 */

import { spawn, execSync } from 'child_process';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const isWindows = process.platform === 'win32';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const coverageSummaryPath = path.join(repoRoot, 'coverage', 'coverage-summary.json');

/** Rolling buffer so completion / failure markers can span stdout chunks. */
const OUTPUT_TAIL_MAX = 48_000;
let combinedTail = '';

function appendOutput(chunk) {
  const text = chunk.toString();
  combinedTail = (combinedTail + text).slice(-OUTPUT_TAIL_MAX);
  return text;
}

/** True when Vitest printed the final run summary block (not `Duration` alone). */
function vitestFinalSummaryPresent(tail) {
  return (
    tail.includes('Test Files') &&
    tail.includes('Start at') &&
    tail.includes('Duration')
  );
}

/**
 * Heuristic: any failed tests/files in streamed Vitest output.
 * Kept conservative so we do not exit 0 after a failed run when the child is SIGKILL'd.
 */
function outputSignalsTestFailure(text) {
  if (!text) return false;
  if (/\bFAIL\s+/m.test(text)) return true;
  if (/Test Files\s+[^\n]*\d+\s+failed\b/i.test(text)) return true;
  if (/(?:^|\n)\s*Tests\s+[^\n]*\d+\s+failed\b/i.test(text)) return true;
  if (/[✗]\s+src\//.test(text)) return true;
  if (/\bTest run failed\b/i.test(text)) return true;
  return false;
}

function outputSignalsTestSuccess(text) {
  if (!text || !vitestFinalSummaryPresent(text)) return false;
  const filesPass = /Test Files\s+[^\n]*\b0 failed\b/i.test(text);
  const testsPass = /(?:^|\n)\s*Tests\s+[^\n]*\b0 failed\b/i.test(text);
  return filesPass && testsPass;
}

function getPlannedExitCode() {
  if (outputSignalsTestFailure(combinedTail)) return 1;
  return outputSignalsTestSuccess(combinedTail) ? 0 : 1;
}

// Pass through all CLI arguments to vitest
const args = process.argv.slice(2);

// Default timeout: 5 minutes for normal tests, 8 minutes with coverage
const hasCoverage = args.includes('--coverage');
const DEFAULT_TIMEOUT_MS = hasCoverage ? 8 * 60 * 1000 : 5 * 60 * 1000;

// Check for custom timeout
const timeoutArg = args.find((a) => a.startsWith('--runner-timeout='));
const timeoutMs = timeoutArg
  ? parseInt(timeoutArg.split('=')[1], 10) * 1000
  : DEFAULT_TIMEOUT_MS;

// Remove our custom arg before passing to vitest
const vitestArgs = args.filter((a) => !a.startsWith('--runner-timeout='));

// Build the command
const npxBin = isWindows ? 'npx.cmd' : 'npx';
const vitestProcess = spawn(npxBin, ['vitest', 'run', ...vitestArgs], {
  stdio: ['inherit', 'pipe', 'pipe'],
  env: process.env,
  cwd: repoRoot,
  shell: isWindows,
});

let cleanupStarted = false;
let testFilesCompleted = 0;
let allTestsCompleted = false;
let noOutputTimer = null;
let postTestExitScheduled = false;

/** After tests finish, Vitest may hang; `--coverage` needs extra time for reporters to write JSON. */
function schedulePostTestExit() {
  if (postTestExitScheduled || cleanupStarted) return;
  postTestExitScheduled = true;

  if (hasCoverage) {
    const deadline = Date.now() + 60_000;
    const tick = () => {
      if (cleanupStarted) return;
      if (fs.existsSync(coverageSummaryPath)) {
        setTimeout(() => {
          if (!cleanupStarted) forceExit(getPlannedExitCode());
        }, 500);
        return;
      }
      if (Date.now() > deadline) {
        console.error(`\n❌ Coverage summary not written before timeout: ${coverageSummaryPath}`);
        forceExit(1);
        return;
      }
      setTimeout(tick, 250);
    };
    setTimeout(tick, 500);
    return;
  }

  setTimeout(() => {
    if (!cleanupStarted) {
      forceExit(getPlannedExitCode());
    }
  }, 3000);
}

// Track output to detect test completion
vitestProcess.stdout.on('data', (data) => {
  const text = appendOutput(data);
  process.stdout.write(data);

  // Count completed test files (lines starting with ✓ or ✗)
  const matches = text.match(/[✓✗] src\//g);
  if (matches) {
    testFilesCompleted += matches.length;
  }

  if (vitestFinalSummaryPresent(combinedTail)) {
    allTestsCompleted = true;
    schedulePostTestExit();
  }

  resetNoOutputTimer();
});

vitestProcess.stderr.on('data', (data) => {
  appendOutput(data);
  process.stderr.write(data);
  resetNoOutputTimer();
});

// If no output for 30 seconds after tests have been running, assume completion
function resetNoOutputTimer() {
  if (noOutputTimer) {
    clearTimeout(noOutputTimer);
  }

  // Only set this timer after we've seen some test completions
  if (testFilesCompleted > 100) {
    noOutputTimer = setTimeout(() => {
      if (!cleanupStarted && !allTestsCompleted) {
        console.log('\n❌ No test output for 30s before final summary. Failing closed.');
        forceExit(1);
      }
    }, 30000);
  }
}

function killProcess() {
  if (isWindows && vitestProcess.pid) {
    try {
      execSync(`taskkill /pid ${vitestProcess.pid} /T /F`, { stdio: 'ignore' });
    } catch {
      // Process may already be dead
    }
  } else {
    vitestProcess.kill('SIGKILL');
  }
}

function forceExit(code) {
  if (cleanupStarted) return;
  cleanupStarted = true;
  clearTimeout(hardTimeout);
  if (noOutputTimer) clearTimeout(noOutputTimer);

  killProcess();
  process.exit(code);
}

// Hard timeout to prevent infinite hanging
const hardTimeout = setTimeout(() => {
  console.log('\n⏰ Test runner timeout reached - forcing exit');
  forceExit(1);
}, timeoutMs);

vitestProcess.on('close', (code) => {
  if (cleanupStarted) return;
  cleanupStarted = true;
  clearTimeout(hardTimeout);
  if (noOutputTimer) clearTimeout(noOutputTimer);

  const resolved =
    typeof code === 'number' ? code : getPlannedExitCode();
  process.exit(resolved);
});

vitestProcess.on('error', (err) => {
  if (cleanupStarted) return;
  cleanupStarted = true;
  clearTimeout(hardTimeout);
  if (noOutputTimer) clearTimeout(noOutputTimer);

  console.error('Failed to start vitest:', err);
  process.exit(1);
});

// Handle parent process termination
process.on('SIGINT', () => {
  killProcess();
  process.exit(130);
});

process.on('SIGTERM', () => {
  killProcess();
  process.exit(143);
});
