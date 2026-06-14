import { test, expect } from '../user/fixtures/equipqr-test';
import { pinContextToOrg } from '../user/shared/auth-helpers';
import { apexOrgId, authStatePath } from '../user/shared/seed-data';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

test.use({ storageState: authStatePath('owner') });

test.describe('PR evidence: product onboarding bypass @pr-evidence', () => {
  test.beforeEach(async ({ context }) => {
    await pinContextToOrg(context, apexOrgId);
  });

  test('captures established Apex owner landing on dashboard without wizard', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard('/');
    await assertHealthyShell();
    await expect(page).toHaveURL(/\/dashboard\/?$/i, { timeout: 60_000 });
    await expect(page.getByTestId('getting-started-onboarding')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible({
      timeout: 30_000,
    });
    await evidencePause(page, 800);
    await evidenceScreenshot(page, '01-established-owner-dashboard-no-wizard');

    await page.evaluate(() => window.scrollBy(0, 400));
    await evidencePause(page, 600);
    await page.evaluate(() => window.scrollTo(0, 0));
    await evidencePause(page, 500);
  });
});
