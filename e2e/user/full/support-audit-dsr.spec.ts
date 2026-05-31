import { test, expect } from '../fixtures/equipqr-test';

test.describe('support audit dsr @full', () => {
  test('in-app support library loads', async ({ gotoDashboard, page, assertHealthyShell }) => {
    await gotoDashboard('/support');
    await assertHealthyShell();
    await expect(page.getByText(/support|start here|technician/i).first()).toBeVisible({
      timeout: 60_000,
    });
  });

  test('audit log loads for owner', async ({ gotoDashboard, page, assertHealthyShell }) => {
    await gotoDashboard('/audit-log');
    await assertHealthyShell();
    await expect(page.getByText(/audit/i).first()).toBeVisible({ timeout: 60_000 });
  });

  test('DSR cockpit loads for owner', async ({ gotoDashboard, page, assertHealthyShell }) => {
    await gotoDashboard('/dsr');
    await assertHealthyShell();
    await expect(page.getByText(/dsr|privacy|request/i).first()).toBeVisible({
      timeout: 60_000,
    });
  });
});
