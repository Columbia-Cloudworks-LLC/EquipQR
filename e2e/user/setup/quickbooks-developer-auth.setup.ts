import fs from 'fs';
import path from 'path';
import { test as setup, expect } from '@playwright/test';
import { resolveQuickBooksDeveloperAuthStoragePath } from '../shared/real-auth-config';

const DEVELOPER_PORTAL_URL = 'https://developer.intuit.com/';
const SIGN_IN_TIMEOUT_MS = 600_000;

/**
 * Headed one-time capture: sign in to the Intuit Developer Portal manually, then
 * persist Playwright storage state for agent browser replay.
 *
 * Run:
 *   npm run e2e:quickbooks-developer-auth:capture
 *
 * Use with:
 *   . .\scripts\e2e\Load-QuickBooksDeveloperStorageEnv.ps1
 */
setup(
  'capture Intuit Developer Portal storage state @quickbooks-developer-auth-setup',
  async ({ page }) => {
    setup.setTimeout(SIGN_IN_TIMEOUT_MS + 60_000);

    const outputPath = resolveQuickBooksDeveloperAuthStoragePath();
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    await page.goto(DEVELOPER_PORTAL_URL, { waitUntil: 'domcontentloaded' });

    // eslint-disable-next-line no-console -- operator guidance during headed capture
    console.log(
      [
        '',
        '[quickbooks-developer-auth-setup] Sign in to the Intuit Developer Portal in this browser.',
        '[quickbooks-developer-auth-setup] Complete SMS or email verification if prompted.',
        '[quickbooks-developer-auth-setup] Wait until you see My Hub / App dashboard (not Sign In).',
        '[quickbooks-developer-auth-setup] Waiting up to 10 minutes ...',
        '',
      ].join('\n'),
    );

    const signedIn = page.getByRole('link', { name: /sign out|log out|my hub|app dashboard/i }).first();
    const signInButton = page.getByRole('link', { name: /^sign in$/i }).first();

    await expect
      .poll(
        async () => {
          if (await signedIn.isVisible().catch(() => false)) return true;
          const url = page.url();
          if (/developer\.intuit\.com\/app\/developer/i.test(url)) return true;
          if (await signInButton.isVisible().catch(() => false)) return false;
          return /developer\.intuit\.com/i.test(url) && !page.url().includes('accounts.intuit.com');
        },
        { timeout: SIGN_IN_TIMEOUT_MS, intervals: [2000] },
      )
      .toBe(true);

    await page.context().storageState({ path: outputPath });

    // eslint-disable-next-line no-console -- operator confirmation during headed capture
    console.log(
      [
        `[quickbooks-developer-auth-setup] Saved developer portal storage state to ${outputPath}`,
        '[quickbooks-developer-auth-setup] Agents can replay this file via Load-QuickBooksDeveloperStorageEnv.ps1',
        '',
      ].join('\n'),
    );
  },
);
