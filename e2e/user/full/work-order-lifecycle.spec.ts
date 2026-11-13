import { test, expect } from '../fixtures/equipqr-test';
import { seedWorkOrders } from '../shared/seed-data';

test.describe('work order lifecycle @full', () => {
  test('submitted work order detail shows requestor status surface', async ({
    page,
    assertHealthyShell,
  }) => {
    await page.goto(`/dashboard/work-orders/${seedWorkOrders.submitted.id}`);
    await assertHealthyShell();
    await expect(
      page.getByRole('heading', { name: new RegExp(seedWorkOrders.submitted.title, 'i') }).first(),
    ).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/submitted/i).first()).toBeVisible({ timeout: 30_000 });
  });

  test('in progress work order shows field quick actions', async ({
    page,
    assertHealthyShell,
    isMobile,
  }) => {
    await page.goto(`/dashboard/work-orders/${seedWorkOrders.oilChange.id}`);
    await assertHealthyShell();
    await expect(
      page.getByRole('heading', { name: new RegExp(seedWorkOrders.oilChange.title, 'i') }).first(),
    ).toBeVisible({ timeout: 60_000 });
    // Desktop shows status and its actions in the sidebar; mobile shows a status button that opens
    // the "Change status" sheet with the same actions.
    let statusActions = page.locator('body');
    if (isMobile) {
      const statusButton = page.getByRole('button', { name: /^status: in progress\. change status$/i });
      await expect(statusButton).toBeVisible({ timeout: 30_000 });
      await statusButton.click();
      statusActions = page.getByRole('dialog', { name: /change status/i });
    } else {
      await expect(page.getByText(/in progress/i).first()).toBeVisible({ timeout: 30_000 });
    }
    await expect(statusActions.getByRole('button', { name: /^complete$/i }).first()).toBeVisible();
    await expect(statusActions.getByRole('button', { name: /^put on hold$/i }).first()).toBeVisible();
  });

  test('completed work order shows completed status', async ({ page, assertHealthyShell }) => {
    await page.goto(`/dashboard/work-orders/${seedWorkOrders.completed.id}`);
    await assertHealthyShell();
    await expect(page.getByText(/completed/i).first()).toBeVisible({ timeout: 30_000 });
  });

  test('cancelled work order shows cancelled status', async ({ page, assertHealthyShell }) => {
    await page.goto(`/dashboard/work-orders/${seedWorkOrders.cancelled.id}`);
    await assertHealthyShell();
    await expect(page.getByText(/cancelled/i).first()).toBeVisible({ timeout: 30_000 });
  });
});
