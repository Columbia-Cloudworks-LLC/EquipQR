import { test, expect } from '../fixtures/equipqr-test';

test.describe('privacy request intake @full', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('shows validation errors for empty submit', async ({ page }) => {
    await page.goto('/privacy-request');
    await expect(page.getByRole('heading', { name: /privacy request/i })).toBeVisible({
      timeout: 30_000,
    });

    const submit = page.getByRole('button', { name: /submit request/i });
    await expect(submit).toBeDisabled();
  });

  test('submits privacy request and shows success state', async ({ page }) => {
    await page.goto('/privacy-request');

    await page.getByLabel(/full name/i).fill('E2E Privacy User');
    await page.getByLabel(/^email/i).fill(`e2e-privacy-${Date.now()}@example.com`);
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: /access my data/i }).click();
    await page.getByLabel(/additional details/i).fill('Playwright automated privacy request');

    const hcaptchaFrame = page.frameLocator('iframe[src*="hcaptcha"]');
    if (await hcaptchaFrame.locator('body').count().catch(() => 0)) {
      test.skip(true, 'hCaptcha enabled locally; privacy submit requires manual captcha.');
    }

    await page.getByRole('button', { name: /submit request/i }).click();

    await expect(
      page.getByText(/privacy request has been submitted|thank you|we will respond/i).first(),
    ).toBeVisible({ timeout: 60_000 });
  });
});
