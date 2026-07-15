import { test, expect } from '../user/fixtures/equipqr-test';
import { pinContextToOrg } from '../user/shared/auth-helpers';
import { apexOrgId, seedEquipment } from '../user/shared/seed-data';
import { fillWorkOrderBasics, pickHistoricalStartDate } from '../user/shared/ui-form-helpers';
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
    test.setTimeout(300_000);
    const title = `PR Evidence Historical Timeline ${Date.now()}`;

    await gotoDashboard('/work-orders');
    await assertHealthyShell();
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '01-work-orders-list');

    await gotoDashboard(
      `/equipment/${seedEquipment.cat320.id}?createWorkOrder=1`,
    );
    const dialog = page.getByRole('dialog', { name: /create work order/i });
    await expect(dialog).toBeVisible({ timeout: 30_000 });
    await expect(dialog.getByText(/create a new work order for cat 320 excavator/i)).toBeVisible({
      timeout: 15_000,
    });

    await dialog.getByLabel(/historical work order/i).click();

    await fillWorkOrderBasics(dialog, {
      title,
      description: 'Backdated paper record digitization flow',
    });

    await pickHistoricalStartDate(page, dialog);

    await expect(dialog.getByRole('button', { name: /build timeline/i })).toBeEnabled({
      timeout: 15_000,
    });
    await dialog.getByRole('button', { name: /build timeline/i }).click();
    const timelineDialog = page.getByRole('dialog').filter({ hasText: /build historical timeline/i });
    await expect(timelineDialog).toBeVisible({ timeout: 15_000 });
    await timelineDialog.getByRole('button', { name: /add event/i }).click();
    await expect(timelineDialog.getByRole('button', { name: /remove timeline event 3/i })).toBeVisible({ timeout: 15_000 });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '02-timeline-builder-add-event');

    await timelineDialog.getByRole('button', { name: /remove timeline event 3/i }).click();
    await timelineDialog.getByRole('button', { name: /save timeline/i }).click();
    await expect(timelineDialog).toBeHidden({ timeout: 15_000 });

    await dialog.getByRole('button', { name: /create work order/i }).click();
    const confirmHours = page.getByRole('button', { name: /yes, create without hours/i });
    if (await confirmHours.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await confirmHours.click();
    }
    await expect(page).toHaveURL(/\/dashboard\/work-orders\//, { timeout: 60_000 });
    await expect(page.getByRole('heading', { name: new RegExp(title, 'i') })).toBeVisible({
      timeout: 30_000,
    });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '03-historical-work-order-details');

    await page.getByRole('button', { name: /edit timeline/i }).click();
    const editDialog = page.getByRole('dialog').filter({ hasText: /timeline editor/i });
    await expect(editDialog).toBeVisible({ timeout: 15_000 });

    await page.mouse.click(8, 8);
    await expect(editDialog).toBeVisible();
    await editDialog.locator('button').filter({ hasText: /at \d+:\d+ (AM|PM)/i }).first().click();
    await expect(page.getByRole('button', { name: 'Today' })).toBeVisible({ timeout: 15_000 });
    await expect(editDialog).toBeVisible();
    await page.keyboard.press('Escape');

    await editDialog.getByRole('button', { name: /remove timeline event 2/i }).click();
    await editDialog.getByRole('button', { name: /^cancel$/i }).click();
    await expect(page.getByRole('alertdialog', { name: /discard timeline changes/i })).toBeVisible({
      timeout: 15_000,
    });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '04-discard-confirmation');

    await page.getByRole('button', { name: /keep editing/i }).click();
    await expect(editDialog).toBeVisible();
    await editDialog.getByRole('button', { name: /^cancel$/i }).click();
    await page.getByRole('button', { name: /discard changes/i }).click();
    await expect(editDialog).toBeHidden({ timeout: 15_000 });
    await expect(page.getByText(/historical record/i)).toBeVisible({ timeout: 15_000 });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '05-timeline-dismiss-guards-verified');
  });
});
