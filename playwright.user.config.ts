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
const viewportMode = runConfig.viewportMode;
const showPlaywrightAnnotations = annotateVideos && overlayMode === 'debug';
const desktopDevice = devices['Desktop Chrome'];
const videoSize = viewportMode === 'mobile'
  ? { width: 390, height: 844 }
  : { width: 1280, height: 720 };
const viewportOverrides = viewportMode === 'mobile'
  ? {
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      userAgent:
        'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36',
    }
  : {};
const videoAnnotations = {
  actions: {
    duration: 900,
    position: 'top-right' as const,
    fontSize: 14,
  },
  test: {
    level: 'title' as const,
    position: 'top-left' as const,
    fontSize: 12,
  },
};
const artifactTitle = runConfig.recordingTitle || overlayMode;
const artifactContext = [
  viewportMode,
  runConfig.recordAllVideos ? 'record' : 'test',
  artifactTitle !== 'none' ? artifactTitle : '',
]
  .filter(Boolean)
  .join('-')
  .toLowerCase()
  .replace(/[^a-z0-9-]+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '');
const outputDir = runConfig.outputDir || path.join(
  'tmp',
  'playwright',
  'test-results',
  artifactContext || 'desktop-test',
);

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
  outputDir,
  use: {
    ...desktopDevice,
    ...viewportOverrides,
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: recordAllVideos
      ? showPlaywrightAnnotations
        ? {
            mode: 'on',
            size: videoSize,
            show: videoAnnotations,
          }
        : 'on'
      : showPlaywrightAnnotations
        ? {
            mode: 'retain-on-failure',
            size: videoSize,
            show: videoAnnotations,
          }
        : 'retain-on-failure',
    ...(Number.isFinite(slowMo) && slowMo > 0
      ? { launchOptions: { slowMo } }
      : {}),
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
