import { test, expect } from '../user/fixtures/equipqr-test';
import { newPersonaPage } from '../user/shared/auth-helpers';
import { seedWorkOrders } from '../user/shared/seed-data';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';
import { resetCompletedWorkOrderForRevertEvidence } from '../user/shared/fresh-start-reset';

test.describe('Reopen work order refreshes work order details @pr-evidence', () => {
  test('admin confirms reopen after cancel keeps the work order unchanged', async ({ browser }) => {
    await resetCompletedWorkOrderForRevertEvidence();

    const { context, page } = await newPersonaPage(browser, 'admin');
    const workOrder = seedWorkOrders.completed;

    await page.goto(`/dashboard/work-orders/${workOrder.id}`);
    await expect(
      page.getByRole('heading', { name: new RegExp(workOrder.title, 'i') }).first(),
    ).toBeVisible({ timeout: 60_000 });

    const lockWarning = page.getByText(/this work order is completed/i);
    await expect(lockWarning).toBeVisible({ timeout: 30_000 });

    await expect(
      page.getByText(/need to edit the work order without changing the pm checklist\?/i),
    ).toBeVisible({ timeout: 30_000 });
    const revertButton = page.getByRole('button', { name: /reopen work order/i });
    await expect(revertButton).toBeVisible({ timeout: 30_000 });
    await evidenceScreenshot(page, '01-completed-lock-warning-revert-control', {
      target: revertButton,
    });
    await evidencePause(page, 600);

    await revertButton.click();
    const confirmDialog = page.getByRole('alertdialog');
    await expect(confirmDialog).toBeVisible({ timeout: 30_000 });
    await expect(confirmDialog.getByText(/the pm checklist stays completed\./i)).toBeVisible({
      timeout: 30_000,
    });
    await evidenceScreenshot(page, '02-reopen-work-order-confirm-dialog', {
      target: confirmDialog,
    });
    await evidencePause(page, 600);

    await confirmDialog.getByRole('button', { name: /^cancel$/i }).click();
    await expect(confirmDialog).toHaveCount(0, { timeout: 30_000 });
    await expect(lockWarning).toBeVisible({ timeout: 30_000 });
    await expect(revertButton).toBeVisible({ timeout: 30_000 });

    await revertButton.click();
    await expect(confirmDialog).toBeVisible({ timeout: 30_000 });
    await confirmDialog.getByRole('button', { name: /yes, reopen work order/i }).click();

    await expect(page.getByText(/work order reopened/i).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/status changed from completed to accepted/i).first()).toBeVisible({
      timeout: 30_000,
    });

    // Without a hard refresh: lock warning + revert control must leave the page.
    await expect(lockWarning).toHaveCount(0, { timeout: 30_000 });
    await expect(revertButton).toHaveCount(0);

    const acceptedBadge = page.getByText(/^accepted$/i).first();
    await expect(acceptedBadge).toBeVisible({ timeout: 30_000 });
    await evidenceScreenshot(page, '03-accepted-unlocked-after-reopen-no-refresh', {
      target: acceptedBadge,
    });
    await evidencePause(page, 800);

    await context.close();
  });
});
