import { test, expect } from '../user/fixtures/equipqr-test';
import { evidencePause, evidenceScreenshot } from './shared/evidence-helpers';
import { pinContextToApex } from '../user/shared/auth-helpers';

const GOOGLE_MAPS_KEY_ROUTE = '**/functions/v1/public-google-maps-key';

test.describe('Fleet map key failure @pr-evidence', () => {
  test('captures the signed error card without a secret-named toast', async ({
    page,
    assertHealthyShell,
    gotoDashboard,
  }) => {
    await pinContextToApex(page.context());

    await page.route(GOOGLE_MAPS_KEY_ROUTE, async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'forced test failure',
        }),
      });
    });

    await gotoDashboard('/fleet-map');
    await assertHealthyShell();

    const tryAgainButton = page.getByRole('button', { name: /try again/i });

    await expect(page).toHaveURL(/\/dashboard\/fleet-map$/i, {
      timeout: 60_000,
    });
    await expect(page.getByText('Fleet Map Error')).toBeVisible({
      timeout: 60_000,
    });
    await expect(tryAgainButton).toBeVisible();
    await expect(
      page
        .locator('[data-sonner-toast]')
        .filter({ hasText: /GOOGLE_MAPS_BROWSER_KEY|VITE_GOOGLE_MAPS_BROWSER_KEY/i }),
    ).toHaveCount(0);
    await expect(
      page.getByText(/GOOGLE_MAPS_BROWSER_KEY|VITE_GOOGLE_MAPS_BROWSER_KEY/i),
    ).toHaveCount(0);

    await evidencePause(page, 800);
    await evidenceScreenshot({
      page,
      label: '01-fleet-map-key-error-card',
      target: tryAgainButton,
    });
  });
});
