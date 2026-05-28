import fs from 'fs';
import path from 'path';
import { defineConfig, devices } from '@playwright/test';
import { loadUserRegressionRunConfig } from './e2e/user/shared/run-config';

const repoRoot = process.cwd();
const runConfig = loadUserRegressionRunConfig();
const baseURL = runConfig.baseURL;
const authDir = path.join(repoRoot, 'tmp', 'playwright', 'auth');
const slowMo = runConfig.slowMoMs;
const recordAllVideos = runConfig.recordAllVideos;
const annotateVideos = runConfig.annotateVideos;
const overlayMode = runConfig.overlayMode;
const showPlaywrightAnnotations = annotateVideos && overlayMode !== 'marketing';
const videoSize = { width: 1280, height: 720 };

function storageStateFor(persona: string): string | undefined {
  const filePath = path.join(authDir, `${persona}.json`);
  return fs.existsSync(filePath) ? filePath : undefined;
}

const ownerStorage = storageStateFor('owner');

export default defineConfig({
  testDir: 'e2e/user',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  preserveOutput: 'always',
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'tmp/playwright/report' }],
  ],
  outputDir: 'tmp/playwright/test-results',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: recordAllVideos
      ? 'on'
      : showPlaywrightAnnotations
        ? {
            mode: 'retain-on-failure',
            size: videoSize,
            show: {
              actions: {
                duration: 900,
                position: 'top-right',
                fontSize: 14,
              },
              test: {
                level: 'title',
                position: 'top-left',
                fontSize: 12,
              },
            },
          }
        : 'retain-on-failure',
    ...(Number.isFinite(slowMo) && slowMo > 0
      ? { launchOptions: { slowMo } }
      : {}),
    ...devices['Desktop Chrome'],
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'critical',
      dependencies: ['setup'],
      grep: /@critical/,
      use: {
        ...(ownerStorage ? { storageState: ownerStorage } : {}),
      },
    },
    {
      name: 'full',
      dependencies: ['setup'],
      grep: /@full/,
      use: {
        ...(ownerStorage ? { storageState: ownerStorage } : {}),
      },
    },
  ],
});
