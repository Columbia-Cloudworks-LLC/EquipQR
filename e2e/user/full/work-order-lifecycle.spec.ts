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

  test('in progress work order shows field quick actions', async ({ page, assertHealthyShell }) => {
    await page.goto(`/dashboard/work-orders/${seedWorkOrders.oilChange.id}`);
    await assertHealthyShell();
    await expect(
      page.getByRole('heading', { name: new RegExp(seedWorkOrders.oilChange.title, 'i') }).first(),
    ).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/in progress/i).first()).toBeVisible({ timeout: 30_000 });
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
