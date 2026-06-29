import { test, expect } from '../user/fixtures/equipqr-test';
import { pinContextToOrg } from '../user/shared/auth-helpers';
import { apexOrgId, authStatePath, seedWorkOrders } from '../user/shared/seed-data';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

test.use({ storageState: authStatePath('owner') });

test.describe('Work order admin delete @pr-evidence', () => {
  test.beforeEach(async ({ context }) => {
    await pinContextToOrg(context, apexOrgId);
  });

  test('deletes from list and from details with confirmation', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    const listDeleteTarget = seedWorkOrders.cancelled;
    const detailsDeleteTarget = seedWorkOrders.onHold;

    await gotoDashboard('/work-orders');
    await assertHealthyShell();

    const listCard = page.getByRole('button').filter({
      has: page.getByRole('heading', { name: new RegExp(listDeleteTarget.title, 'i') }),
    }).first();
    await expect(listCard).toBeVisible({ timeout: 60_000 });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '01-work-orders-list-before-delete');

    await listCard.getByRole('button', { name: /delete work order/i }).click();
    const confirmDialog = page.getByRole('alertdialog');
    await expect(confirmDialog.getByRole('heading', { name: /delete work order/i })).toBeVisible();
    await expect(confirmDialog.getByText(/irreversible/i)).toBeVisible();
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '02-list-delete-confirm');

    await confirmDialog.getByRole('button', { name: /delete permanently/i }).click();
    await expect(confirmDialog).toBeHidden({ timeout: 30_000 });
    await expect(page.getByRole('heading', { name: new RegExp(listDeleteTarget.title, 'i') })).toHaveCount(0, {
      timeout: 30_000,
    });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '03-work-orders-list-after-delete');

    await gotoDashboard(`/dashboard/work-orders/${detailsDeleteTarget.id}`);
    await assertHealthyShell();
    await expect(
      page.getByRole('heading', { name: new RegExp(detailsDeleteTarget.title, 'i') }).first(),
    ).toBeVisible({ timeout: 60_000 });

    await page.getByRole('button', { name: /delete work order/i }).click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '04-details-delete-confirm');

    await page.getByRole('button', { name: /delete permanently/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/work-orders\/?$/, { timeout: 30_000 });
    await expect(page.getByRole('heading', { name: new RegExp(detailsDeleteTarget.title, 'i') })).toHaveCount(0, {
      timeout: 30_000,
    });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '05-work-orders-after-details-delete');
  });
});
