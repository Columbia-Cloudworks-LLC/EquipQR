import { test, expect } from '../fixtures/equipqr-test';
import { newPersonaPage, pinContextToApex, gotoDashboardRoute } from '../shared/auth-helpers';
import {
  expectNavigationLinkHidden,
  expectNavigationLinkVisible,
  pauseForWatchMode,
} from '../shared/page-helpers';

test.describe('RBAC @critical', () => {
  test('owner sees admin-only sidebar items', async ({ page, gotoDashboard }) => {
    await gotoDashboard('/');
    await expectNavigationLinkVisible(page, /pm templates/i);
    // DSR Cockpit moved to Legal footer + Settings → Privacy (admin-only).
    await expectNavigationLinkHidden(page, /dsr cockpit/i);
    // Audit log moved out of main navigation into org settings (#1122).
    await expectNavigationLinkHidden(page, /audit log/i);

    await page.getByRole('button', { name: /legal links/i }).click();
    const legalMenu = page
      .getByRole('menu')
      .filter({ hasText: /terms of service|privacy policy|do not sell/i });
    await expect(legalMenu.getByRole('menuitem', { name: /dsr cockpit/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('admin sees admin-only sidebar items', async ({ browser }) => {
    const { context, page } = await newPersonaPage(browser, 'admin');
    await pinContextToApex(context);
    await gotoDashboardRoute(page, '/');
    await expectNavigationLinkVisible(page, /pm templates/i);
    await expectNavigationLinkHidden(page, /audit log/i);
    await pauseForWatchMode(page);
    await context.close();
  });

  test('technician does not see admin-only PM Templates link', async ({ browser }) => {
    const { context, page } = await newPersonaPage(browser, 'technician');
    await pinContextToApex(context);
    await page.goto('/dashboard');
    await expectNavigationLinkHidden(page, /pm templates/i);
    await expectNavigationLinkHidden(page, /audit log/i);
    await pauseForWatchMode(page);
    await context.close();
  });

  test('owner can open Create Team on teams page', async ({ page }) => {
    await page.goto('/dashboard/teams');
    await expect(page.getByRole('button', { name: /create team/i }).first()).toBeVisible({
      timeout: 60_000,
    });
  });

  test('technician teams page hides Create Team', async ({ browser }) => {
    const { context, page } = await newPersonaPage(browser, 'technician');
    await pinContextToApex(context);
    await page.goto('/dashboard/teams');
    await expect(page.getByRole('button', { name: /create team/i })).toHaveCount(0);
    await pauseForWatchMode(page);
    await context.close();
  });
});
