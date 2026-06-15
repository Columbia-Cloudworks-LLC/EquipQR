import { type Page } from '@playwright/test';
import { test, expect } from '../fixtures/equipqr-test';
import { INTEGRATIONS_PATH, assertQuickBooksConnected } from '../shared/quickbooks-auth-helpers';
import {
  getQuickBooksInvoiceUrl,
  hasRealAuthExportPrerequisites,
  hasRealAuthStorageState,
  missingRealAuthExportMessage,
  missingRealAuthStorageMessage,
  resolveExpectedQboEnvironment,
  resolveQboWorkOrderId,
} from '../shared/real-auth-config';

async function assertAuthenticatedDashboard(page: Page): Promise<void> {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/dashboard/i, { timeout: 60_000 });
  await expect(page).not.toHaveURL(/\/auth/i);
}

async function assertGoogleWorkspaceHealthy(page: Page): Promise<void> {
  await expect(page.getByText('Google Workspace').first()).toBeVisible({ timeout: 60_000 });
  const gwCard = page.locator('div.rounded-lg.border').filter({ hasText: 'Google Workspace' });
  await expect(gwCard.getByText('Connected').first()).toBeVisible({ timeout: 60_000 });

  const driveCard = page
    .locator('div.rounded-lg.border')
    .filter({ hasText: 'Google Drive File Storage' });
  await expect(driveCard.first()).toBeVisible({ timeout: 60_000 });
  await expect(driveCard.getByText('Configured').first()).toBeVisible({ timeout: 60_000 });
}

async function assertIntuitInvoicePage(
  page: Page,
  invoiceId: string,
  environment: 'sandbox' | 'production',
): Promise<void> {
  const invoiceUrl = getQuickBooksInvoiceUrl(invoiceId, environment);
  await page.goto(invoiceUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });

  const { hostname, pathname } = new URL(page.url());
  const expectedHost =
    environment === 'production' ? 'app.qbo.intuit.com' : 'app.sandbox.qbo.intuit.com';
  expect(hostname).toBe(expectedHost);
  expect(pathname).not.toMatch(/signin|login/i);
  expect(hostname).not.toBe('accounts.intuit.com');

  const signInHeading = page.getByRole('heading', { name: /sign in|log in/i });
  if ((await signInHeading.count()) > 0) {
    const qboHost = environment === 'production' ? 'app.qbo.intuit.com' : 'app.sandbox.qbo.intuit.com';
    throw new Error(
      `QuickBooks session is not authenticated. Re-capture tmp/playwright/auth/nicholas-google-qbo.json ` +
        `after signing into https://${qboHost} in the same browser context.`,
    );
  }

  await expect(page.locator('body')).toBeVisible({ timeout: 60_000 });
}

test.describe('real-auth integrations @real-auth', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(!hasRealAuthStorageState(), missingRealAuthStorageMessage());
    testInfo.setTimeout(180_000);
  });

  test('real-auth preflight shows connected integrations', async ({ page, assertHealthyShell }) => {
    await assertAuthenticatedDashboard(page);
    await page.goto(INTEGRATIONS_PATH);
    await assertHealthyShell();
    await assertQuickBooksConnected(page);
    await assertGoogleWorkspaceHealthy(page);
  });

  test('exports a completed work order to QuickBooks and opens the draft invoice', async ({
    page,
    assertHealthyShell,
  }) => {
    test.skip(!hasRealAuthExportPrerequisites(), missingRealAuthExportMessage());

    const workOrderId = resolveQboWorkOrderId()!;
    await page.goto(`/dashboard/work-orders/${workOrderId}`);
    await assertHealthyShell();
    await expect(page).toHaveURL(new RegExp(`/dashboard/work-orders/${workOrderId}`, 'i'), {
      timeout: 60_000,
    });

    await expect(page.getByText(/completed/i).first()).toBeVisible({ timeout: 60_000 });

    const exportButton = page.getByRole('button', { name: 'Export' });
    await expect(exportButton).toBeVisible({ timeout: 60_000 });
    await exportButton.click();

    await page.getByRole('menuitem', { name: 'QuickBooks' }).click();

    const exportItem = page.getByRole('menuitem', {
      name: /Create New Invoice|Update Invoice/i,
    });
    await expect(exportItem).toBeVisible({ timeout: 30_000 });

    const expectedEnvironment = resolveExpectedQboEnvironment();

    const exportResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/functions/v1/quickbooks-export-invoice') &&
        response.request().method() === 'POST',
      { timeout: 120_000 },
    );

    await exportItem.click();

    const exportResponse = await exportResponsePromise;
    expect(exportResponse.ok()).toBeTruthy();

    const exportBody = (await exportResponse.json()) as {
      success?: boolean;
      invoice_id?: string;
      invoice_number?: string;
      environment?: string;
      error?: string;
    };

    expect(exportBody.success).toBe(true);
    expect(exportBody.invoice_id).toBeTruthy();
    expect(exportBody.environment).toBe(expectedEnvironment);

    await expect(page.getByText(/invoice .* (created|updated) in quickbooks/i).first()).toBeVisible({
      timeout: 60_000,
    });

    await assertIntuitInvoicePage(page, exportBody.invoice_id!, expectedEnvironment);
  });
});
