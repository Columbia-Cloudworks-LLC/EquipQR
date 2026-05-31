import { test, expect } from '../fixtures/equipqr-test';

test.describe('notifications settings reports @full', () => {
  test('notifications page loads', async ({ gotoDashboard, page, assertHealthyShell }) => {
    await gotoDashboard('/notifications');
    await assertHealthyShell();
    await expect(page.locator('#main-content, main').first()).toBeVisible();
  });

  test('settings page loads', async ({ gotoDashboard, page, assertHealthyShell }) => {
    await gotoDashboard('/settings');
    await assertHealthyShell();
    await expect(page.getByText(/settings|profile|account/i).first()).toBeVisible({
      timeout: 60_000,
    });
  });

  test('reports page loads', async ({ gotoDashboard, page, assertHealthyShell }) => {
    await gotoDashboard('/reports');
    await assertHealthyShell();
    await expect(page.getByText(/report/i).first()).toBeVisible({ timeout: 60_000 });
  });
});
