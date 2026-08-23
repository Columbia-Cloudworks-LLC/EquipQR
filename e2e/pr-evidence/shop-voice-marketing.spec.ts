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
 * PR evidence for shop-voice marketing copy: homepage closer, Repair Shops
 * heading count, and one feature-page primary CTA.
 */
test.describe('PR evidence shop-voice marketing @pr-evidence', () => {
  test('homepage closer, four repair-shop jobs, QR print-labels CTA', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await acceptCookieBannerIfPresent(page);

    const closer = page.getByRole('heading', {
      level: 2,
      name: /stick a qr on the first machine this afternoon/i,
    });
    await closer.scrollIntoViewIfNeeded();
    await expect(closer).toBeVisible({ timeout: 30_000 });
    const closerCta = page.getByRole('link', { name: /get started free/i }).last();
    await expect(closerCta).toBeVisible();
    await evidencePause(page, 400);
    await evidenceScreenshot({ page, label: '01-homepage-closer', target: closer });

    await page.goto('/solutions/repair-shops', { waitUntil: 'domcontentloaded' });
    await acceptCookieBannerIfPresent(page);
    const fourJobs = page.getByRole('heading', {
      level: 2,
      name: /four jobs the shop already does/i,
    });
    await fourJobs.scrollIntoViewIfNeeded();
    await expect(fourJobs).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Scan at the counter')).toBeVisible();
    await expect(page.getByText('Photos on the work order')).toBeVisible();
    await expect(page.getByText('Who owns the machine')).toBeVisible();
    await expect(page.getByText('QuickBooks invoicing')).toBeVisible();
    const fourJobsSection = page.locator('section').filter({ has: fourJobs });
    await evidencePause(page, 400);
    await evidenceScreenshot({ page, label: '02-repair-shops-four-jobs', target: fourJobsSection });

    await page.goto('/features/qr-code-integration', { waitUntil: 'domcontentloaded' });
    await acceptCookieBannerIfPresent(page);
    const qrHeroCta = page.getByRole('link', { name: /print the first labels/i }).first();
    await expect(qrHeroCta).toBeVisible({ timeout: 15_000 });
    await evidencePause(page, 400);
    await evidenceScreenshot({ page, label: '03-qr-hero-print-labels', target: qrHeroCta });

    const qrFooterHeading = page.getByRole('heading', {
      level: 2,
      name: /print the first labels/i,
    });
    await qrFooterHeading.scrollIntoViewIfNeeded();
    await expect(qrFooterHeading).toBeVisible();
    const qrFooterCta = page.getByRole('link', { name: /print the first labels/i }).last();
    await expect(qrFooterCta).toBeVisible();
    await evidencePause(page, 400);
    await evidenceScreenshot({ page, label: '04-qr-footer-print-labels', target: qrFooterHeading });
  });

  test('mobile stacking for homepage closer and QR footer CTA', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await acceptCookieBannerIfPresent(page);

    const closer = page.getByRole('heading', {
      level: 2,
      name: /stick a qr on the first machine this afternoon/i,
    });
    await closer.scrollIntoViewIfNeeded();
    await expect(closer).toBeVisible({ timeout: 30_000 });
    const closerCta = page.getByRole('link', { name: /get started free/i }).last();
    await expect(closerCta).toBeVisible();
    await evidencePause(page, 400);
    await evidenceScreenshot({ page, label: '05-homepage-closer-mobile', target: closerCta });

    await page.goto('/features/qr-code-integration', { waitUntil: 'domcontentloaded' });
    await acceptCookieBannerIfPresent(page);
    const qrFooterHeading = page.getByRole('heading', {
      level: 2,
      name: /print the first labels/i,
    });
    await qrFooterHeading.scrollIntoViewIfNeeded();
    await expect(qrFooterHeading).toBeVisible({ timeout: 15_000 });
    const qrFooterCta = page.getByRole('link', { name: /print the first labels/i }).last();
    await expect(qrFooterCta).toBeVisible();
    await evidencePause(page, 400);
    await evidenceScreenshot({ page, label: '06-qr-footer-print-labels-mobile', target: qrFooterCta });
  });
});
