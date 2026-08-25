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

    const nextStep = page.getByRole('heading', { name: /^next step$/i });
    await expect(nextStep).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole('button', { name: /continue checklist|complete work order|start work|accept work order|resume work/i }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /add note/i })).toHaveCount(0);

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '01-mobile-details-overview', { target: nextStep });

    const actionButton = page.getByRole('button', { name: /open actions and settings|export/i }).first();
    await expect(actionButton).toBeVisible();
    await actionButton.click();

    await expect(page.getByRole('dialog').or(page.locator('[role="dialog"]'))).toBeVisible({
      timeout: 15_000,
    });
    const actionSheet = page.getByRole('dialog').or(page.locator('[role="dialog"]'));
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '02-mobile-action-sheet', { target: actionSheet });

    await page.getByRole('button', { name: /show work order qr code/i }).click();
    const downloadQr = page.getByRole('button', { name: /^download$/i });
    await expect(downloadQr).toBeVisible({ timeout: 15_000 });
    await expect(page.getByAltText('Work order QR code')).toBeVisible({ timeout: 15_000 });
    await expect(downloadQr).toBeEnabled({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: /how to use/i })).toBeVisible();
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '02b-work-order-qr-download', { target: downloadQr });

    const pngMenuItem = page.getByRole('menuitem', { name: /png/i });
    await expect(downloadQr).toBeEnabled({ timeout: 15_000 });
    await downloadQr.click();
    await expect(pngMenuItem).toBeVisible({ timeout: 10_000 });
    await evidenceScreenshot(page, '02c-work-order-qr-formats', { target: pngMenuItem });

    await page.keyboard.press('Escape');
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
      const statusSheet = page.getByRole('heading', { name: /change status/i });
      await evidencePause(page, 600);
      await evidenceScreenshot(page, '03-mobile-status-sheet', { target: statusSheet });
    }
  });

  test('shows revert on a locked completed work order', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard(`/dashboard/work-orders/${seedWorkOrders.completed.id}`);
    await assertHealthyShell();

    await expect(
      page.getByRole('heading', { name: new RegExp(seedWorkOrders.completed.title, 'i') }).first(),
    ).toBeVisible({ timeout: 60_000 });

    const revert = page.getByRole('button', { name: /revert to accepted/i });
    await expect(revert).toBeVisible({ timeout: 30_000 });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '04-mobile-locked-revert', { target: revert });
  });
});
