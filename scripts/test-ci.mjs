#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Run vitest with coverage
console.log('🧪 Running tests with coverage...');
const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const vitestProcess = spawn(npmBin, ['run', 'test:coverage'], {
  stdio: 'inherit',
  env: process.env
});

vitestProcess.on('exit', (code) => {
  if (code !== 0) {
    console.error('❌ Tests failed');
    process.exit(code);
  }
  
  // Run coverage ratchet
  console.log('📊 Checking coverage baseline...');
  const ratchetProcess = spawn('node', ['scripts/coverage-ratchet.mjs'], {
    stdio: 'inherit',
    env: process.env
  });
  
  ratchetProcess.on('exit', (ratchetCode) => {
    process.exit(ratchetCode);
  });
});

vitestProcess.on('error', (err) => {
  console.error('Failed to start test process:', err);
  process.exit(1);
});