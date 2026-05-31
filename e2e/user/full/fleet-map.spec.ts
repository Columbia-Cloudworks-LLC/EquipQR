import { test, expect } from '../fixtures/equipqr-test';

test.describe('fleet map @full', () => {
  test('fleet map page loads map shell', async ({ gotoDashboard, page, assertHealthyShell }) => {
    await gotoDashboard('/fleet-map');
    await assertHealthyShell();
    await expect(page.locator('#main-content, main').first()).toBeVisible();
    await expect(page.getByText(/fleet|map/i).first()).toBeVisible({ timeout: 60_000 });
  });
});
