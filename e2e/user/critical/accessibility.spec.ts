import { test } from '../fixtures/equipqr-test';
import { assertNoAxeViolations } from '../shared/axe-helpers';
import { seedWorkOrders } from '../shared/seed-data';

test.describe('accessibility axe scans @critical', () => {
  test('dashboard home passes WCAG 2.1 AA', async ({ gotoDashboard, page, assertHealthyShell }) => {
    await gotoDashboard('/');
    await assertHealthyShell();
    await assertNoAxeViolations(page);
  });

  test('equipment list passes WCAG 2.1 AA', async ({ gotoDashboard, page, assertHealthyShell }) => {
    await gotoDashboard('/equipment');
    await assertHealthyShell();
    await assertNoAxeViolations(page);
  });

  test('work order detail passes WCAG 2.1 AA', async ({ page, assertHealthyShell }) => {
    await page.goto(`/dashboard/work-orders/${seedWorkOrders.oilChange.id}`);
    await assertHealthyShell();
    await assertNoAxeViolations(page);
  });

  test('inventory list passes WCAG 2.1 AA', async ({ gotoDashboard, page, assertHealthyShell }) => {
    await gotoDashboard('/inventory');
    await assertHealthyShell();
    await assertNoAxeViolations(page);
  });

  test('scan page passes WCAG 2.1 AA', async ({ gotoDashboard, page, assertHealthyShell }) => {
    await gotoDashboard('/scan');
    await assertHealthyShell();
    await assertNoAxeViolations(page);
  });
});

test.describe('accessibility axe scans public @critical', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('auth page passes WCAG 2.1 AA', async ({ page }) => {
    await page.goto('/auth');
    await page.getByRole('button', { name: /quick login/i }).waitFor({ timeout: 30_000 });
    await assertNoAxeViolations(page);
  });
});
