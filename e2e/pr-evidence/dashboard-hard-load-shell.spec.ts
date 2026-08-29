import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../user/fixtures/equipqr-test';
import { evidencePause, evidenceScreenshot } from './shared/evidence-helpers';
import { signInWithEmailPassword } from '../user/shared/auth-helpers';
import { devPassword } from '../user/shared/seed-data';

const hardLoadRoutes = [
  '/dashboard',
  '/dashboard/equipment',
  '/dashboard/notifications',
  '/dashboard/organization/settings',
] as const;

async function expectDashboardChromeOnFirstPaint(page: Page): Promise<Locator> {
  const loadingShell = page.getByTestId('dashboard-loading-shell');
  const mainNavigation = page.getByRole('navigation', { name: 'Main navigation' });
  const firstPaintChrome = loadingShell.or(mainNavigation).first();

  await expect(firstPaintChrome).toBeVisible({ timeout: 2_000 });

  if (await loadingShell.isVisible().catch(() => false)) {
    await expect(page.getByTestId('dashboard-loading-sidebar')).toBeVisible();
    await expect(page.getByTestId('dashboard-loading-header')).toBeVisible();
    await expect(page.getByRole('status', { name: /loading page content/i })).toBeVisible();
  } else {
    await expect(mainNavigation).toBeVisible();
  }

  return mainNavigation;
}

test.describe('Dashboard hard-load shell @pr-evidence', () => {
  test('hard navigation keeps shell chrome visible before route content resolves', async ({
    page,
    assertHealthyShell,
  }) => {
    await signInWithEmailPassword(
      page,
      'owner@apex.test',
      process.env.E2E_DEV_PASSWORD ?? devPassword,
    );
    await expect(page).toHaveURL(/\/dashboard/i, { timeout: 60_000 });

    for (const route of hardLoadRoutes) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      const mainNavigation = await expectDashboardChromeOnFirstPaint(page);

      await expect(page.locator('#main-content, main#main-content, main').first()).toBeVisible({
        timeout: 60_000,
      });
      await assertHealthyShell();
      await expect(mainNavigation).toBeVisible({ timeout: 60_000 });

      if (route === '/dashboard' || route === '/dashboard/organization/settings') {
        await evidencePause(page, 500);
        await evidenceScreenshot(page, route === '/dashboard'
          ? '01-dashboard-hard-load-home'
          : '02-dashboard-hard-load-organization-settings', {
          target: mainNavigation,
        });
      }
    }
  });
});
