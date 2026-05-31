import { test, expect } from '../fixtures/equipqr-test';

test.describe('bulk and parts @full', () => {
  test('bulk equipment grid route loads', async ({ page, assertHealthyShell }) => {
    await page.goto('/dashboard/equipment/bulk');
    await assertHealthyShell();
    await expect(page.locator('#main-content, main').first()).toBeVisible();
  });

  test('bulk inventory route loads', async ({ page, assertHealthyShell }) => {
    await page.goto('/dashboard/inventory/bulk');
    await assertHealthyShell();
    await expect(page.locator('#main-content, main').first()).toBeVisible();
  });

  test('part lookup page loads', async ({ gotoDashboard, page, assertHealthyShell }) => {
    await gotoDashboard('/part-lookup');
    await assertHealthyShell();
    await expect(page.getByText(/part lookup|lookup/i).first()).toBeVisible({
      timeout: 60_000,
    });
  });

  test('alternate groups list loads', async ({ gotoDashboard, page, assertHealthyShell }) => {
    await gotoDashboard('/alternate-groups');
    await assertHealthyShell();
    await expect(page.getByText(/alternate|group/i).first()).toBeVisible({
      timeout: 60_000,
    });
  });
});
