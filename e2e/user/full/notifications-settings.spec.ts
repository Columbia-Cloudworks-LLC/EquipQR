import { test, expect } from '../fixtures/equipqr-test';

test.describe('notifications @full', () => {
  test('notifications page loads', async ({ gotoDashboard, page, assertHealthyShell }) => {
    await gotoDashboard('/notifications');
    await assertHealthyShell();
    await expect(page.locator('#main-content, main').first()).toBeVisible();
  });
});
