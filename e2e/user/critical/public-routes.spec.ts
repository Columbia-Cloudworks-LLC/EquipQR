import { test, expect } from '../fixtures/equipqr-test';
import { assertRouteHealthy } from '../shared/page-helpers';
import { seedEquipment } from '../shared/seed-data';

test.describe('public routes @critical', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('landing and marketing pages render', async ({ page, consoleErrors }) => {
    void consoleErrors;
    await assertRouteHealthy(page, '/');
    await expect(page.locator('body')).not.toBeEmpty();

    await page.goto('/landing');
    await expect(page).toHaveURL(/\/?$/);

    for (const route of [
      '/privacy-policy',
      '/privacy-request',
      '/terms-of-service',
      '/security',
      '/support',
    ]) {
      await assertRouteHealthy(page, route);
    }
  });

  test('auth page shows dev quick login on localhost', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.getByText(/dev quick login/i)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: /quick login/i })).toBeVisible();
  });

  test('public equipment QR route loads scan shell', async ({ page }) => {
    await page.goto(`/qr/equipment/${seedEquipment.cat320.id}`);
    await expect(page.locator('body')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
  });
});
