import { expect, type Page } from '@playwright/test';

/** Official hCaptcha test sitekey — auto-passes on interaction (local dev only). */
export const HCAPTCHA_TEST_SITEKEY = '10000000-ffff-ffff-ffff-000000000001';

export type HcaptchaState = 'absent' | 'solved' | 'manual';

/**
 * Public forms render hCaptcha when VITE_HCAPTCHA_SITEKEY is configured.
 * Local dev uses the official hCaptcha test keypair, which issues a passing
 * token as soon as the checkbox is clicked — solve it so submit flows stay
 * fully exercised in E2E. Real sitekeys cannot be automated ('manual').
 */
export async function solveHcaptchaIfPresent(page: Page): Promise<HcaptchaState> {
  const frames = page.locator('iframe[src*="hcaptcha"]');
  const frameCount = await frames.count();
  if (frameCount === 0) return 'absent';

  let sawTestSitekey = false;
  for (let i = 0; i < frameCount; i++) {
    const src = (await frames.nth(i).getAttribute('src')) ?? '';
    if (src.includes(HCAPTCHA_TEST_SITEKEY)) sawTestSitekey = true;
  }
  const testingOnlyBanner = await page.getByText(/this captcha is for testing only/i).count();
  if (!sawTestSitekey && testingOnlyBanner === 0) return 'manual';

  const titledCheckboxFrame = page.locator('iframe[src*="hcaptcha"][title*="checkbox" i]');
  const checkboxFrame =
    (await titledCheckboxFrame.count()) > 0 ? titledCheckboxFrame.first() : frames.first();
  const checkbox = checkboxFrame.contentFrame().locator('#checkbox');
  await expect(checkbox).toBeVisible({ timeout: 15_000 });
  await checkbox.click();
  await expect(checkbox).toHaveAttribute('aria-checked', 'true', { timeout: 15_000 });
  return 'solved';
}
