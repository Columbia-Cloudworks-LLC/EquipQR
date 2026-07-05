import { test, expect } from '../user/fixtures/equipqr-test';
import { pinContextToOrg } from '../user/shared/auth-helpers';
import { apexOrgId, seedEquipment } from '../user/shared/seed-data';
import { fillWorkOrderBasics, pickHistoricalStartDate } from '../user/shared/ui-form-helpers';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

test.describe('PR evidence: historical timeline improvements @pr-evidence', () => {
  test.beforeEach(async ({ context }) => {
    await pinContextToOrg(context, apexOrgId);
  });

  test('edits historical timeline and note timestamps', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    const title = `PR Evidence Historical Improvements ${Date.now()}`;

    await gotoDashboard('/work-orders');
    await assertHealthyShell();
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '01-work-orders-list');

    await gotoDashboard(
      `/equipment/${seedEquipment.cat320.id}?createWorkOrder=generic`,
    );
    const dialog = page.getByRole('dialog', { name: /create work order/i });
    await expect(dialog).toBeVisible({ timeout: 30_000 });

    await dialog.getByLabel(/historical work order/i).click();
    await fillWorkOrderBasics(dialog, {
      title,
      description: 'Backdated paperwork with improved timeline entry',
    });
    await pickHistoricalStartDate(page, dialog);

    await expect(dialog.getByRole('button', { name: /build timeline/i })).toBeEnabled({
      timeout: 15_000,
    });
    await dialog.getByRole('button', { name: /build timeline/i }).click();

    const timelineDialog = page.getByRole('dialog').filter({ hasText: /build historical timeline/i });
    await expect(timelineDialog).toBeVisible({ timeout: 15_000 });
    await timelineDialog.getByRole('button', { name: /add historical event/i }).click();
    await expect(timelineDialog.getByText('Event 3')).toBeVisible({ timeout: 15_000 });

    const firstDatePicker = timelineDialog.getByRole('button', { name: /January|February|March|April|May|June|July|August|September|October|November|December/i }).first();
    await firstDatePicker.click();
    await expect(timelineDialog.getByRole('button', { name: 'Today' })).toBeVisible();
    await expect(timelineDialog.getByRole('button', { name: 'Now' })).toBeVisible();
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '02-timeline-shortcuts-and-seeded-event');

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

    await page.getByRole('button', { name: /add note/i }).first().click();
    const noteField = page.getByPlaceholder(/enter your note/i);
    await noteField.fill('Historical paperwork note for timestamp editing');
    await page.getByRole('button', { name: /^save note$/i }).click();
    await expect(page.getByText('Historical paperwork note for timestamp editing')).toBeVisible({
      timeout: 30_000,
    });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '03-historical-note-added');

    await page.getByRole('button', { name: /edit time/i }).first().click();
    const noteTimestampDialog = page.getByRole('dialog', { name: /edit note timestamp/i });
    await expect(noteTimestampDialog).toBeVisible({ timeout: 15_000 });
    await noteTimestampDialog.getByRole('button', { name: 'Now' }).click();
    await noteTimestampDialog.getByRole('button', { name: /save timestamp/i }).click();
    await expect(noteTimestampDialog).toBeHidden({ timeout: 15_000 });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '04-note-timestamp-updated');

    await page.getByRole('button', { name: /edit historical timeline/i }).click();
    const editDialog = page.getByRole('dialog').filter({ hasText: /edit historical timeline/i });
    await expect(editDialog).toBeVisible({ timeout: 15_000 });
    await expect(editDialog.getByText(/^Reason$/i)).toHaveCount(0);
    await editDialog.getByRole('button', { name: /add historical event/i }).click();
    await expect(editDialog.getByText('Event 3')).toBeVisible({ timeout: 15_000 });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '05-edit-timeline-no-reason-field');
  });
});
