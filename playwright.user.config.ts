import fs from 'fs';
import path from 'path';
import { defineConfig, devices } from '@playwright/test';

const repoRoot = process.cwd();
const baseURL = (process.env.E2E_BASE_URL || 'http://localhost:8080').replace(/\/+$/, '');
const authDir = path.join(repoRoot, 'tmp', 'playwright', 'auth');

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
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'tmp/playwright/report' }],
  ],
  outputDir: 'tmp/playwright/test-results',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
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
