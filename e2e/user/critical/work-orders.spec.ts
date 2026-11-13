import { test, expect } from '../fixtures/equipqr-test';
import { seedEquipment, seedWorkOrders } from '../shared/seed-data';

test.describe('work orders @critical', () => {
  test('work orders list shows seeded oil change', async ({ gotoDashboard, page, assertHealthyShell }) => {
    await gotoDashboard('/work-orders');
    await assertHealthyShell();
    await page.getByRole('textbox', { name: 'Search work orders', exact: true }).fill(seedWorkOrders.oilChange.title);
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
    await page.goto(`/dashboard/equipment/${seedEquipment.cat320.id}?tab=work-orders`);
    await assertHealthyShell();
    await expect(page.getByRole('tab', { name: /work orders/i })).toHaveAttribute(
      'aria-selected',
      'true',
      { timeout: 60_000 },
    );
    await page
      .getByRole('heading', { name: seedWorkOrders.oilChange.title, exact: true })
      .first()
      .click({ timeout: 60_000 });
    await expect(page).toHaveURL(
      new RegExp(`/dashboard/work-orders/${seedWorkOrders.oilChange.id}`),
      { timeout: 60_000 },
    );
  });
});
