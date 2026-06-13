import { test, expect } from '../fixtures/equipqr-test';
import {
  assertGoogleDocOpens,
  exportWorkOrderToGoogleDoc,
} from '../shared/google-docs-export-helpers';
import {
  hasRealAuthStorageState,
  missingRealAuthStorageMessage,
  resolveGoogleDocsWorkOrderId,
} from '../shared/real-auth-config';

test.describe('Google Docs local export @google-oauth @full', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(!hasRealAuthStorageState(), missingRealAuthStorageMessage());
    testInfo.setTimeout(300_000);
  });

  test('exports a work order to Google Docs and opens the document', async ({
    page,
    context,
    assertHealthyShell,
  }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/i, { timeout: 60_000 });
    await expect(page).not.toHaveURL(/\/auth/i);
    await assertHealthyShell();

    const configuredWorkOrderId = resolveGoogleDocsWorkOrderId();
    if (configuredWorkOrderId) {
      const { documentUrl } = await exportWorkOrderToGoogleDoc(page, configuredWorkOrderId);
      await assertGoogleDocOpens(context, documentUrl);
      return;
    }

    await page.goto('/dashboard/work-orders');
    await assertHealthyShell();

    const completedRow = page
      .locator('tr, [data-testid="work-order-row"], a')
      .filter({ hasText: /completed/i })
      .first();
    if (!(await completedRow.isVisible({ timeout: 30_000 }).catch(() => false))) {
      test.skip(
        true,
        'No completed work order found. Set E2E_GOOGLE_DOCS_WORK_ORDER_ID to a completed work order in your org.',
      );
      return;
    }

    await completedRow.click();
    const match = page.url().match(/\/dashboard\/work-orders\/([0-9a-f-]{36})/i);
    if (!match) {
      test.skip(true, 'Could not resolve a completed work order ID from the work orders list.');
      return;
    }

    const { documentUrl } = await exportWorkOrderToGoogleDoc(page, match[1]);
    await assertGoogleDocOpens(context, documentUrl);
  });
});
