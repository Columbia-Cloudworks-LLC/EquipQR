import fs from 'fs';
import path from 'path';
import { defineConfig, devices } from '@playwright/test';
import { loadUserRegressionRunConfig } from './e2e/user/shared/run-config';
import {
  resolveRealAuthBaseUrl,
  resolveVercelAutomationBypassHeaders,
} from './e2e/user/shared/real-auth-config';

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
const effectiveViewportMode = viewportMode === 'mobile' ? 'mobile' : 'desktop';
const videoSize = runConfig.videoSize;
const viewportOverrides = viewportMode === 'mobile'
  ? {
      viewport: runConfig.mobileViewport,
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      userAgent:
        'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36',
    }
  : {
      viewport: runConfig.desktopViewport,
    };
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
  effectiveViewportMode,
  runConfig.runProfile !== 'test' ? runConfig.runProfile : '',
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

const realAuthVideo = showPlaywrightAnnotations
  ? {
      mode: 'on' as const,
      size: videoSize,
      show: videoAnnotations,
    }
  : {
      mode: 'on' as const,
      size: videoSize,
    };

const ownerStorage = path.join(authDir, 'owner.json');

const realAuthStorageRaw = process.env.E2E_REAL_AUTH_STORAGE_STATE?.trim();
const realAuthStorageState = realAuthStorageRaw
  ? path.resolve(realAuthStorageRaw)
  : null;
const realAuthStorageExists =
  realAuthStorageState !== null && fs.existsSync(realAuthStorageState);
const realAuthBaseURL = resolveRealAuthBaseUrl();
const vercelAutomationBypassHeaders = resolveVercelAutomationBypassHeaders();

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
    video: showPlaywrightAnnotations
      ? {
          mode: recordAllVideos ? 'on' : 'retain-on-failure',
          size: videoSize,
          show: videoAnnotations,
        }
      : {
          mode: recordAllVideos ? 'on' : 'retain-on-failure',
          size: videoSize,
        },
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
        storageState: ownerStorage,
      },
    },
    {
      name: 'full',
      dependencies: ['setup'],
      grep: /@full/,
      use: {
        storageState: ownerStorage,
      },
    },
    {
      name: 'real-auth-integrations',
      grep: /@real-auth/,
      grepInvert: /@google-oauth/,
      use: {
        baseURL: realAuthBaseURL,
        viewport: runConfig.desktopViewport,
        video: realAuthVideo,
        ...(vercelAutomationBypassHeaders
          ? { extraHTTPHeaders: vercelAutomationBypassHeaders }
          : {}),
        ...(realAuthStorageExists && realAuthStorageState
          ? { storageState: realAuthStorageState }
          : {}),
      },
    },
    {
      name: 'google-oauth-local',
      grep: /@google-oauth/,
      use: {
        baseURL: realAuthBaseURL,
        viewport: runConfig.desktopViewport,
        video: realAuthVideo,
        ...(realAuthStorageExists && realAuthStorageState
          ? { storageState: realAuthStorageState }
          : {}),
      },
    },
  ],
});
