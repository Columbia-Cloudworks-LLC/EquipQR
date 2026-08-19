import { test, expect } from '../user/fixtures/equipqr-test';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';
import type { Page } from '@playwright/test';

// Unauthenticated — default owner storage would redirect `/` to the dashboard.
test.use({
  storageState: { cookies: [], origins: [] },
  reducedMotion: 'no-preference',
});

async function acceptCookieBannerIfPresent(page: Page): Promise<void> {
  const banner = page.getByRole('region', { name: /cookie consent/i });
  const acceptBtn = page.getByRole('button', { name: /^accept$/i });
  if (await banner.isVisible().catch(() => false)) {
    await acceptBtn.click();
    await expect(banner).toHaveCount(0);
  }
}

async function openPricingSection(page: Page): Promise<void> {
  await page.goto('/#pricing', { waitUntil: 'domcontentloaded' });
  await acceptCookieBannerIfPresent(page);

  const section = page.locator('#pricing');
  await section.scrollIntoViewIfNeeded();
  await expect(section).toBeVisible({ timeout: 30_000 });
  await expect(
    page.getByRole('heading', { level: 2, name: /unlimited seats\. 5 gb of photos\./i }),
  ).toBeVisible();
  await expect(section.getByRole('link', { name: /get started free/i })).toBeVisible();
  await expect(section.getByRole('link', { name: /schedule a demo/i })).toBeVisible();

  await expect
    .poll(async () => {
      return section.locator('img').evaluateAll((imgs) => {
        if (imgs.length < 8) {
          return 0;
        }
        return imgs.filter((img) => img instanceof HTMLImageElement && img.naturalWidth > 0).length;
      });
    }, { timeout: 30_000 })
    .toBeGreaterThanOrEqual(8);

  await expect(section.locator('.pricing-collage-track-animated')).toHaveCount(4);
}

test.describe('PR evidence homepage pricing collage @pr-evidence', () => {
  test('desktop pricing block keeps CTAs over four looping strips', async ({ page }) => {
    await openPricingSection(page);
    const section = page.locator('#pricing');
    await evidencePause(page, 800);
    await evidenceScreenshot({ page, label: '01-pricing-collage-desktop', target: section });
  });

  test('mobile pricing block stacks CTAs over the collage', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openPricingSection(page);
    const section = page.locator('#pricing');
    const card = section.locator('.rounded-xl').first();
    await expect(card.getByRole('link', { name: /get started free/i })).toBeVisible();
    await evidencePause(page, 800);
    await evidenceScreenshot({ page, label: '02-pricing-collage-mobile', target: card });
  });
});
