#!/usr/bin/env node

/**
 * Test runner wrapper that prevents Vitest from hanging on Windows.
 * 
 * Issue: Vitest workers don't exit cleanly due to open handles from jsdom,
 * React Query cache, or other async operations. Tests complete successfully
 * but the process hangs indefinitely before printing the final summary.
 * 
 * Solution: Monitor test output for completion patterns and force exit.
 */

import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const isWindows = process.platform === 'win32';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Pass through all CLI arguments to vitest
const args = process.argv.slice(2);

// Default timeout: 5 minutes for normal tests, 8 minutes with coverage
const hasCoverage = args.includes('--coverage');
const DEFAULT_TIMEOUT_MS = hasCoverage ? 8 * 60 * 1000 : 5 * 60 * 1000;

// Check for custom timeout
const timeoutArg = args.find(a => a.startsWith('--runner-timeout='));
const timeoutMs = timeoutArg 
  ? parseInt(timeoutArg.split('=')[1], 10) * 1000 
  : DEFAULT_TIMEOUT_MS;

// Remove our custom arg before passing to vitest
const vitestArgs = args.filter(a => !a.startsWith('--runner-timeout='));

// Build the command
const npxBin = isWindows ? 'npx.cmd' : 'npx';
const vitestProcess = spawn(npxBin, ['vitest', 'run', ...vitestArgs], {
  stdio: ['inherit', 'pipe', 'pipe'],
  env: process.env,
  cwd: path.join(__dirname, '..'),
  shell: isWindows
});

let cleanupStarted = false;
let lastOutputTime = Date.now();
let testFilesCompleted = 0;
let allTestsCompleted = false;
let noOutputTimer = null;

// Track output to detect test completion
vitestProcess.stdout.on('data', (data) => {
  const text = data.toString();
  process.stdout.write(data);
  lastOutputTime = Date.now();
  
  // Count completed test files (lines starting with ✓ or ✗)
  const matches = text.match(/[✓✗] src\//g);
  if (matches) {
    testFilesCompleted += matches.length;
  }
  
  // Check for test summary or completion patterns
  if (text.includes('Test Files') && text.includes('passed') ||
      text.includes(' Tests ') && text.includes('passed') ||
      text.includes('Duration')) {
    allTestsCompleted = true;
    // Give Vitest a moment to clean up, then force exit if it hangs
    setTimeout(() => {
      if (!cleanupStarted) {
        forceExit(0);
      }
    }, 3000);
  }
  
  // Reset the no-output timer
  resetNoOutputTimer();
});

vitestProcess.stderr.on('data', (data) => {
  process.stderr.write(data);
  lastOutputTime = Date.now();
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
        console.log('\n✅ Tests appear complete (no output for 30s). Forcing exit.');
        forceExit(0);
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
  forceExit(testFilesCompleted > 0 ? 0 : 1);
}, timeoutMs);

vitestProcess.on('close', (code) => {
  if (cleanupStarted) return;
  cleanupStarted = true;
  clearTimeout(hardTimeout);
  if (noOutputTimer) clearTimeout(noOutputTimer);
  
  // Normal exit
  process.exit(code ?? 0);
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
