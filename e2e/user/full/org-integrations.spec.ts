import { test, expect, quickLogin } from '../fixtures/equipqr-test';

const INTEGRATIONS_PATH = '/dashboard/organization/integrations';

async function gotoOrganizationSettingsDirectRoute(
  gotoDashboard: (route: string) => Promise<void>,
  page: import('@playwright/test').Page,
) {
  await gotoDashboard('/organization/settings');
  if (/\/auth(?:[?#]|$)/i.test(page.url())) {
    await quickLogin(page, 'owner');
    await gotoDashboard('/organization/settings');
  }
}

test.describe('organization and integrations @full', () => {
  test('organization settings page loads', async ({ gotoDashboard, page, assertHealthyShell }) => {
    await gotoDashboard('/organization');
    await assertHealthyShell();
    await expect(page.getByRole('heading', { name: /organization settings/i })).toBeVisible({
      timeout: 60_000,
    });
  });

  test('direct organization settings route loads', async ({
    gotoDashboard,
    page,
    assertHealthyShell,
  }) => {
    await gotoOrganizationSettingsDirectRoute(gotoDashboard, page);
    await assertHealthyShell();
    const organizationSubnav = page.getByRole('navigation', { name: 'Organization sections' });

    await expect(page).toHaveURL(/\/dashboard\/organization\/settings$/i, {
      timeout: 60_000,
    });
    await expect(page.getByRole('heading', { name: /organization settings/i })).toBeVisible({
      timeout: 60_000,
    });
    await expect(organizationSubnav.getByRole('link', { name: /^members$/i })).toBeVisible();
    await expect(organizationSubnav.getByRole('link', { name: /^settings$/i })).toBeVisible();
    await expect(organizationSubnav.getByRole('link', { name: /^integrations$/i })).toBeVisible();
    await expect(page.getByLabel(/organization name/i)).toBeVisible();
  });

  test('organization members page loads', async ({ gotoDashboard, page, assertHealthyShell }) => {
    await gotoDashboard('/organization/members');
    await assertHealthyShell();
    await expect(page.getByRole('heading', { name: /^members$/i })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByRole('button', { name: /invite member/i })).toBeVisible();
  });

  test('canonical integrations page shows disconnected vendor cards', async ({
    page,
    assertHealthyShell,
  }) => {
    await page.goto(INTEGRATIONS_PATH);
    await assertHealthyShell();
    await expect(page.getByText(/google|workspace/i).first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/quickbooks/i).first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/connect|not connected|disconnect/i).first()).toBeVisible({
      timeout: 60_000,
    });
  });

  test('legacy integrations hash redirects to canonical path', async ({ page, assertHealthyShell }) => {
    await page.goto('/dashboard/organization#integrations');
    await assertHealthyShell();
    await expect(page).toHaveURL(/\/dashboard\/organization\/integrations/i, {
      timeout: 60_000,
    });
  });

  test('teams list loads', async ({ gotoDashboard, page, assertHealthyShell }) => {
    await gotoDashboard('/teams');
    await assertHealthyShell();
    await expect(page.getByText(/team/i).first()).toBeVisible({ timeout: 60_000 });
  });
});
