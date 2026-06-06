import { test, expect } from '../fixtures/equipqr-test';
import { expectPublicQrRouteHealthy } from '../shared/auth-helpers';
import { seedEquipment, seedInventory, seedWorkOrders } from '../shared/seed-data';

test.describe('QR redirects @full', () => {
  test('authenticated equipment QR scan then opens dashboard record', async ({ page }) => {
    await page.goto(`/qr/equipment/${seedEquipment.cat320.id}`);
    await expect(page.getByRole('heading', { name: seedEquipment.cat320.name })).toBeVisible({
      timeout: 60_000,
    });
    await page.getByRole('button', { name: /open full dashboard record/i }).click();
    await page.waitForURL(new RegExp(`/dashboard/equipment/${seedEquipment.cat320.id}`), {
      timeout: 60_000,
    });
    await expect(page.locator('#main-content, main').first()).toBeVisible();
  });

  test('unauthenticated equipment QR shows scan shell without error boundary', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`/qr/equipment/${seedEquipment.cat320.id}`);
    await expect(page.locator('body')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
    const onAuth = /\/auth/i.test(page.url());
    const onQr = /\/qr\/equipment/i.test(page.url());
    expect(onAuth || onQr).toBe(true);
    await context.close();
  });

  test('work order QR lands on work order detail', async ({ page }) => {
    await page.goto(`/qr/work-order/${seedWorkOrders.oilChange.id}`);
    await expect(page).toHaveURL(
      new RegExp(`/dashboard/work-orders/${seedWorkOrders.oilChange.id}`),
      { timeout: 60_000 },
    );
    await expect(
      page.getByRole('heading', { name: new RegExp(seedWorkOrders.oilChange.title, 'i') }).first(),
    ).toBeVisible({ timeout: 60_000 });
  });

  test('inventory QR lands on inventory detail', async ({ page }) => {
    await page.goto(`/qr/inventory/${seedInventory.hydraulicOil.id}`);
    await expect(page).toHaveURL(
      new RegExp(`/dashboard/inventory/${seedInventory.hydraulicOil.id}`),
      { timeout: 60_000 },
    );
    await expect(page.getByText(seedInventory.hydraulicOil.name).first()).toBeVisible({
      timeout: 60_000,
    });
  });

  test('legacy equipment QR path loads', async ({ page }) => {
    await expectPublicQrRouteHealthy(page, `/qr/${seedEquipment.cat320.id}`);
  });
});
