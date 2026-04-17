import fs from 'fs';
import { defineConfig, devices } from '@playwright/test';

const storagePath = process.env.DEMO_STORAGE_STATE?.trim();
const storageState =
  storagePath && fs.existsSync(storagePath) ? storagePath : undefined;

const baseURL = (process.env.DEMO_BASE_URL || 'http://localhost:8080').replace(/\/+$/, '');

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 90_000,
  use: {
    baseURL,
    trace: 'off',
    screenshot: 'off',
    video: 'on',
    ...devices['Desktop Chrome'],
    ...(storageState ? { storageState } : {})
  }
});
