import { test, expect } from '../fixtures/equipqr-test';
import {
  loginAndPersistStorageState,
  logoutFromApp,
  quickLogin,
  signInWithEmailPassword,
} from '../shared/auth-helpers';
import { personas } from '../shared/seed-data';

test.describe('auth lifecycle @critical', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('protected route redirects unauthenticated users to auth', async ({ page }) => {
    await page.goto('/dashboard/equipment');
    await expect(page).toHaveURL(/\/auth/i, { timeout: 60_000 });
  });

  test('pending redirect is restored after email sign-in', async ({ page }) => {
    await page.goto('/dashboard/work-orders');
    await expect(page).toHaveURL(/\/auth/i, { timeout: 60_000 });

    await signInWithEmailPassword(page, personas.owner.email);
    await expect(page).toHaveURL(/\/dashboard\/work-orders/i, { timeout: 60_000 });
  });

  test('email password sign-in reaches dashboard', async ({ page }) => {
    await signInWithEmailPassword(page, personas.admin.email);
    await expect(page).toHaveURL(/\/dashboard/i, { timeout: 60_000 });
    await expect(page.getByRole('button', { name: /user menu/i })).toBeVisible({
      timeout: 60_000,
    });
  });

  test('logout requires auth again for protected routes', async ({ page }) => {
    await quickLogin(page, 'owner');
    await logoutFromApp(page);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/auth|\/$/i, { timeout: 60_000 });
    await loginAndPersistStorageState(page, 'owner');
  });
});
