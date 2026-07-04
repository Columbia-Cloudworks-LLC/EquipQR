// fallow-ignore-file unused-file
import path from 'path';
import { defineConfig, devices } from '@playwright/test';
import {
  resolveRealAuthBaseUrl,
  resolveRealAuthStorageState,
  resolveVercelAutomationBypassHeaders,
} from './e2e/user/shared/real-auth-config';
import { PR_EVIDENCE_VIEWPORT, resolvePrEvidenceViewport } from './scripts/lib/pr-evidence-video.mjs';
import { prEvidenceRequiresDocsServer } from './e2e/pr-evidence/shared/pr-evidence-flows';

const repoRoot = process.cwd();
const flowSlug = (process.env.PR_EVIDENCE_FLOW || 'change').replace(/[^a-z0-9-]/gi, '-');
const outputDir = path.join(repoRoot, 'tmp', 'pr-evidence', flowSlug, 'playwright-output');
const requiresDocsServer =
  prEvidenceRequiresDocsServer() ||
  process.argv.some((arg) => arg.includes('daily-operator-check-in-docs-discovery'));
const ownerStorage = path.join(repoRoot, 'tmp', 'playwright', 'auth', 'owner.json');
const quickLoginBaseUrl = process.env.PR_EVIDENCE_BASE_URL || 'http://localhost:8080';
const realAuthStorage = resolveRealAuthStorageState();
const realAuthBaseUrl = resolveRealAuthBaseUrl();
const vercelAutomationBypassHeaders = resolveVercelAutomationBypassHeaders();

const prEvidenceViewport = resolvePrEvidenceViewport(PR_EVIDENCE_VIEWPORT);
const prEvidenceDevice = prEvidenceViewport.width < 768 ? devices['Pixel 7'] : devices['Desktop Chrome'];

const prEvidenceUse = {
  ...prEvidenceDevice,
  deviceScaleFactor: 1,
  viewport: prEvidenceViewport,
  screenshot: 'on' as const,
  video: { mode: 'on' as const, size: prEvidenceViewport },
  trace: 'off' as const,
};

export default defineConfig({
  testDir: path.join(repoRoot, 'e2e'),
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 20_000 },
  preserveOutput: 'always',
  reporter: [['list']],
  outputDir,
  ...(requiresDocsServer
    ? {
        webServer: {
          command: 'npm run docs:dev',
          url: 'http://127.0.0.1:5174',
          reuseExistingServer: true,
          timeout: 120_000,
        },
      }
    : {}),
  projects: [
    {
      name: 'setup',
      testMatch: /user\/setup\/auth\.setup\.ts/,
      use: {
        ...prEvidenceUse,
        baseURL: quickLoginBaseUrl,
      },
    },
    {
      name: 'pr-evidence',
      dependencies: ['setup'],
      testMatch: /pr-evidence\/.*\.spec\.ts/,
      grepInvert: /@real-auth/,
      use: {
        ...prEvidenceUse,
        baseURL: quickLoginBaseUrl,
        storageState: ownerStorage,
      },
    },
    {
      name: 'pr-evidence-real-auth',
      testMatch: /pr-evidence\/.*\.spec\.ts/,
      grep: /@real-auth/,
      use: {
        ...prEvidenceUse,
        baseURL: realAuthBaseUrl,
        ...(realAuthStorage ? { storageState: realAuthStorage } : {}),
        ...(vercelAutomationBypassHeaders
          ? { extraHTTPHeaders: vercelAutomationBypassHeaders }
          : {}),
      },
    },
  ],
});
