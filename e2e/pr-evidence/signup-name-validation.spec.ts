import { test, expect } from '../user/fixtures/equipqr-test';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

// Unauthenticated — default owner storage would redirect /auth to the dashboard.
test.use({ storageState: { cookies: [], origins: [] } });

/**
 * PR evidence for #1332 — empty/whitespace signup names must show validation
 * feedback instead of silently storing the email as the display name.
 */
test.describe('PR evidence signup name validation @pr-evidence', () => {
  test('signup form requires a real full name', async ({ page }) => {
    await page.goto('/auth?tab=signup', { waitUntil: 'domcontentloaded' });

    const signupTab = page.getByRole('tab', { name: /sign up/i });
    await expect(signupTab).toBeVisible({ timeout: 30_000 });
    await signupTab.click();

    const nameInput = page.getByLabel(/full name/i);
    await expect(nameInput).toBeVisible({ timeout: 30_000 });

    await nameInput.fill('Ada Lovelace');
    await page.getByLabel(/^email$/i).fill('ada.evidence@example.com');
    await page.getByLabel(/organization name/i).fill('Evidence Org');
    await page.getByLabel(/^password$/i).fill('SecurePass1!');
    await page.getByLabel(/confirm password/i).fill('SecurePass1!');
    await page.getByLabel(/i have read and agree/i).check();

    await evidencePause(page, 400);
    await evidenceScreenshot(page, '01-signup-filled-valid-name', { target: nameInput });

    await nameInput.fill('   ');
    await nameInput.blur();

    const nameError = page.getByText(/full name is required/i);
    await expect(nameError).toBeVisible();
    await expect(page.getByRole('button', { name: /create account & organization/i })).toBeDisabled();

    await evidencePause(page, 400);
    await evidenceScreenshot(page, '02-signup-whitespace-name-error', { target: nameError });
  });
});
