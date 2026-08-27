import type { Page } from '@playwright/test';
import { expect, test } from '../user/fixtures/equipqr-test';
import {
  assertEvidenceFrameReady,
  evidencePause,
  evidenceScreenshot,
} from './shared/evidence-helpers';

test.use({ storageState: { cookies: [], origins: [] } });

async function dismissCookieBannerIfPresent(page: Page): Promise<void> {
  const banner = page.getByRole('region', { name: /cookie consent/i });
  const acceptButton = page.getByRole('button', { name: /^accept$/i });

  if (await banner.isVisible().catch(() => false)) {
    await acceptButton.click();
    await expect(banner).toHaveCount(0);
  }
}

test.describe('PR evidence unknown public routes @pr-evidence', () => {
  test('unknown public routes render the public not-found page', async ({ page }) => {
    await page.goto('/this-is-not-a-route', { waitUntil: 'domcontentloaded' });
    await dismissCookieBannerIfPresent(page);

    const heading = page.getByRole('heading', { name: 'Page not found', level: 1 });
    await expect(heading).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('/this-is-not-a-route')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Return home' })).toHaveAttribute('href', '/');
    await expect(page.getByRole('link', { name: 'View releases' })).toHaveAttribute('href', '/releases');
    await expect(
      page.getByRole('link', { name: /view release notes for equipqr version/i }),
    ).toHaveAttribute('href', '/releases');
    await evidencePause(page, 300);
    await assertEvidenceFrameReady(page, heading);
    await evidenceScreenshot({ page, label: '01-unknown-route-public-404', target: heading });
  });

  test('/releases still renders the public releases page', async ({ page }) => {
    await page.goto('/releases', { waitUntil: 'domcontentloaded' });
    await dismissCookieBannerIfPresent(page);

    const heading = page.getByRole('heading', { name: 'Releases', level: 1 });
    await expect(heading).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText(/customer-facing changes in each published equipqr release/i),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Page not found', level: 1 })).toHaveCount(0);
    await evidencePause(page, 300);
    await assertEvidenceFrameReady(page, heading);
    await evidenceScreenshot({ page, label: '02-releases-known-route', target: heading });
  });

  test('/terms-of-service still renders the legal page', async ({ page }) => {
    await page.goto('/terms-of-service', { waitUntil: 'domcontentloaded' });
    await dismissCookieBannerIfPresent(page);

    await expect(page.getByRole('heading', { name: 'Terms of Service', level: 1 })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole('heading', { name: 'Page not found', level: 1 })).toHaveCount(0);
  });
});
