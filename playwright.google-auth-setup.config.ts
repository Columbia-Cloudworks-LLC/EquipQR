// fallow-ignore-file unused-file
import path from 'path';
import { defineConfig, devices } from '@playwright/test';
import { resolveRealAuthBaseUrl } from './e2e/user/shared/real-auth-config';

const repoRoot = process.cwd();
const outputDir = path.join(repoRoot, 'tmp', 'playwright', 'google-auth-setup');

export default defineConfig({
  testDir: path.join(repoRoot, 'e2e', 'user', 'setup'),
  testMatch: /google-real-auth\.setup\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 1_200_000,
  expect: { timeout: 60_000 },
  outputDir,
  reporter: [['list']],
  use: {
    ...devices['Desktop Chrome'],
    headless: false,
    viewport: { width: 1280, height: 960 },
    baseURL: resolveRealAuthBaseUrl(),
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
