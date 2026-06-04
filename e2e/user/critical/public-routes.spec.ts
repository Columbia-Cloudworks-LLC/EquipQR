import { test, expect } from '../fixtures/equipqr-test';
import { expectPublicQrRouteHealthy } from '../shared/auth-helpers';
import { assertRouteHealthy } from '../shared/page-helpers';
import { PUBLIC_MARKETING_PATHS } from '../shared/marketing-routes';
import { seedEquipment } from '../shared/seed-data';

test.describe('public routes @critical', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('landing and all marketing routes render', async ({ page, consoleErrors }) => {
    void consoleErrors;
    await assertRouteHealthy(page, '/');
    await expect(page.locator('body')).not.toBeEmpty();

    await page.goto('/landing?e2e=1#features');
    await expect(page).toHaveURL(/\/(\?e2e=1)?#features$/);

    for (const route of PUBLIC_MARKETING_PATHS) {
      await assertRouteHealthy(page, route);
    }

    for (const route of [
      '/do-not-sell-or-share',
      '/security',
      '/support',
      '/privacy-request',
    ]) {
      await assertRouteHealthy(page, route);
    }
  });

  test('auth page shows dev quick login on localhost', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.locator('span', { hasText: /^Dev Quick Login$/ })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole('button', { name: /quick login/i })).toBeVisible();
  });

  test('public equipment QR route loads scan shell', async ({ page }) => {
    await expectPublicQrRouteHealthy(page, `/qr/equipment/${seedEquipment.cat320.id}`);
  });

  test('signed-in owner visiting landing redirects to dashboard', async ({ browser }) => {
    const state = await browser.newContext({ storageState: 'tmp/playwright/auth/owner.json' });
    const page = await state.newPage();
    await page.goto('/');
    await expect(page).toHaveURL(/\/dashboard/i, { timeout: 60_000 });
    await expect(page.locator('body')).not.toBeEmpty();
    await state.close();
  });
});
