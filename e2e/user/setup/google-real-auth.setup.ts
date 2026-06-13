import fs from 'fs';
import path from 'path';
import { test as setup, expect } from '@playwright/test';
import {
  resolveGoogleWorkspaceAuthStoragePath,
  resolveRealAuthBaseUrl,
} from '../shared/real-auth-config';

const INTEGRATIONS_PATH = '/dashboard/organization/integrations';
const GOOGLE_SIGN_IN_TIMEOUT_MS = 600_000;
const WORKSPACE_CONNECT_TIMEOUT_MS = 600_000;

/**
 * Headed one-time capture: sign in with Google (manual OAuth in the browser), optionally
 * connect Google Workspace on Integrations, then persist Playwright storage state.
 *
 * Run:
 *   npm run e2e:google-auth:capture
 *
 * Requires local stack at E2E_REAL_AUTH_BASE_URL (default http://localhost:8080).
 */
setup('capture Google sign-in storage state @google-auth-setup', async ({ page }) => {
  setup.setTimeout(GOOGLE_SIGN_IN_TIMEOUT_MS + WORKSPACE_CONNECT_TIMEOUT_MS);

  const baseUrl = resolveRealAuthBaseUrl();
  const outputPath = resolveGoogleWorkspaceAuthStoragePath();
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  await page.goto(`${baseUrl}/auth?tab=signin`);
  await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible({
    timeout: 60_000,
  });

  // eslint-disable-next-line no-console -- operator guidance during headed capture
  console.log(
    [
      '',
      '[google-auth-setup] Complete Google sign-in in the browser window.',
      '[google-auth-setup] Sign in as nicholas.king@columbiacloudworks.com (Google Workspace admin).',
      '[google-auth-setup] Ensure Google Workspace is connected on Integrations if prompted.',
      '',
    ].join('\n'),
  );

  await page.waitForURL(/\/dashboard/i, { timeout: GOOGLE_SIGN_IN_TIMEOUT_MS });
  await expect(page).not.toHaveURL(/\/auth/i);

  await page.goto(`${baseUrl}${INTEGRATIONS_PATH}`);
  const gwCard = page.locator('div.rounded-lg.border').filter({ hasText: 'Google Workspace' });
  await expect(gwCard.first()).toBeVisible({ timeout: 60_000 });

  const connectedBadge = gwCard.getByText('Connected').first();
  if (!(await connectedBadge.isVisible().catch(() => false))) {
    // eslint-disable-next-line no-console -- operator guidance during headed capture
    console.log(
      [
        '',
        '[google-auth-setup] Google Workspace is not connected yet.',
        '[google-auth-setup] Click Connect Google Workspace and finish Google consent in this browser.',
        '[google-auth-setup] Waiting up to 10 minutes for Connected state ...',
        '',
      ].join('\n'),
    );
    await expect(connectedBadge).toBeVisible({ timeout: WORKSPACE_CONNECT_TIMEOUT_MS });
  }

  await page.context().storageState({ path: outputPath });

  // eslint-disable-next-line no-console -- operator confirmation during headed capture
  console.log(`[google-auth-setup] Saved storage state to ${outputPath}`);
});
