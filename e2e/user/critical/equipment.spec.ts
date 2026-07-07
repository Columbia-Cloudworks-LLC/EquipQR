import { test, expect } from '../fixtures/equipqr-test';
import { seedEquipment } from '../shared/seed-data';

/** Wait for the paginated equipment list to finish its initial load. */
async function waitForEquipmentCards(page: import('@playwright/test').Page): Promise<void> {
  await expect(page.getByRole('button', { name: /show qr code for/i }).first()).toBeAttached({
    timeout: 60_000,
  });
}

test.describe('equipment @critical', () => {
  // The list is server-paginated and name-sorted, so with generated volume
  // data (#1164) a specific asset is not guaranteed on page 1 — assert via
  // search instead of raw list presence.
  test('equipment list renders paginated fleet', async ({ gotoDashboard, page, assertHealthyShell }) => {
    await gotoDashboard('/equipment');
    await assertHealthyShell();
    await waitForEquipmentCards(page);
  });

  test('equipment detail page loads for seeded asset', async ({ page, assertHealthyShell }) => {
    await page.goto(`/dashboard/equipment/${seedEquipment.cat320.id}`);
    await assertHealthyShell();
    await expect(page.getByText(seedEquipment.cat320.name).first()).toBeVisible({
      timeout: 60_000,
    });
  });

  test('equipment search narrows to seeded CAT 320', async ({ gotoDashboard, page }) => {
    await gotoDashboard('/equipment');
    // Let the initial load settle before typing so the controlled search
    // input is not reset by the first data render.
    await waitForEquipmentCards(page);
    const search = page.getByRole('textbox', { name: /search equipment/i }).first();
    await expect(search).toBeVisible({ timeout: 30_000 });
    await search.fill(seedEquipment.cat320.serialNumber);
    await expect(page.getByText(seedEquipment.cat320.name).first()).toBeAttached({
      timeout: 30_000,
    });
  });
});
