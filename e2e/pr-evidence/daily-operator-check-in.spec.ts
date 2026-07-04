import { test, expect } from '../user/fixtures/equipqr-test';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

test.describe('Daily operator check-ins @pr-evidence', () => {
  test('admin can open daily check-ins console', async ({ gotoDashboard, assertHealthyShell, page }) => {
    await gotoDashboard('/operator-check-ins');
    await assertHealthyShell();

    await expect(page.getByRole('heading', { level: 1, name: /daily check-ins/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole('tab', { name: /templates/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /daily ledger/i })).toBeVisible();

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '01-admin-daily-check-ins-console');
  });

  test('public operator check-in route handles unavailable token', async ({ page }) => {
    await page.goto('/qr/operator-check-in/invalid-test-token');
    await expect(page.getByText(/not available/i)).toBeVisible({ timeout: 30_000 });

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '02-public-check-in-unavailable');
  });
});
