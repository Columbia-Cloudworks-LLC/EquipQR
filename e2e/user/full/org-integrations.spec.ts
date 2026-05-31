import { test, expect } from '../fixtures/equipqr-test';

test.describe('organization and integrations @full', () => {
  test('organization page loads', async ({ gotoDashboard, page, assertHealthyShell }) => {
    await gotoDashboard('/organization');
    await assertHealthyShell();
    await expect(page.getByText(/organization|members/i).first()).toBeVisible({
      timeout: 60_000,
    });
  });

  test('integrations section is reachable', async ({ page, assertHealthyShell }) => {
    await page.goto('/dashboard/organization#integrations');
    await assertHealthyShell();
    await expect(page.getByText(/google|quickbooks|integration/i).first()).toBeVisible({
      timeout: 60_000,
    });
  });

  test('teams list loads', async ({ gotoDashboard, page, assertHealthyShell }) => {
    await gotoDashboard('/teams');
    await assertHealthyShell();
    await expect(page.getByText(/team/i).first()).toBeVisible({ timeout: 60_000 });
  });
});
