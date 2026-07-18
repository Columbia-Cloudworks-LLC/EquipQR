import { test, expect } from '../user/fixtures/equipqr-test';
import { newPersonaPage } from '../user/shared/auth-helpers';
import { seedWorkOrders } from '../user/shared/seed-data';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

test.describe('Revert PM Completion reopens work order @pr-evidence', () => {
  test('admin reverts completed PM and unlocked work order in one action', async ({ browser }) => {
    const { context, page } = await newPersonaPage(browser, 'admin');
    const workOrder = seedWorkOrders.apexCompletedPm;

    await page.goto(`/dashboard/work-orders/${workOrder.id}`);
    await expect(page.getByText(/pm checklist|preventative maintenance|checklist/i).first()).toBeVisible({
      timeout: 60_000,
    });

    const revertButton = page.getByRole('button', { name: /revert pm completion/i });
    await expect(revertButton).toBeVisible({ timeout: 30_000 });
    await evidenceScreenshot(page, '01-completed-pm-locked-work-order', { target: revertButton });
    await evidencePause(page, 600);

    await revertButton.click();
    const confirmDialog = page.getByRole('alertdialog');
    await expect(confirmDialog).toBeVisible();
    await expect(confirmDialog.getByText(/back to pending/i)).toBeVisible();
    await expect(confirmDialog.getByText(/reopen this work order to accepted/i)).toBeVisible();
    await evidenceScreenshot(page, '02-revert-pm-confirm-reopens-work-order', {
      target: confirmDialog,
    });
    await evidencePause(page, 600);

    await confirmDialog.getByRole('button', { name: /yes, revert completion/i }).click();

    await expect(page.getByText(/work order reopened to accepted|pm reverted/i).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/accepted/i).first()).toBeVisible({ timeout: 30_000 });
    await expect(revertButton).toHaveCount(0);

    const saveOrComplete = page
      .getByRole('button', { name: /save changes|complete pm|save pm/i })
      .first();
    await expect(saveOrComplete).toBeVisible({ timeout: 30_000 });
    await evidenceScreenshot(page, '03-pm-editable-after-coupled-revert', {
      target: saveOrComplete,
    });
    await evidencePause(page, 800);

    await context.close();
  });
});
