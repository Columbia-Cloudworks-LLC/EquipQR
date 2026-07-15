import { test, expect } from '../user/fixtures/equipqr-test';
import { pinContextToOrg } from '../user/shared/auth-helpers';
import { apexOrgId, seedWorkOrders } from '../user/shared/seed-data';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

test.describe('PR evidence: convert existing work order to historical @pr-evidence', () => {
  test.beforeEach(async ({ context }) => {
    await pinContextToOrg(context, apexOrgId);
  });

  test('converts a completed work order and backdates its timeline', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard(`/work-orders/${seedWorkOrders.completed.id}`);
    await assertHealthyShell();
    await expect(page.getByRole('heading', { name: /track tension adjustment/i })).toBeVisible({
      timeout: 30_000,
    });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '01-completed-work-order-details');

    await page.getByRole('button', { name: /edit timeline/i }).click();
    const convertDialog = page.getByRole('dialog').filter({ hasText: /timeline editor/i });
    await expect(convertDialog).toBeVisible({ timeout: 15_000 });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '02-convert-dialog-open');

    await expect(convertDialog.getByRole('list', { name: /operational timeline events/i })).toBeVisible();
    await expect(convertDialog.getByLabel('Timeline step 1')).toBeVisible();
    await expect(
      convertDialog.getByRole('status', { name: /timeline ended at terminal status/i }),
    ).toBeVisible();

    await convertDialog.getByRole('button', { name: /save timeline/i }).click();
    await expect(convertDialog).toBeHidden({ timeout: 60_000 });
    await expect(page.getByText(/historical record/i)).toBeVisible({ timeout: 30_000 });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '03-converted-historical-badge');

    await page.getByRole('button', { name: /edit timeline/i }).click();
    const editDialog = page.getByRole('dialog').filter({ hasText: /timeline editor/i });
    await expect(editDialog).toBeVisible({ timeout: 15_000 });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '04-edit-timeline-after-conversion');
    await editDialog.getByRole('button', { name: /cancel/i }).click();
  });
});
