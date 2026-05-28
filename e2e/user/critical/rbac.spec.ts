import path from 'path';
import type { BrowserContext } from '@playwright/test';
import { test, expect } from '../fixtures/equipqr-test';
import {
  expectNavigationLinkHidden,
  expectNavigationLinkVisible,
  pauseForWatchMode,
} from '../shared/page-helpers';
import { apexOrgId, authStatePath } from '../shared/seed-data';

async function pinContextToApex(context: BrowserContext) {
  await context.addInitScript((organizationId) => {
    localStorage.setItem('equipqr_current_organization', organizationId);
    localStorage.setItem(
      'equipqr_current_org',
      JSON.stringify({
        selectedOrgId: organizationId,
        selectionTimestamp: new Date().toISOString(),
      }),
    );
  }, apexOrgId);
}

test.describe('RBAC @critical', () => {
  test('owner sees admin-only sidebar items', async ({ page }) => {
    await page.goto('/dashboard');
    await expectNavigationLinkVisible(page, /pm templates/i);
    await expectNavigationLinkVisible(page, /audit log/i);
  });

  test('technician does not see admin-only PM Templates link', async ({ browser }) => {
    const statePath = path.resolve(authStatePath('technician'));
    const context = await browser.newContext({ storageState: statePath });
    await pinContextToApex(context);
    const page = await context.newPage();
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
    const statePath = path.resolve(authStatePath('technician'));
    const context = await browser.newContext({ storageState: statePath });
    await pinContextToApex(context);
    const page = await context.newPage();
    await page.goto('/dashboard/teams');
    await expect(page.getByRole('button', { name: /create team/i })).toHaveCount(0);
    await pauseForWatchMode(page);
    await context.close();
  });
});
