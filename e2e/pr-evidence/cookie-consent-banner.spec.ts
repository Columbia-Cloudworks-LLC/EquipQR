import { test, expect } from '@playwright/test';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

// Fresh browser — no prior consent or auth storage.
test.use({ storageState: { cookies: [], origins: [] } });

/**
 * PR evidence for #1386 — first-visit Accept/Reject cookie consent banner.
 */
test.describe('PR evidence cookie consent banner @pr-evidence', () => {
  test('first visit shows banner; Accept persists and hides on revisit', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const banner = page.getByRole('region', { name: /cookie consent/i });
    await expect(banner).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: /^accept$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^reject$/i })).toBeVisible();
    const privacyLink = page.getByRole('link', { name: /privacy policy — cookies/i });
    await expect(privacyLink).toHaveAttribute('href', '/privacy-policy#cookies');

    await evidencePause(page, 400);
    await evidenceScreenshot(page, '01-cookie-consent-first-visit', { target: banner });

    await page.getByRole('button', { name: /^accept$/i }).click();
    await expect(banner).toHaveCount(0);

    const stored = await page.evaluate(() => localStorage.getItem('equipqr:cookie-consent'));
    expect(stored).toBe('accepted');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('region', { name: /cookie consent/i })).toHaveCount(0);
    await evidencePause(page, 400);
    await evidenceScreenshot(page, '02-cookie-consent-hidden-after-accept');
  });

  test('Reject dismisses banner and blocks sidebar preference cookie', async ({ page }) => {
    await page.goto('/privacy-policy', { waitUntil: 'domcontentloaded' });

    const banner = page.getByRole('region', { name: /cookie consent/i });
    await expect(banner).toBeVisible({ timeout: 30_000 });
    await evidencePause(page, 300);
    await evidenceScreenshot(page, '03-cookie-consent-on-privacy', { target: banner });

    await page.getByRole('button', { name: /^reject$/i }).click();
    await expect(banner).toHaveCount(0);

    const stored = await page.evaluate(() => localStorage.getItem('equipqr:cookie-consent'));
    expect(stored).toBe('rejected');

    const sidebarCookie = await page.evaluate(() =>
      document.cookie.split('; ').some((row) => row.startsWith('sidebar:state=')),
    );
    expect(sidebarCookie).toBe(false);

    await page.goto('/privacy-policy#cookies', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('region', { name: /cookie consent/i })).toHaveCount(0);
    const cookiesHeading = page.getByRole('heading', {
      name: /cookies, local storage, and session data/i,
    });
    await expect(cookiesHeading).toBeVisible({ timeout: 15_000 });
    await evidencePause(page, 400);
    await evidenceScreenshot(page, '04-privacy-cookies-section-after-reject', {
      target: cookiesHeading,
    });
  });
});
