import type { Page } from '@playwright/test';
import { expect, test } from '../user/fixtures/equipqr-test';
import { evidencePause, evidenceScreenshot } from './shared/evidence-helpers';

test.use({ storageState: { cookies: [], origins: [] } });

async function dismissCookieBannerIfPresent(page: Page): Promise<void> {
  const banner = page.getByRole('region', { name: /cookie consent/i });
  const acceptButton = page.getByRole('button', { name: /^accept$/i });

  if (await banner.isVisible().catch(() => false)) {
    await acceptButton.click();
    await expect(banner).toHaveCount(0);
  }
}

test.describe('PR evidence releases page @pr-evidence', () => {
  test('public releases page shows filters and older history', async ({ page }) => {
    await page.goto('/releases', { waitUntil: 'domcontentloaded' });
    await dismissCookieBannerIfPresent(page);

    const heading = page.getByRole('heading', { name: 'Releases', level: 1 });
    await expect(heading).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText(/customer-facing changes in each published equipqr release/i),
    ).toBeVisible();
    await evidencePause(page, 300);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      await evidenceScreenshot({ page, label: '01-releases-hero', target: heading });

    const securityFilter = page.getByRole('radio', { name: 'Security' });
    await securityFilter.click();
    await expect(page.getByText(/cross-org team idor/i)).toBeVisible();
    await evidencePause(page, 300);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      await evidenceScreenshot({ page, label: '02-releases-security-filter', target: securityFilter });

    await page.getByRole('radio', { name: 'All' }).click();
    const showOlderButton = page.getByRole('button', { name: /show \d+ older releases/i });
    await showOlderButton.click();

    const olderRelease = page.getByRole('button', { name: /v3\.25\.27/i });
    await expect(olderRelease).toBeVisible();
    await evidencePause(page, 300);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      await evidenceScreenshot({ page, label: '03-releases-older-history', target: olderRelease });
  });

  test('legal footer version link opens the public releases page', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await dismissCookieBannerIfPresent(page);

    const versionLink = page.getByRole('link', {
      name: /view release notes for equipqr version/i,
    });
    await expect(versionLink).toBeVisible({ timeout: 15_000 });
    await expect(versionLink).toHaveAttribute('href', '/releases');
    await evidencePause(page, 300);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      await evidenceScreenshot({ page, label: '04-legal-footer-version-link', target: versionLink });

    await versionLink.click();
    await expect(page).toHaveURL(/\/releases$/);
    await expect(page.getByRole('heading', { name: 'Releases', level: 1 })).toBeVisible();
  });
});
