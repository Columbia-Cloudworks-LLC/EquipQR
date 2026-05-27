import path from 'path';
import { test, expect } from '../fixtures/equipqr-test';
import { authStatePath } from '../shared/seed-data';

test.describe('RBAC @critical', () => {
  test('owner sees admin-only sidebar items', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('link', { name: /pm templates/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole('link', { name: /audit log/i })).toBeVisible();
  });

  test('technician does not see admin-only PM Templates link', async ({ browser }) => {
    const statePath = path.resolve(authStatePath('technician'));
    const context = await browser.newContext({ storageState: statePath });
    const page = await context.newPage();
    await page.goto('/dashboard');
    await expect(page.getByRole('link', { name: /pm templates/i })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /audit log/i })).toHaveCount(0);
    await context.close();
  });

  test('owner can open Create Team on teams page', async ({ page }) => {
    await page.goto('/dashboard/teams');
    await expect(page.getByRole('button', { name: /create team/i }).first()).toBeVisible({
      timeout: 60_000,
    });
  });

  test('technician teams page hides Create Team', async ({ browser }) => {
    const statePath = path.resolve(authStatePath('technician'));
    const context = await browser.newContext({ storageState: statePath });
    const page = await context.newPage();
    await page.goto('/dashboard/teams');
    await expect(page.getByRole('button', { name: /create team/i })).toHaveCount(0);
    await context.close();
  });
});
