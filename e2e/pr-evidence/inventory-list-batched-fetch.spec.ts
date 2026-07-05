import { test, expect } from '../user/fixtures/equipqr-test';
import { seedInventory } from '../user/shared/seed-data';
import { evidencePause, evidenceScreenshot } from './shared/evidence-helpers';

test.describe('Inventory list batched fetch @pr-evidence', () => {
  test('inventory list loads, filters, and keeps working after search and low-stock toggles', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard('/inventory');
    await assertHealthyShell();

    await expect(page.getByRole('heading', { name: /inventory/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(seedInventory.hydraulicOil.name).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(seedInventory.lowStockFilter.name).first()).toBeVisible({
      timeout: 30_000,
    });

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '01-inventory-list-loaded');

    const search = page.getByRole('textbox', {
      name: /search inventory by name, sku, or (external )?id/i,
    });
    await search.fill('Hydraulic');
    await expect(page.getByText(seedInventory.hydraulicOil.name).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(seedInventory.lowStockFilter.name)).toHaveCount(0);

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '02-inventory-search-filter');

    await search.clear();
    await expect(page.getByText(seedInventory.lowStockFilter.name).first()).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole('button', { name: /^filter inventory/i }).click();
    const lowStockSwitch = page.getByRole('switch', { name: /low stock only/i });
    await lowStockSwitch.click();
    await expect(page.getByText(seedInventory.hydraulicOil.name)).toHaveCount(0);
    await expect(page.getByText(seedInventory.lowStockFilter.name).first()).toBeVisible({
      timeout: 15_000,
    });

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '03-inventory-low-stock-filter');
  });
});
