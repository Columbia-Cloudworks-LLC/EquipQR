import { test, expect } from '../user/fixtures/equipqr-test';
import { pinContextToOrg } from '../user/shared/auth-helpers';
import { apexOrgId, authStatePath, seedWorkOrders } from '../user/shared/seed-data';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

test.use({ storageState: authStatePath('owner') });

test.describe('Work order delete placement @pr-evidence', () => {
  test.beforeEach(async ({ context }) => {
    await pinContextToOrg(context, apexOrgId);
  });

  test('keeps desktop delete in the trailing export menu with confirmation', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    const detailsDeleteTarget = seedWorkOrders.oilChange;

    await gotoDashboard(`/dashboard/work-orders/${detailsDeleteTarget.id}`);
    await assertHealthyShell();

    await expect(
      page.getByRole('heading', { name: new RegExp(detailsDeleteTarget.title, 'i') }).first(),
    ).toBeVisible({ timeout: 60_000 });

    const exportButton = page.getByRole('button', { name: /^export$/i });
    await expect(exportButton).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: /delete work order/i })).toHaveCount(0);

    await exportButton.click();

    const deleteItem = page.getByRole('menuitem', { name: /delete work order/i });
    await expect(deleteItem).toBeVisible({ timeout: 15_000 });
    expect(await deleteItem.evaluate((node) => node.parentElement?.lastElementChild === node)).toBe(true);
    expect(await deleteItem.evaluate((node) => node.previousElementSibling?.getAttribute('role'))).toBe('separator');
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '01-desktop-delete-menu', { target: deleteItem });

    await deleteItem.click();
    const confirmDialog = page.getByRole('alertdialog');
    await expect(confirmDialog.getByRole('heading', { name: /delete work order/i })).toBeVisible();
    await expect(confirmDialog.getByText(/irreversible/i)).toBeVisible();
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '02-desktop-delete-confirm', { target: confirmDialog });

    await confirmDialog.getByRole('button', { name: /cancel/i }).click();
    await expect(confirmDialog).toBeHidden({ timeout: 15_000 });
  });

  test.describe('mobile owner view', () => {
    test.use({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      userAgent:
        'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36',
    });

    test('keeps delete last in the action sheet and requires typed confirmation', async ({
      gotoDashboard,
      assertHealthyShell,
      page,
    }) => {
      const detailsDeleteTarget = seedWorkOrders.oilChange;

      await gotoDashboard(`/dashboard/work-orders/${detailsDeleteTarget.id}`);
      await assertHealthyShell();

      await expect(
        page.getByRole('heading', { name: new RegExp(detailsDeleteTarget.title, 'i') }).first(),
      ).toBeVisible({ timeout: 60_000 });

      const quickActionsButton = page.getByRole('button', { name: /open work order quick actions/i });
      await expect(quickActionsButton).toBeVisible({ timeout: 30_000 });
      await quickActionsButton.click();

      const actionSheetHeading = page.getByRole('heading', { name: /work order actions/i });
      await expect(actionSheetHeading).toBeVisible({ timeout: 15_000 });

      const deleteButton = page.getByRole('button', { name: /delete work order/i });
      await expect(deleteButton).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText(/^admin$/i)).toHaveCount(0);
      await expect(deleteButton).toHaveClass(/border/);
      await expect(deleteButton).toHaveClass(/bg-background/);
      await expect(deleteButton).not.toHaveClass(/text-destructive-foreground/);
      expect(await deleteButton.evaluate((node) => node.parentElement?.lastElementChild === node)).toBe(true);
      expect(await deleteButton.evaluate((node) => node.previousElementSibling?.className.includes('bg-border') ?? false)).toBe(true);

      await evidencePause(page, 600);
      await evidenceScreenshot(page, '03-mobile-delete-sheet', { target: deleteButton });

      await deleteButton.click();
      const confirmDialog = page.getByRole('alertdialog');
      const confirmInput = confirmDialog.getByLabel(/type delete to confirm/i);
      await expect(confirmInput).toBeVisible({ timeout: 15_000 });
      await confirmInput.fill('DELETE');
      await expect(confirmDialog.getByRole('button', { name: /delete permanently/i })).toBeEnabled();
      await evidencePause(page, 600);
      await evidenceScreenshot(page, '04-mobile-delete-confirm', { target: confirmDialog });

      await confirmDialog.getByRole('button', { name: /cancel/i }).click();
      await expect(confirmDialog).toBeHidden({ timeout: 15_000 });
    });
  });
});
