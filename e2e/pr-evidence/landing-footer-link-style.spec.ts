import { test, expect } from '../user/fixtures/equipqr-test';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';
import type { Locator, Page } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

async function dismissCookieBannerIfPresent(page: Page): Promise<void> {
  const banner = page.getByRole('region', { name: /cookie consent/i });
  const acceptBtn = page.getByRole('button', { name: /^accept$/i });
  if (await banner.isVisible().catch(() => false)) {
    await acceptBtn.click();
    await expect(banner).toHaveCount(0);
  }
}

async function expectFooterLinksHaveNoRestUnderline(footer: Locator) {
  const decorations = await footer.getByRole('link').evaluateAll((links) =>
    links.map((link) => getComputedStyle(link).textDecorationLine),
  );

  expect(decorations.length).toBeGreaterThan(0);
  expect(decorations.every((line) => line === 'none')).toBe(true);
}

test.describe('PR evidence landing footer link style @pr-evidence', () => {
  test('desktop footer links share the same underline treatment', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await dismissCookieBannerIfPresent(page);

    const footer = page.getByRole('contentinfo');
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toBeVisible({ timeout: 15_000 });
    await expect(footer.getByRole('heading', { name: 'Product' })).toBeVisible();
    await expectFooterLinksHaveNoRestUnderline(footer);

    await evidencePause(page, 400);
    await evidenceScreenshot(page, '01-desktop-footer-links', { target: footer });
  });

  test('mobile footer accordion links share the same underline treatment', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await dismissCookieBannerIfPresent(page);

    const footer = page.getByRole('contentinfo');
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toBeVisible({ timeout: 15_000 });

    for (const section of ['Product', 'Company', 'Legal', 'Connect'] as const) {
      await footer.getByRole('button', { name: section }).click();
    }

    await expect(footer.getByRole('link', { name: 'All features' })).toBeVisible();
    await expect(footer.getByRole('link', { name: 'Columbia Cloudworks', exact: true })).toBeVisible();
    await expect(footer.getByRole('link', { name: 'Schedule a Demo' })).toBeVisible();
    await expectFooterLinksHaveNoRestUnderline(footer);

    await evidencePause(page, 400);
    await evidenceScreenshot(page, '02-mobile-footer-links', { target: footer });
  });
});
