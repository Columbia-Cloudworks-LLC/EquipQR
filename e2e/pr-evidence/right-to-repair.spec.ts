import { expect, test } from '../user/fixtures/equipqr-test';
import type { Page } from '@playwright/test';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

test.use({ storageState: { cookies: [], origins: [] } });

async function dismissCookieBannerIfPresent(page: Page): Promise<void> {
  const banner = page.getByRole('region', { name: /cookie consent/i });
  const acceptBtn = page.getByRole('button', { name: /^accept$/i });
  if (await banner.isVisible().catch(() => false)) {
    await acceptBtn.click();
    await expect(banner).toHaveCount(0);
  }
}

test.describe('PR evidence right to repair stance @pr-evidence', () => {
  test('hero, filterable atlas, and case sheet on /right-to-repair', async ({ page }) => {
    await page.goto('/right-to-repair', { waitUntil: 'domcontentloaded' });
    await dismissCookieBannerIfPresent(page);

    const heading = page.getByRole('heading', { name: 'Right to Repair', level: 1 });
    await expect(heading).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/we will not hold your data hostage/i)).toBeVisible();
    await evidencePause(page, 400);
    await evidenceScreenshot({ page, label: '01-right-to-repair-hero', target: heading });

    await page.getByRole('radio', { name: 'Agriculture and fleet' }).click();
    await expect(page.getByText('1 case')).toBeVisible();
    const farmCase = page.getByRole('heading', { name: 'Farm equipment diagnostic lockout' });
    await expect(farmCase).toBeVisible();
    await evidencePause(page, 300);
    await evidenceScreenshot({ page, label: '02-right-to-repair-filtered-atlas', target: farmCase });

    await page.getByRole('button', { name: 'Read the case' }).click();
    const sheetTitle = page.getByRole('heading', { name: 'Farm equipment diagnostic lockout', level: 2 });
    await expect(sheetTitle).toBeVisible();
    await expect(page.getByRole('link', { name: /ftc, nixing the fix/i })).toBeVisible();
    await evidencePause(page, 400);
    await evidenceScreenshot({ page, label: '03-right-to-repair-case-sheet', target: sheetTitle });
  });

  test('landing footer Legal column links to the stance page', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await dismissCookieBannerIfPresent(page);

    const footer = page.getByRole('contentinfo');
    await footer.scrollIntoViewIfNeeded();
    const stanceLink = footer.getByRole('link', { name: 'Right to Repair' });
    await expect(stanceLink).toBeVisible({ timeout: 15_000 });
    await expect(stanceLink).toHaveAttribute('href', '/right-to-repair');
    await evidencePause(page, 300);
    await evidenceScreenshot({ page, label: '04-landing-footer-right-to-repair', target: stanceLink });

    await stanceLink.click();
    await expect(page).toHaveURL(/\/right-to-repair$/);
    await expect(page.getByRole('heading', { name: 'Right to Repair', level: 1 })).toBeVisible();
  });
});
