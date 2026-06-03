import { test, expect } from '../fixtures/equipqr-test';

const MOBILE_VIEWPORT = { width: 390, height: 844 };

test.describe('mobile bottom navigation @full', () => {
  test.use({
    viewport: MOBILE_VIEWPORT,
    isMobile: true,
    hasTouch: true,
  });

  const navTargets = [
    { label: /dashboard/i, url: /\/dashboard\/?$/ },
    { label: /scan/i, url: /\/dashboard\/scan/ },
    { label: /equipment/i, url: /\/dashboard\/equipment/ },
    { label: /inventory/i, url: /\/dashboard\/inventory/ },
    { label: /work orders/i, url: /\/dashboard\/work-orders/ },
  ];

  for (const target of navTargets) {
    test(`bottom nav opens ${target.label}`, async ({ page, assertHealthyShell }) => {
      await page.goto('/dashboard');
      await assertHealthyShell();
      const link = page.getByRole('link', { name: target.label }).last();
      await link.click();
      await expect(page).toHaveURL(target.url, { timeout: 60_000 });
    });
  }
});
