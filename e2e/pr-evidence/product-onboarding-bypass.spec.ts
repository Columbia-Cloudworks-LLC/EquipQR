import { test, expect } from '../user/fixtures/equipqr-test';
import { expectNoAppErrorBoundary, newPersonaPage } from '../user/shared/auth-helpers';
import { apexOrgId } from '../user/shared/seed-data';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

test.describe('PR evidence: product onboarding bypass @pr-evidence', () => {
  test('captures established Apex owner landing on dashboard without wizard', async ({ browser }) => {
    const { context, page } = await newPersonaPage(browser, 'owner', {
      pinOrgId: apexOrgId,
    });

    try {
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/dashboard\/?$/i, { timeout: 60_000 });
      await expectNoAppErrorBoundary(page);
      await expect(page.getByTestId('getting-started-onboarding')).toHaveCount(0);
      await evidencePause(page, 800);
      await evidenceScreenshot(page, '01-established-owner-dashboard-no-wizard');
    } finally {
      await context.close();
    }
  });
});
