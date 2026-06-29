import { test, expect } from '../user/fixtures/equipqr-test';
import { pinContextToOrg } from '../user/shared/auth-helpers';
import { apexOrgId, seedEquipment } from '../user/shared/seed-data';
import {
  fillWorkOrderBasics,
  openWorkOrderCreateDialog,
  selectWorkOrderEquipment,
} from '../user/shared/ui-form-helpers';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

test.describe('PR evidence: historical work order timeline @pr-evidence', () => {
  test.beforeEach(async ({ context }) => {
    await pinContextToOrg(context, apexOrgId);
  });

  test('creates a historical work order and edits its timeline', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    const title = `PR Evidence Historical Timeline ${Date.now()}`;

    await gotoDashboard('/work-orders');
    await assertHealthyShell();
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '01-work-orders-list');

    const dialog = await openWorkOrderCreateDialog(page, gotoDashboard);
    await dialog.getByLabel(/historical work order/i).click();

    await fillWorkOrderBasics(dialog, {
      title,
      description: 'Backdated paper record digitization flow',
    });
    await selectWorkOrderEquipment(page, dialog, seedEquipment.cat320.name);

    const startDateTrigger = dialog.getByRole('button', { name: /pick start date and time/i });
    await startDateTrigger.click();
    await page.getByRole('gridcell', { name: /^15$/ }).first().click();

    await dialog.getByRole('button', { name: /build timeline/i }).click();
    const timelineDialog = page.getByRole('dialog').filter({ hasText: /build historical timeline/i });
    await expect(timelineDialog).toBeVisible({ timeout: 15_000 });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '02-timeline-builder');

    await timelineDialog.getByRole('button', { name: /save timeline/i }).click();
    await expect(timelineDialog).toBeHidden({ timeout: 15_000 });

    await dialog.getByRole('button', { name: /create work order/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/work-orders\//, { timeout: 60_000 });
    await expect(page.getByRole('heading', { name: new RegExp(title, 'i') })).toBeVisible({
      timeout: 30_000,
    });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '03-historical-work-order-details');

    await page.getByRole('button', { name: /edit historical timeline/i }).click();
    const editDialog = page.getByRole('dialog').filter({ hasText: /edit historical timeline/i });
    await expect(editDialog).toBeVisible({ timeout: 15_000 });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '04-edit-timeline-dialog');

    await editDialog.getByRole('button', { name: /save timeline/i }).click();
    await expect(editDialog).toBeHidden({ timeout: 15_000 });
    await expect(page.getByText(/historical record/i)).toBeVisible({ timeout: 15_000 });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '05-timeline-updated');
  });
});
