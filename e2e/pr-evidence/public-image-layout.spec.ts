import { test, expect } from '../user/fixtures/equipqr-test';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';
import type { Page } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

async function dismissCookieBannerIfPresent(page: Page): Promise<void> {
  const banner = page.getByRole('region', { name: /cookie consent/i });
  const acceptBtn = page.getByRole('button', { name: /^accept$/i });
  if (await banner.isVisible().catch(() => false)) {
    await acceptBtn.click();
    await expect(banner).toHaveCount(0);
  }
}

test.describe('PR evidence public image layout @pr-evidence', () => {
  test('landing brand and footer images load from public/images', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await dismissCookieBannerIfPresent(page);

    const brand = page.locator('img[src="/images/brand/icons/EquipQR-Icon-Purple-Small.png"]').first();
    await expect(brand).toBeVisible({ timeout: 15_000 });
    await expect.poll(async () => brand.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);

    await evidencePause(page, 300);
    await evidenceScreenshot(page, '01-landing-brand-icon', { target: brand });

    const footer = page.getByRole('contentinfo');
    await footer.scrollIntoViewIfNeeded();
    const partner = footer.locator('img[src="/images/brand/icons/Columbia-Cloudworks-Icon-Small.png"]');
    await expect(partner).toBeVisible({ timeout: 15_000 });

    await evidencePause(page, 300);
    await evidenceScreenshot(page, '02-landing-footer-partner-icon', { target: partner });
  });
});
