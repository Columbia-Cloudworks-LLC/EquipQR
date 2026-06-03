import { test, expect } from '../fixtures/equipqr-test';

test.describe('signup success UX @full', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('shows check-email success view after signup submit', async ({ page }) => {
    const uniqueEmail = `e2e-signup-${Date.now()}@example.com`;

    await page.goto('/auth');
    await page.getByRole('tab', { name: /sign up/i }).click();

    await page.getByLabel(/^full name|^name/i).fill('E2E Signup User');
    await page.getByLabel(/^email/i).fill(uniqueEmail);
    await page.getByLabel(/^password/i).first().fill('EquipQR-Test-2026!Aa');
    await page.getByLabel(/confirm password/i).fill('EquipQR-Test-2026!Aa');
    await page.getByLabel(/organization name/i).fill(`E2E Org ${Date.now()}`);

    const terms = page.getByRole('checkbox', { name: /terms|privacy/i }).first();
    if (await terms.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await terms.check();
    }

    const hcaptchaFrame = page.frameLocator('iframe[src*="hcaptcha"]');
    if (await hcaptchaFrame.locator('body').count().catch(() => 0)) {
      test.skip(true, 'hCaptcha enabled locally; signup requires manual captcha.');
    }

    await page.getByRole('button', { name: /create account|sign up/i }).click();

    await expect(page.getByTestId('signup-success-page')).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText(/check your email/i).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByLabel(/^email/i)).toHaveCount(0);
  });
});
