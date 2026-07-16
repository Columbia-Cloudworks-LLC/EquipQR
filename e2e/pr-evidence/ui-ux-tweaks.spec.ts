import { test, expect } from '../user/fixtures/equipqr-test';
import { seedInventory } from '../user/shared/seed-data';
import { evidencePause, evidenceScreenshot } from './shared/evidence-helpers';

test.describe('UI/UX tweaks pass @pr-evidence', () => {
  test('equipment, inventory, alternate groups, and reports export console', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard('/equipment');
    await assertHealthyShell();
    await expect(page.getByRole('heading', { name: /equipment/i })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('textbox', { name: /search equipment/i })).toBeVisible();

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '01-equipment-toolbar-card-view');

    const tableViewToggle = page.getByRole('radio', { name: /table view/i });
    await tableViewToggle.click();
    await expect(tableViewToggle).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('button', { name: /sort by name/i })).toBeVisible({
      timeout: 15_000,
    });

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '02-equipment-table-view', { target: tableViewToggle });

    await gotoDashboard('/inventory');
    await assertHealthyShell();
    await expect(page.getByRole('heading', { name: /inventory/i })).toBeVisible({ timeout: 30_000 });

    const inventorySearch = page.getByRole('textbox', {
      name: /search inventory by name, sku, or (external )?id/i,
    });
    await inventorySearch.fill('HYD-OIL');
    await expect(page.getByText(seedInventory.hydraulicOil.name).first()).toBeVisible({
      timeout: 30_000,
    });

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '03-inventory-list-search', { target: inventorySearch });

    await gotoDashboard('/alternate-groups');
    await assertHealthyShell();
    await expect(page.getByRole('heading', { name: /alternate part groups/i })).toBeVisible({
      timeout: 30_000,
    });

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '04-alternate-groups-cards');

    const groupsTableToggle = page.getByRole('radio', { name: /table view/i });
    await groupsTableToggle.click();
    await expect(groupsTableToggle).toHaveAttribute('aria-checked', 'true');
    await expect(
      page.getByRole('textbox', { name: /search alternate groups or parts/i }),
    ).toBeVisible({ timeout: 15_000 });

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '05-alternate-groups-table', { target: groupsTableToggle });

    await gotoDashboard('/reports');
    await assertHealthyShell();
    await expect(page.getByRole('heading', { name: /fleet export console/i })).toBeVisible({
      timeout: 30_000,
    });

    const fieldsPicker = page.getByRole('button', { name: /fields to export/i }).first();
    await fieldsPicker.click();
    await expect(page.getByRole('checkbox').first()).toBeVisible({ timeout: 15_000 });

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '06-reports-inline-column-picker', { target: fieldsPicker });

    const exportButton = page.getByRole('button', { name: /^export$/i }).first();
    await exportButton.click();
    await expect(page.getByText(/export in progress/i).first()).toBeVisible({
      timeout: 30_000,
    });

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '07-reports-export-triggered', { target: exportButton });
  });
});
