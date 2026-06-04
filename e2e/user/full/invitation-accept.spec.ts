import { test, expect } from '../fixtures/equipqr-test';
import { seedInvitations } from '../shared/seed-data';

test.describe('invitation accept @full', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('loads pending invitation details by token', async ({ page }) => {
    await page.goto(`/invitation/${seedInvitations.pendingApex.token}`);
    await expect(page).toHaveURL(/\/auth/i, { timeout: 60_000 });
    await expect(page.getByText(/apex construction/i).first()).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByLabel(/^email/i)).toHaveValue(seedInvitations.pendingApex.email, {
      timeout: 60_000,
    });
    await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
  });
});
