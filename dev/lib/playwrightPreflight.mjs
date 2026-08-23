import fs from 'fs/promises';
import { chromium } from '@playwright/test';

/**
 * @param {string} filePath
 * @returns {Promise<boolean>}
 */
async function fileExists(filePath) {
  if (!filePath) return false;
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * @typedef {object} PreflightEvaluationInput
 * @property {boolean} browserExecutableExists
 * @property {string} executablePath
 * @property {boolean} requireStorageState
 * @property {string | null} storageStatePath
 * @property {boolean} storageStateExists
 */

/**
 * @typedef {object} PreflightEvaluation
 * @property {boolean} ok
 * @property {string[]} errors
 * @property {string[]} warnings
 */

/**
 * @param {PreflightEvaluationInput} input
 * @returns {PreflightEvaluation}
 */
export function evaluatePreflight(input) {
  const errors = [];
  const warnings = [];

  if (!input.browserExecutableExists) {
    errors.push(
      [
        'Playwright Chromium browser binary is missing.',
        `Expected executable path: ${input.executablePath}`,
        'Run: npx playwright install chromium'
      ].join('\n')
    );
  }

  if (input.requireStorageState) {
    if (!input.storageStatePath) {
      errors.push(
        [
          'DEMO_STORAGE_STATE is required for production recording.',
          'Set it to a saved auth state file, for example:',
          '$env:DEMO_STORAGE_STATE="tmp/demos/auth.json"',
          'Create it with:',
          'npx playwright codegen https://equipqr.app --save-storage=tmp/demos/auth.json'
        ].join('\n')
      );
    } else if (!input.storageStateExists) {
      errors.push(
        [
          `DEMO_STORAGE_STATE points to a missing file: ${input.storageStatePath}`,
          'Recreate it with:',
          'npx playwright codegen https://equipqr.app --save-storage=tmp/demos/auth.json'
        ].join('\n')
      );
    }
  } else if (!input.storageStatePath) {
    warnings.push(
      'DEMO_STORAGE_STATE is not set. This is fine for localhost quick-login flows, but production runs should provide a storage state file.'
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * @param {{ requireStorageState?: boolean, storageStatePath?: string | null }} [options]
 * @returns {Promise<{
 *  ok: boolean,
 *  executablePath: string,
 *  storageStatePath: string | null,
 *  browserExecutableExists: boolean,
 *  storageStateExists: boolean,
 *  errors: string[],
 *  warnings: string[]
 * }>}
 */
export async function runProdRecordingPreflight(options = {}) {
  const requireStorageState = Boolean(options.requireStorageState);
  const storageStatePath = options.storageStatePath || process.env.DEMO_STORAGE_STATE || null;

  const executablePath = chromium.executablePath();
  const browserExecutableExists = await fileExists(executablePath);
  const storageStateExists = await fileExists(storageStatePath);

  const evaluated = evaluatePreflight({
    browserExecutableExists,
    executablePath,
    requireStorageState,
    storageStatePath,
    storageStateExists
  });

  return {
    ok: evaluated.ok,
    executablePath,
    storageStatePath,
    browserExecutableExists,
    storageStateExists,
    errors: evaluated.errors,
    warnings: evaluated.warnings
  };
}
