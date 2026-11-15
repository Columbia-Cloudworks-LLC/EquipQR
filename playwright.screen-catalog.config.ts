/**
 * Screen catalog: deterministic mobile screenshots of every catalogued flow.
 * Use `npm run screens:capture` (dev/linux/screen-catalog.sh) rather than
 * invoking this config directly; the script resets the DB and builds the gallery.
 */
import path from 'path';
import { defineConfig } from '@playwright/test';
import { loadScreenCatalogSettings } from './e2e/screen-catalog/config';

const repoRoot = process.cwd();
const settings = loadScreenCatalogSettings();
const workers = Number(process.env.SCREEN_CATALOG_WORKERS || 2);

export default defineConfig({
  testDir: path.join(repoRoot, 'e2e'),
  fullyParallel: true,
  workers: Number.isFinite(workers) && workers > 0 ? workers : 2,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: [['list']],
  outputDir: path.join(repoRoot, 'tmp', 'screen-catalog', '.playwright-output'),
  use: {
    baseURL: settings.baseURL,
    trace: 'off',
    video: 'off',
    screenshot: 'off',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /user\/setup\/auth\.setup\.ts$/,
      grep: /authenticate (owner|technician)$/,
    },
    {
      name: 'screen-catalog',
      testMatch: /screen-catalog\/screen-catalog\.spec\.ts$/,
      dependencies: ['setup'],
      use: {
        ...settings.device,
        // Only Chromium is installed for E2E; iPhone presets otherwise default to WebKit.
        defaultBrowserType: 'chromium',
        deviceScaleFactor: settings.deviceScaleFactor,
        locale: 'en-US',
        timezoneId: settings.timezoneId,
        colorScheme: 'dark',
        launchOptions: {
          // Software rasterization and fixed text rendering so identical DOM gives identical pixels.
          args: [
            '--disable-gpu',
            '--force-color-profile=srgb',
            '--font-render-hinting=none',
            '--disable-lcd-text',
            '--disable-font-subpixel-positioning',
            '--disable-partial-raster',
            '--disable-skia-runtime-opts',
            '--hide-scrollbars',
          ],
        },
      },
    },
  ],
});
