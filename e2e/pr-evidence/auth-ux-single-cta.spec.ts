import { test, expect } from '../user/fixtures/equipqr-test';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';
import type { Page } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

async function acceptCookieBannerIfPresent(page: Page): Promise<void> {
  const banner = page.getByRole('region', { name: /cookie consent/i });
  const acceptBtn = page.getByRole('button', { name: /^accept$/i });
  if (await banner.isVisible().catch(() => false)) {
    await acceptBtn.click();
    await expect(banner).toHaveCount(0);
  }
}

test.describe('PR evidence auth UX single CTA @pr-evidence', () => {
  test('header Get Started lands on focused sign-in with a text path to signup', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await acceptCookieBannerIfPresent(page);

    const header = page.getByRole('banner');
    const getStarted = header.getByRole('link', { name: /^Get Started$/i });
    await expect(getStarted).toBeVisible({ timeout: 15_000 });
    await expect(header.getByRole('link', { name: /^Sign In$/i })).toHaveCount(0);
    await evidencePause(page, 400);
    await evidenceScreenshot({ page, label: '01-landing-header-single-cta', target: getStarted });

    await getStarted.click();
    await expect(page).toHaveURL(/\/auth\/?$/);
    await expect(page.getByRole('tab')).toHaveCount(0);
    const signinTitle = page.getByRole('heading', { name: /sign in to equipqr/i });
    await expect(signinTitle).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: /login with google/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /login with email & password/i })).toBeVisible();
    await expect(page.getByLabel(/^email$/i)).toHaveCount(0);
    const createAccount = page.getByRole('button', { name: /create an account/i });
    await expect(createAccount).toBeVisible();
    await evidencePause(page, 400);
    await evidenceScreenshot({ page, label: '02-auth-signin-title', target: signinTitle });
    await evidenceScreenshot({ page, label: '03-auth-signin-mode-switch', target: createAccount });

    await createAccount.click();
    const signupTitle = page.getByRole('heading', { name: /create your organization/i });
    await expect(signupTitle).toBeVisible();
    await expect(page.getByLabel(/organization name/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign up with google/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign up with email/i })).toBeVisible();
    await expect(page.getByLabel(/full name/i)).toHaveCount(0);
    await expect(page.getByLabel(/^email$/i)).toHaveCount(0);
    const signInSwitch = page.getByRole('button', { name: /^sign in$/i });
    await expect(signInSwitch).toBeVisible();
    await signupTitle.scrollIntoViewIfNeeded();
    await evidencePause(page, 400);
    await evidenceScreenshot({ page, label: '04-auth-signup-title', target: signupTitle });

    const emailSignup = page.getByRole('button', { name: /sign up with email/i });
    await evidenceScreenshot({ page, label: '05-auth-signup-google-first', target: emailSignup });
    await emailSignup.click();
    const emailField = page.getByLabel(/^email$/i);
    await expect(emailField).toBeVisible();
    await expect(page.getByRole('button', { name: /sign up with google/i })).toHaveCount(0);
    const backToGoogle = page.getByRole('button', { name: /back to google signup/i });
    await expect(backToGoogle).toBeVisible();
    await emailField.scrollIntoViewIfNeeded();
    await evidencePause(page, 400);
    await evidenceScreenshot({ page, label: '06-auth-signup-email-path', target: emailField });
    await evidenceScreenshot({ page, label: '07-auth-signup-back-to-google', target: backToGoogle });
  });

  test('legacy tab=signup still opens the create-org form', async ({ page }) => {
    await page.goto('/auth?tab=signup', { waitUntil: 'domcontentloaded' });
    const signupTitle = page.getByRole('heading', { name: /create your organization/i });
    await expect(signupTitle).toBeVisible({ timeout: 15_000 });
    await expect(page.getByLabel(/organization name/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign up with email/i })).toBeVisible();
    await expect(page.getByRole('tab')).toHaveCount(0);
    await signupTitle.scrollIntoViewIfNeeded();
    await evidencePause(page, 400);
    await evidenceScreenshot({ page, label: '08-auth-legacy-tab-signup', target: signupTitle });
  });

  test('mobile sheet has a single Get Started account CTA', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await acceptCookieBannerIfPresent(page);

    await page.getByRole('button', { name: /open navigation menu/i }).click();
    const accountCta = page.getByRole('link', { name: /^Get Started$/i });
    await expect(accountCta).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('link', { name: /^Sign In$/i })).toHaveCount(0);
    await evidencePause(page, 400);
    await evidenceScreenshot({ page, label: '09-mobile-sheet-single-cta', target: accountCta });
  });
});
