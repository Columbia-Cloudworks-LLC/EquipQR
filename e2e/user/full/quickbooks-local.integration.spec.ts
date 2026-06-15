import { test, expect } from '../fixtures/equipqr-test';
import {
  hasQuickBooksLocalAuthStorageState,
  missingQuickBooksLocalAuthMessage,
} from '../shared/real-auth-config';
import { INTEGRATIONS_PATH, assertQuickBooksConnected } from '../shared/quickbooks-auth-helpers';

test.describe('QuickBooks local integration @quickbooks-local @full', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(!hasQuickBooksLocalAuthStorageState(), missingQuickBooksLocalAuthMessage());
    testInfo.setTimeout(180_000);
  });

  test('preflight shows QuickBooks connected on Integrations', async ({ page, assertHealthyShell }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/i, { timeout: 60_000 });
    await expect(page).not.toHaveURL(/\/auth/i);

    await page.goto(INTEGRATIONS_PATH);
    await assertHealthyShell();
    await assertQuickBooksConnected(page);
  });
});
