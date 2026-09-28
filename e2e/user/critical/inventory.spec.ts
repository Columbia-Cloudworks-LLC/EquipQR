import { test, expect } from '../fixtures/equipqr-test';
import { seedInventory } from '../shared/seed-data';

test.describe('inventory @critical', () => {
  test('inventory list shows seeded parts', async ({ gotoDashboard, page, assertHealthyShell }) => {
    await gotoDashboard('/inventory');
    await assertHealthyShell();
    await page.getByRole('textbox', { name: /^Search inventory by name/ }).fill(seedInventory.hydraulicOil.sku);
    await expect(page.getByText(seedInventory.hydraulicOil.name).first()).toBeVisible({
      timeout: 60_000,
    });
  });

  test('inventory detail page loads', async ({ page, assertHealthyShell }) => {
    await page.goto(`/dashboard/inventory/${seedInventory.hydraulicOil.id}`);
    await assertHealthyShell();
    await expect(page.getByText(seedInventory.hydraulicOil.name).first()).toBeVisible({
      timeout: 60_000,
    });
  });

  test('low-stock item is visible in list', async ({ gotoDashboard, page }) => {
    await gotoDashboard('/inventory');
    await page.getByRole('textbox', { name: /^Search inventory by name/ }).fill(seedInventory.lowStockFilter.sku);
    await expect(page.getByText(seedInventory.lowStockFilter.name).first()).toBeVisible({
      timeout: 60_000,
    });
  });
});
