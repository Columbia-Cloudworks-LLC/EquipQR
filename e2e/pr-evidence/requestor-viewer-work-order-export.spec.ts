import { test, expect } from '../user/fixtures/equipqr-test';
import {
  newPersonaPage,
  gotoDashboardRoute,
} from '../user/shared/auth-helpers';
import { metroOrgId, seedWorkOrders } from '../user/shared/seed-data';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

test.describe('Requestor viewer work order export @pr-evidence', () => {
  test('team viewer gets scoped reports console and customer-safe PDF export', async ({ browser }) => {
    const { context, page } = await newPersonaPage(browser, 'owner', { pinOrgId: metroOrgId });

    await gotoDashboardRoute(page, '/reports');
    await expect(page.getByRole('heading', { name: /work order exports/i })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText(/private notes and costs are never included/i)).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/fleet export console/i)).toHaveCount(0);

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '01-scoped-reports-console');

    await gotoDashboardRoute(page, `/work-orders/${seedWorkOrders.viewerBobcatPm.id}`);
    await expect(
      page.getByRole('heading', { name: new RegExp(seedWorkOrders.viewerBobcatPm.title, 'i') }).first(),
    ).toBeVisible({ timeout: 60_000 });

    const exportButton = page.getByRole('button', { name: /^export$/i }).first();
    await expect(exportButton).toBeVisible({ timeout: 30_000 });
    await exportButton.click();

    await expect(page.getByRole('menuitem', { name: /service report pdf/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/^download$/i)).toHaveCount(0);

    await evidencePause(page, 600);
    await evidenceScreenshot(page, '02-customer-safe-export-menu');

    await page.getByRole('menuitem', { name: /service report pdf/i }).click();
    await expect(page.getByRole('dialog').getByText(/service report/i)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/include costs/i)).toHaveCount(0);

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '03-customer-safe-pdf-dialog');

    await context.close();
  });
});
