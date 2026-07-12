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

test.describe('Mobile shell and list UX @pr-evidence', () => {
  test('captures inventory list, org members, and integrations on mobile', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard('/inventory');
    await assertHealthyShell();

    await expect(page.getByRole('heading', { name: /^inventory$/i })).toBeVisible({
      timeout: 60_000,
    });
    await expect(
      page.getByRole('button', { name: /open personalization|custom sort active/i }).first(),
    ).toBeVisible({ timeout: 30_000 });

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '01-mobile-inventory-list', {
      target: page.getByRole('button', { name: /open personalization|custom sort active/i }).first(),
    });

    await gotoDashboard('/organization/members');
    await assertHealthyShell();

    await expect(page.getByRole('heading', { name: /^members$/i })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByRole('button', { name: /invite member/i })).toBeVisible({
      timeout: 30_000,
    });

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '02-mobile-org-members', {
      target: page.getByRole('button', { name: /invite member/i }),
    });

    await gotoDashboard('/organization/integrations');
    await assertHealthyShell();

    await expect(page.getByRole('heading', { name: /integrations/i })).toBeVisible({
      timeout: 60_000,
    });

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '03-mobile-integrations');
  });
});
