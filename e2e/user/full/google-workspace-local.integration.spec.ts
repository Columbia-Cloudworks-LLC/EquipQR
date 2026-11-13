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
    test.skip(
      !resolveGoogleDocsWorkOrderId(),
      'Set E2E_GOOGLE_DOCS_WORK_ORDER_ID to a completed work order UUID in your org.',
    );
    testInfo.setTimeout(300_000);
  });

  test('exports a work order to Google Docs and opens the document', async ({
    page,
    context,
    assertHealthyShell,
  }) => {
    const workOrderId = resolveGoogleDocsWorkOrderId();
    if (!workOrderId) {
      throw new Error('E2E_GOOGLE_DOCS_WORK_ORDER_ID is required (checked in beforeEach).');
    }

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/i, { timeout: 60_000 });
    await expect(page).not.toHaveURL(/\/auth/i);
    await assertHealthyShell();

    const { documentUrl } = await exportWorkOrderToGoogleDoc(page, workOrderId);
    await assertGoogleDocOpens(context, documentUrl);
  });
});
