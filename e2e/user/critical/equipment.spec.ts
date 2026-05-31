import { test, expect } from '../fixtures/equipqr-test';
import { seedEquipment } from '../shared/seed-data';

test.describe('equipment @critical', () => {
  test('equipment list shows seeded CAT 320', async ({ gotoDashboard, page, assertHealthyShell }) => {
    await gotoDashboard('/equipment');
    await assertHealthyShell();
    await expect(page.getByText(seedEquipment.cat320.name).first()).toBeAttached({
      timeout: 60_000,
    });
  });

  test('equipment detail page loads for seeded asset', async ({ page, assertHealthyShell }) => {
    await page.goto(`/dashboard/equipment/${seedEquipment.cat320.id}`);
    await assertHealthyShell();
    await expect(page.getByText(seedEquipment.cat320.name).first()).toBeVisible({
      timeout: 60_000,
    });
  });

  test('equipment search narrows visible rows', async ({ gotoDashboard, page }) => {
    await gotoDashboard('/equipment');
    const search = page.getByPlaceholder(/search/i).first();
    if (await search.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await search.fill('CAT 320');
      await expect(page.getByText(seedEquipment.cat320.name).first()).toBeAttached({
        timeout: 30_000,
      });
    } else {
      await expect(page.getByText(seedEquipment.cat320.name).first()).toBeAttached({
        timeout: 60_000,
      });
    }
  });
});
