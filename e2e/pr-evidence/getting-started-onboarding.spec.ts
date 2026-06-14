import { test, expect } from '../user/fixtures/equipqr-test';
import {
  expectNoAppErrorBoundary,
  newPersonaPage,
} from '../user/shared/auth-helpers';
import { freshStartOrgId } from '../user/shared/seed-data';
import { resetFreshStartOnboardingFixture } from '../user/shared/fresh-start-reset';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

const GETTING_STARTED_PATH = '/dashboard/onboarding/getting-started';

test.describe('PR evidence: getting-started onboarding @pr-evidence', () => {
  test('captures onboarding wizard through QR step and finished dashboard', async ({ browser }) => {
    await resetFreshStartOnboardingFixture();

    const { context, page } = await newPersonaPage(browser, 'onboardingOwner', {
      pinOrgId: freshStartOrgId,
    });

    try {
      await page.goto('/dashboard');
      await expect(page).toHaveURL(new RegExp(GETTING_STARTED_PATH.replace(/\//g, '\\/')), {
        timeout: 60_000,
      });
      await expectNoAppErrorBoundary(page);
      await evidencePause(page, 800);
      await evidenceScreenshot(page, '01-onboarding-step-team');

      await page.getByLabel(/Team Name/i).fill('Field Service Crew');
      await page.getByLabel(/Description/i).fill('Customer equipment we maintain on site');
      await page.getByRole('button', { name: /^Continue$/i }).click();

      await expect(page.getByTestId('onboarding-step-create-equipment')).toBeVisible({
        timeout: 30_000,
      });
      await evidencePause(page, 600);
      await evidenceScreenshot(page, '02-onboarding-step-equipment');

      await page.getByLabel(/Manufacturer/i).fill('CAT');
      await page.getByLabel(/Model/i).fill('320');
      await page.getByLabel(/Serial Number/i).fill('E2E-ONBOARD-001');
      await page.getByLabel(/^Location/i).fill('Main yard');
      await page.getByRole('button', { name: /^Continue$/i }).click();

      await expect(page.getByTestId('onboarding-step-qr-code')).toBeVisible({ timeout: 30_000 });
      await evidencePause(page, 800);
      await evidenceScreenshot(page, '03-onboarding-step-qr-code');

      await page.getByTestId('onboarding-finish-button').click();
      await expect(page).toHaveURL(/\/dashboard\/?$/i, { timeout: 60_000 });
      await expectNoAppErrorBoundary(page);
      await evidencePause(page, 800);
      await evidenceScreenshot(page, '04-onboarding-complete-dashboard');
    } finally {
      await context.close();
    }
  });
});
