import { test, expect } from '../user/fixtures/equipqr-test';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

const MOBILE_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36';

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  userAgent: MOBILE_USER_AGENT,
});

test.describe('Mobile organization members UX @pr-evidence', () => {
  test('captures dedicated members page and settings subnav on mobile', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard('/organization/members');
    await assertHealthyShell();

    await expect(page.getByRole('heading', { name: /^members$/i })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole('link', { name: /^members$/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /^settings$/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /^integrations$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /invite member/i })).toBeVisible({ timeout: 30_000 });

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '01-mobile-org-members');

    await page.getByRole('link', { name: /^settings$/i }).click();
    await expect(page.getByRole('heading', { name: /organization settings/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByLabel(/organization name/i)).toBeVisible();

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '02-mobile-org-settings');
  });
});
