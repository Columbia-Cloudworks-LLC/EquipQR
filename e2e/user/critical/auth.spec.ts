import path from 'path';
import { test, expect } from '../fixtures/equipqr-test';
import { authStatePath } from '../shared/seed-data';

test.describe('authentication @critical', () => {
  test('reuses saved owner storage state', async ({ browser }) => {
    const statePath = path.resolve(authStatePath('owner'));
    const context = await browser.newContext({ storageState: statePath });
    const page = await context.newPage();
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/i, { timeout: 60_000 });
    await expect(page.locator('#main-content, main').first()).toBeVisible();
    await context.close();
  });

  test('admin storage state reaches dashboard', async ({ browser }) => {
    const statePath = path.resolve(authStatePath('admin'));
    const context = await browser.newContext({ storageState: statePath });
    const page = await context.newPage();
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/i, { timeout: 60_000 });
    await context.close();
  });

  test('technician storage state reaches dashboard', async ({ browser }) => {
    const statePath = path.resolve(authStatePath('technician'));
    const context = await browser.newContext({ storageState: statePath });
    const page = await context.newPage();
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/i, { timeout: 60_000 });
    await context.close();
  });
});
