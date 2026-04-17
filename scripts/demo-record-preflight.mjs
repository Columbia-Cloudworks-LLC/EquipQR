#!/usr/bin/env node

import { runProdRecordingPreflight } from './lib/playwrightPreflight.mjs';

const requireStorageState = process.argv.includes('--require-storage-state');

async function main() {
  const result = await runProdRecordingPreflight({ requireStorageState });

  if (result.warnings.length) {
    for (const warning of result.warnings) {
      console.warn(`[demo:preflight][warn]\n${warning}\n`);
    }
  }

  if (!result.ok) {
    console.error('[demo:preflight][error] Production recording preflight failed.');
    for (const error of result.errors) {
      console.error(`\n${error}\n`);
    }
    process.exit(1);
  }

  console.log('[demo:preflight] OK');
  console.log(`Chromium executable: ${result.executablePath}`);
  if (result.storageStatePath) {
    console.log(`Storage state: ${result.storageStatePath}`);
  }
}

main().catch((error) => {
  console.error(`[demo:preflight][error] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
