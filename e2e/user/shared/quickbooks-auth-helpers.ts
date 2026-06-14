import { type Page, expect } from '@playwright/test';

export const INTEGRATIONS_PATH = '/dashboard/organization/integrations';

function isIntegrationsPageUrl(url: URL): boolean {
  return url.pathname.includes(INTEGRATIONS_PATH);
}

/**
 * The integrations page wraps all vendors in an outer shadcn Card (also rounded-lg border).
 * Scope to the inner card whose title paragraph is exactly "QuickBooks Online".
 */
export function quickBooksIntegrationCard(page: Page) {
  return page
    .getByText('QuickBooks Online', { exact: true })
    .locator('xpath=ancestor::div[contains(@class,"rounded-lg") and contains(@class,"border")][1]');
}

export async function waitForQuickBooksIntegrationReady(page: Page): Promise<void> {
  await expect(page.getByText('Loading QuickBooks...')).toBeHidden({ timeout: 60_000 });
  await expect(quickBooksIntegrationCard(page)).toBeVisible({ timeout: 60_000 });
}

export async function assertQuickBooksConnected(page: Page): Promise<void> {
  await waitForQuickBooksIntegrationReady(page);
  const qbCard = quickBooksIntegrationCard(page);
  await expect(qbCard.getByText('Not connected', { exact: true })).toBeHidden({ timeout: 5_000 });
  await expect(qbCard.getByText('Connected', { exact: true })).toBeVisible({ timeout: 600_000 });
}

export async function isQuickBooksConnected(page: Page): Promise<boolean> {
  await waitForQuickBooksIntegrationReady(page);
  const qbCard = quickBooksIntegrationCard(page);
  if (await qbCard.getByText('Not connected', { exact: true }).isVisible().catch(() => false)) {
    return false;
  }
  return qbCard.getByText('Connected', { exact: true }).isVisible().catch(() => false);
}

/** Wait for post-auth SPA bootstrap (workspace gate) before hard navigation. */
export async function waitForEquipQrDashboardShell(page: Page): Promise<void> {
  await page.waitForURL(/\/dashboard/i, { timeout: 600_000 });
  await expect(page.getByText('Checking workspace access')).toBeHidden({ timeout: 120_000 });
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Open Organization → Integrations without racing the client router.
 * Playwright `goto(..., waitUntil: load)` often throws ERR_ABORTED here when
 * EquipQR is still redirecting after Google sign-in.
 */
export async function openIntegrationsPage(page: Page, baseUrl: string): Promise<void> {
  const integrationsPath = INTEGRATIONS_PATH;
  const integrationsUrl = `${baseUrl}${integrationsPath}`;

  if (page.url().includes(integrationsPath)) {
    await page.waitForLoadState('domcontentloaded');
    return;
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      await page.goto(integrationsUrl, { waitUntil: 'domcontentloaded', timeout: 90_000 });
      if (!page.url().includes('/auth')) {
        return;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const aborted = message.includes('ERR_ABORTED');
      if (!aborted) {
        throw error;
      }

      await page
        .waitForURL(isIntegrationsPageUrl, { timeout: 30_000 })
        .catch(() => undefined);

      if (page.url().includes(integrationsPath) && !page.url().includes('/auth')) {
        return;
      }
    }
  }

  await page.waitForURL(isIntegrationsPageUrl, {
    timeout: 60_000,
  });
  expect(page.url()).toContain(integrationsPath);
}
