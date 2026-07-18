import { test, expect } from '../user/fixtures/equipqr-test';
import { newPersonaPage } from '../user/shared/auth-helpers';
import { seedWorkOrders } from '../user/shared/seed-data';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';
import { resetCompletedWorkOrderForRevertEvidence } from '../user/shared/fresh-start-reset';

test.describe('Revert to Accepted refreshes work order details @pr-evidence', () => {
  test('admin revert updates status and unlocks UI without browser refresh', async ({ browser }) => {
    await resetCompletedWorkOrderForRevertEvidence();

    const { context, page } = await newPersonaPage(browser, 'admin');
    const workOrder = seedWorkOrders.completed;

    await page.goto(`/dashboard/work-orders/${workOrder.id}`);
    await expect(
      page.getByRole('heading', { name: new RegExp(workOrder.title, 'i') }).first(),
    ).toBeVisible({ timeout: 60_000 });

    const lockWarning = page.getByText(/this work order is completed/i);
    await expect(lockWarning).toBeVisible({ timeout: 30_000 });

    const revertButton = page.getByRole('button', { name: /revert to accepted/i });
    await expect(revertButton).toBeVisible({ timeout: 30_000 });
    await evidenceScreenshot(page, '01-completed-lock-warning-revert-control', {
      target: revertButton,
    });
    await evidencePause(page, 600);

    await revertButton.click();

    await expect(page.getByText(/work order reverted/i).first()).toBeVisible({
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
    await evidenceScreenshot(page, '02-accepted-unlocked-after-revert-no-refresh', {
      target: acceptedBadge,
    });
    await evidencePause(page, 800);

    await context.close();
  });
});
