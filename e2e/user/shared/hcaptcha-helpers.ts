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
  // hCaptcha renders two iframes (checkbox widget + challenge); the sitekey
  // is carried in the iframe fragment/query. Inspect all of them.
  const frames = page.locator('iframe[src*="hcaptcha"]');
  const frameCount = await frames.count();
  if (frameCount === 0) return 'absent';

  let sawTestSitekey = false;
  for (let i = 0; i < frameCount; i++) {
    const src = (await frames.nth(i).getAttribute('src')) ?? '';
    if (src.includes(HCAPTCHA_TEST_SITEKEY)) sawTestSitekey = true;
  }
  if (!sawTestSitekey) return 'manual';

  const checkboxWidget = 'iframe[src*="hcaptcha"][title*="checkbox" i]';
  const checkbox = page.frameLocator(checkboxWidget).locator('#checkbox');
  await expect(checkbox).toBeVisible({ timeout: 15_000 });
  await checkbox.click();
  await expect(checkbox).toHaveAttribute('aria-checked', 'true', { timeout: 15_000 });
  return 'solved';
}
