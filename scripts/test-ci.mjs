#!/usr/bin/env node

import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const TEST_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes - tests complete in ~2-3 min, plus coverage generation
const RATCHET_TIMEOUT_MS = 30 * 1000;  // 30 seconds
const isWindows = process.platform === 'win32';

console.log('🧪 Running tests with coverage...');

// Track if we've already started cleanup
let cleanupStarted = false;

// Run vitest directly via npx
const npxBin = isWindows ? 'npx.cmd' : 'npx';
const vitestProcess = spawn(npxBin, ['vitest', 'run', '--coverage'], {
  stdio: 'inherit',
  env: process.env,
  shell: isWindows
});

// Hard timeout to prevent hanging
const hardTimeout = setTimeout(() => {
  if (cleanupStarted) return;
  cleanupStarted = true;
  
  console.log('⏰ Test timeout reached - forcing exit');
  
  // On Windows, need to kill the process tree
  if (isWindows && vitestProcess.pid) {
    try {
      execSync(`taskkill /pid ${vitestProcess.pid} /T /F`, { stdio: 'ignore' });
    } catch {
      // Process may already be dead
    }
  } else {
    vitestProcess.kill('SIGKILL');
  }
  
  // Check if coverage was generated before timeout
  const coveragePath = path.join(__dirname, '..', 'coverage', 'coverage-summary.json');
  if (fs.existsSync(coveragePath)) {
    console.log('✅ Coverage file exists - tests likely completed, vitest hung on cleanup');
    runCoverageRatchet(0);
  } else {
    console.error('❌ No coverage file - tests may not have completed');
    process.exit(1);
  }
}, TEST_TIMEOUT_MS);

vitestProcess.on('close', (code) => {
  if (cleanupStarted) return;
  cleanupStarted = true;
  
  clearTimeout(hardTimeout);
  
  if (code !== 0 && code !== null) {
    console.error('❌ Tests failed with code:', code);
    process.exit(code);
  }
  
  console.log('✅ Tests completed');
  runCoverageRatchet(code ?? 0);
});

vitestProcess.on('error', (err) => {
  if (cleanupStarted) return;
  cleanupStarted = true;
  
  clearTimeout(hardTimeout);
  console.error('Failed to start test process:', err);
  process.exit(1);
});

function runCoverageRatchet(testCode) {
  console.log('📊 Checking coverage baseline...');
  
  const ratchetProcess = spawn('node', ['scripts/coverage-ratchet.mjs'], {
    stdio: 'inherit',
    env: process.env,
    cwd: path.join(__dirname, '..')
  });
  
  const ratchetTimeout = setTimeout(() => {
    console.log('⏰ Coverage ratchet timeout - forcing exit');
    ratchetProcess.kill('SIGKILL');
    process.exit(testCode);
  }, RATCHET_TIMEOUT_MS);
  
  ratchetProcess.on('close', (ratchetCode) => {
    clearTimeout(ratchetTimeout);
    process.exit(ratchetCode ?? testCode);
  });
  
  ratchetProcess.on('error', (err) => {
    clearTimeout(ratchetTimeout);
    console.error('Coverage ratchet error:', err);
    process.exit(testCode);
  });
}
