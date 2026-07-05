import { test, expect } from '../user/fixtures/equipqr-test';
import { pinContextToOrg } from '../user/shared/auth-helpers';
import { apexOrgId, authStatePath, seedWorkOrders } from '../user/shared/seed-data';
import { assertDocsDevServerReady, evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

test.use({ storageState: authStatePath('technician') });

test.describe('Work order PM docs discovery @pr-evidence', () => {
  test.beforeEach(async ({ context, request }) => {
    await assertDocsDevServerReady(request);
    await pinContextToOrg(context, apexOrgId);
  });

  test('contextual help link opens the PM management guide', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard(`/dashboard/work-orders/${seedWorkOrders.oilChange.id}`);
    await assertHealthyShell();

    await page.getByRole('button', { name: /add pm checklist/i }).click();
    await expect(page.getByRole('dialog', { name: /manage pm checklist/i })).toBeVisible();

    const docsLink = page.getByRole('link', { name: /learn more in the help center/i });
    await expect(docsLink).toHaveAttribute('href', /manage-pm-template-on-work-order/);

    const [docsPage] = await Promise.all([
      page.context().waitForEvent('page'),
      docsLink.click(),
    ]);
    await docsPage.waitForLoadState('domcontentloaded');
    await expect(docsPage.getByRole('heading', { name: /manage pm template/i })).toBeVisible({
      timeout: 30_000,
    });
    await evidencePause(docsPage, 600);
    await evidenceScreenshot(docsPage, '01-docs-from-dialog-link');
    await docsPage.close();

    await page.goto('http://localhost:5174/support/work-orders/manage-pm-template-on-work-order');
    await expect(page.getByRole('heading', { name: /manage pm template/i })).toBeVisible({
      timeout: 30_000,
    });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '02-help-center-article');
  });
});
