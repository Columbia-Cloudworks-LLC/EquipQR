import { test, expect } from '../user/fixtures/equipqr-test';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';
import type { Page } from '@playwright/test';

async function dismissCookieBannerIfPresent(page: Page): Promise<void> {
  const banner = page.getByRole('region', { name: /cookie consent/i });
  const acceptBtn = page.getByRole('button', { name: /^accept$/i });
  if (await banner.isVisible().catch(() => false)) {
    await acceptBtn.click();
    await expect(banner).toHaveCount(0);
  }
}

async function expectPublicImageOk(page: Page, imagePath: string): Promise<void> {
  const response = await page.request.get(imagePath);
  expect(response.ok(), `${imagePath} should return 200`).toBe(true);
}

test.describe('PR evidence public image layout @pr-evidence', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('landing images load from public/images', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await dismissCookieBannerIfPresent(page);

    await expectPublicImageOk(page, '/images/brand/icons/EquipQR-Icon-Purple-Small.png');
    await expectPublicImageOk(page, '/images/brand/logos/3A-Equipment-Logo-Medium.png');
    await expectPublicImageOk(page, '/images/brand/icons/Columbia-Cloudworks-Icon-Small.png');
    await expectPublicImageOk(page, '/images/equipment/excavator-svgrepo-com.svg');
    await expectPublicImageOk(page, '/favicon.ico');

    const headerBrand = page.getByRole('banner').getByRole('link', { name: /equipqr/i }).first();
    await expect(headerBrand).toBeVisible({ timeout: 15_000 });
    await evidencePause(page, 300);
    await evidenceScreenshot(page, '01-landing-header-brand', { target: headerBrand });

    const customerLogo = page.getByRole('img', { name: '3-A Equipment Logo' });
    await customerLogo.scrollIntoViewIfNeeded();
    await expect(customerLogo).toBeVisible({ timeout: 15_000 });
    await expect
      .poll(async () => customerLogo.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
    await evidencePause(page, 300);
    await evidenceScreenshot(page, '02-landing-customer-logo', { target: customerLogo });

    const footer = page.getByRole('contentinfo');
    await footer.scrollIntoViewIfNeeded();
    const partner = footer.locator('img[src="/images/brand/icons/Columbia-Cloudworks-Icon-Small.png"]');
    await expect(partner).toBeVisible({ timeout: 15_000 });
    await expect
      .poll(async () => partner.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
    await evidencePause(page, 300);
    await evidenceScreenshot(page, '03-landing-footer-partner-icon', { target: partner });
  });
});

test.describe('PR evidence dashboard brand icon @pr-evidence', () => {
  test('mobile topbar brand icon loads from public/images', async ({ page, gotoDashboard }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoDashboard('/');
    const brand = page.locator('img[src="/images/brand/icons/EquipQR-Icon-Purple-Small.png"]');
    await expect(brand).toBeVisible({ timeout: 15_000 });
    await expect
      .poll(async () => brand.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
    await evidencePause(page, 300);
    await evidenceScreenshot(page, '04-dashboard-mobile-brand-icon', { target: brand });
  });
});
