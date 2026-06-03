import { test, expect } from '../fixtures/equipqr-test';
import { seedEquipment } from '../shared/seed-data';

test.describe('fleet map @full', () => {
  test('fleet map page loads map shell', async ({ gotoDashboard, page, assertHealthyShell }) => {
    await gotoDashboard('/fleet-map');
    await assertHealthyShell();
    await expect(page.locator('#main-content, main').first()).toBeVisible();
    await expect(page.getByText(/fleet|map/i).first()).toBeVisible({ timeout: 60_000 });
  });

  test('shows equipment list or map markers for Apex fleet', async ({ gotoDashboard, page, assertHealthyShell }) => {
    await gotoDashboard('/fleet-map');
    await assertHealthyShell();
    const hasMapKey = Boolean(process.env.VITE_GOOGLE_MAPS_API_KEY);
    if (hasMapKey) {
      await expect(
        page.getByText(seedEquipment.cat320.name).or(page.locator('[aria-label*="Map"]')).first(),
      ).toBeVisible({ timeout: 60_000 });
    } else {
      await expect(page.getByText(/map|location|equipment|api key|unavailable/i).first()).toBeVisible({
        timeout: 60_000,
      });
    }
  });
});
