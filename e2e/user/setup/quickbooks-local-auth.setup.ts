import fs from 'fs';
import path from 'path';
import { test as setup, expect } from '@playwright/test';
import { resolveQuickBooksLocalAuthStoragePath, resolveRealAuthBaseUrl } from '../shared/real-auth-config';
import {
  assertQuickBooksConnected,
  isQuickBooksConnected,
  openIntegrationsPage,
  waitForEquipQrDashboardShell,
} from '../shared/quickbooks-auth-helpers';

const SIGN_IN_TIMEOUT_MS = 600_000;
const QB_CONNECT_TIMEOUT_MS = 600_000;

/**
 * Headed one-time capture: sign in to EquipQR (manual if needed), connect QuickBooks
 * on Integrations (manual Intuit OAuth), then persist Playwright storage state.
 *
 * OAuth tokens are stored server-side in quickbooks_credentials after Intuit redirects
 * to the local edge callback — not in the storage-state file.
 *
 * Run:
 *   npm run e2e:quickbooks-auth:capture
 *
 * Requires local stack at E2E_REAL_AUTH_BASE_URL (default http://localhost:8080).
 */
setup('capture QuickBooks local integration @quickbooks-auth-setup', async ({ page }) => {
  setup.setTimeout(SIGN_IN_TIMEOUT_MS + QB_CONNECT_TIMEOUT_MS);

  const baseUrl = resolveRealAuthBaseUrl();
  const outputPath = resolveQuickBooksLocalAuthStoragePath();
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'domcontentloaded' });

  if (page.url().includes('/auth')) {
    // eslint-disable-next-line no-console -- operator guidance during headed capture
    console.log(
      [
        '',
        '[quickbooks-auth-setup] Sign in to EquipQR in the browser window.',
        '[quickbooks-auth-setup] Use Continue with Google or your local test account.',
        '[quickbooks-auth-setup] Waiting up to 10 minutes for /dashboard ...',
        '',
      ].join('\n'),
    );
    await waitForEquipQrDashboardShell(page);
  }

  await openIntegrationsPage(page, baseUrl);

  if (page.url().includes('/auth')) {
    // eslint-disable-next-line no-console -- operator guidance during headed capture
    console.log(
      [
        '',
        '[quickbooks-auth-setup] Session expired while opening Integrations — sign in again.',
        '[quickbooks-auth-setup] Waiting up to 10 minutes for /dashboard ...',
        '',
      ].join('\n'),
    );
    await waitForEquipQrDashboardShell(page);
    await openIntegrationsPage(page, baseUrl);
  }

  if (!(await isQuickBooksConnected(page))) {
    // eslint-disable-next-line no-console -- operator guidance during headed capture
    console.log(
      [
        '',
        '[quickbooks-auth-setup] QuickBooks is not connected yet.',
        '[quickbooks-auth-setup] Click Connect on the QuickBooks Online card.',
        '[quickbooks-auth-setup] Complete Intuit sign-in and authorize the sandbox/production company.',
        '[quickbooks-auth-setup] You should return to Integrations with a success toast.',
        '[quickbooks-auth-setup] Waiting up to 10 minutes for Connected state ...',
        '',
      ].join('\n'),
    );
    await assertQuickBooksConnected(page);
  } else {
    // eslint-disable-next-line no-console -- operator confirmation during headed capture
    console.log('[quickbooks-auth-setup] QuickBooks already shows Connected on the QB card.');
  }

  await page.context().storageState({ path: outputPath });

  // eslint-disable-next-line no-console -- operator confirmation during headed capture
  console.log(
    [
      `[quickbooks-auth-setup] Saved EquipQR session storage state to ${outputPath}`,
      '[quickbooks-auth-setup] QuickBooks OAuth tokens are in local quickbooks_credentials (Supabase).',
      '[quickbooks-auth-setup] Verify API access: .\\scripts\\qbo\\Invoke-QboQuery.ps1',
      '',
    ].join('\n'),
  );
});
