import { test, expect } from '../user/fixtures/equipqr-test';
import { seedWorkOrders } from '../user/shared/seed-data';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

const MOBILE_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36';

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  userAgent: MOBILE_USER_AGENT,
});

test.describe('Mobile work order details UX @pr-evidence', () => {
  test('captures mobile summary, action sheet, and status sheet', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard(`/dashboard/work-orders/${seedWorkOrders.oilChange.id}`);
    await assertHealthyShell();

    await expect(
      page.getByRole('heading', { name: new RegExp(seedWorkOrders.oilChange.title, 'i') }).first(),
    ).toBeVisible({ timeout: 60_000 });

    await expect(
      page.getByRole('button', { name: /status: in progress\. change status/i }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/^high$/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^note$/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^complete$/i }).first()).toBeVisible();

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '01-mobile-details-overview');

    const actionButton = page.getByRole('button', { name: /open actions and settings|export/i }).first();
    await expect(actionButton).toBeVisible();
    await actionButton.click();

    await expect(page.getByRole('dialog').or(page.locator('[role="dialog"]'))).toBeVisible({
      timeout: 15_000,
    });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '02-mobile-action-sheet');

    await page.keyboard.press('Escape');
    await expect(page.getByText(/change status/i)).not.toBeVisible({ timeout: 10_000 });

    const statusButton = page.getByRole('button', {
      name: /status:.*change status/i,
    });
    if (await statusButton.isVisible().catch(() => false)) {
      await statusButton.click();
      await expect(page.getByRole('heading', { name: /change status/i })).toBeVisible({
        timeout: 15_000,
      });
      await evidencePause(page, 600);
      await evidenceScreenshot(page, '03-mobile-status-sheet');
    }
  });
});
