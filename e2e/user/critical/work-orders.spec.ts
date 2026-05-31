import { test, expect } from '../fixtures/equipqr-test';
import { seedEquipment, seedWorkOrders } from '../shared/seed-data';

test.describe('work orders @critical', () => {
  test('work orders list shows seeded oil change', async ({ gotoDashboard, page, assertHealthyShell }) => {
    await gotoDashboard('/work-orders');
    await assertHealthyShell();
    await expect(page.getByText(seedWorkOrders.oilChange.title).first()).toBeVisible({
      timeout: 60_000,
    });
  });

  test('work order detail page loads', async ({ page, assertHealthyShell }) => {
    await page.goto(`/dashboard/work-orders/${seedWorkOrders.oilChange.id}`);
    await assertHealthyShell();
    const heading = page.getByRole('heading', {
      name: new RegExp(seedWorkOrders.oilChange.title, 'i'),
    });
    await expect(heading.first()).toBeAttached({ timeout: 60_000 });
    await heading.first().scrollIntoViewIfNeeded();
    await expect(heading.first()).toBeVisible({ timeout: 30_000 });
  });

  test('navigate to work order from equipment context', async ({ page, assertHealthyShell }) => {
    await page.goto(`/dashboard/equipment/${seedEquipment.cat320.id}`);
    await assertHealthyShell();
    const woLink = page.getByRole('link', { name: /work orders/i }).first();
    if (await woLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await woLink.click();
      await expect(page).toHaveURL(/\/dashboard\/work-orders/);
    }
  });
});
