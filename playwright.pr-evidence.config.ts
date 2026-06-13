// fallow-ignore-file unused-file
import path from 'path';
import { defineConfig, devices } from '@playwright/test';

const repoRoot = process.cwd();
const flowSlug = (process.env.PR_EVIDENCE_FLOW || 'change').replace(/[^a-z0-9-]/gi, '-');
const outputDir = path.join(repoRoot, 'tmp', 'pr-evidence', flowSlug, 'playwright-output');
const ownerStorage = path.join(repoRoot, 'tmp', 'playwright', 'auth', 'owner.json');

export default defineConfig({
  testDir: path.join(repoRoot, 'e2e'),
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  preserveOutput: 'always',
  reporter: [['list']],
  outputDir,
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 1280, height: 960 },
    baseURL: process.env.PR_EVIDENCE_BASE_URL || 'http://localhost:8080',
    screenshot: 'on',
    video: { mode: 'on', size: { width: 1280, height: 720 } },
    trace: 'off',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /user\/setup\/auth\.setup\.ts/,
    },
    {
      name: 'pr-evidence',
      dependencies: ['setup'],
      testMatch: /pr-evidence\/.*\.spec\.ts/,
      use: {
        storageState: ownerStorage,
      },
    },
  ],
});
