import { test, expect } from '../fixtures/equipqr-test';

const INTEGRATIONS_PATH = '/dashboard/organization/integrations';

test.describe('organization and integrations @full', () => {
  test('organization page loads', async ({ gotoDashboard, page, assertHealthyShell }) => {
    await gotoDashboard('/organization');
    await assertHealthyShell();
    await expect(page.getByText(/organization|members/i).first()).toBeVisible({
      timeout: 60_000,
    });
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
