import { test, expect } from '../user/fixtures/equipqr-test';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';
import type { Page } from '@playwright/test';

// Unauthenticated — default owner storage would redirect `/` to the dashboard.
test.use({ storageState: { cookies: [], origins: [] } });

async function acceptCookieBannerIfPresent(page: Page): Promise<void> {
  const banner = page.getByRole('region', { name: /cookie consent/i });
  const acceptBtn = page.getByRole('button', { name: /^accept$/i });
  if (await banner.isVisible().catch(() => false)) {
    await acceptBtn.click();
    await expect(banner).toHaveCount(0);
  }
}

/**
 * PR evidence: About-section rental card uses a high-contrast bulldozer.
 */
test.describe('PR evidence about rental bulldozer icon @pr-evidence', () => {
  test('desktop rental card shows a yellow bulldozer', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await acceptCookieBannerIfPresent(page);

    const heading = page.getByRole('heading', { name: /equipment rental agencies/i });
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toBeVisible({ timeout: 30_000 });

    const card = heading.locator('xpath=ancestor::div[contains(@class,"rounded-lg")]').first();
    const icon = page.getByTestId('about-rental-bulldozer');
    const well = icon.locator('xpath=ancestor::span[1]');
    await expect(icon).toBeVisible();
    await expect(well).toHaveClass(/text-warning/);
    await expect(well).toHaveClass(/bg-warning/);

    await evidencePause(page, 400);
    await evidenceScreenshot({ page, label: '01-rental-bulldozer-desktop', target: card });
  });

  test('mobile rental card stacks with the bulldozer in frame', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await acceptCookieBannerIfPresent(page);

    const heading = page.getByRole('heading', { name: /equipment rental agencies/i });
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toBeVisible({ timeout: 30_000 });

    const card = heading.locator('xpath=ancestor::div[contains(@class,"rounded-lg")]').first();
    await expect(page.getByTestId('about-rental-bulldozer')).toBeVisible();

    await evidencePause(page, 400);
    await evidenceScreenshot({ page, label: '02-rental-bulldozer-mobile', target: card });
  });
});
