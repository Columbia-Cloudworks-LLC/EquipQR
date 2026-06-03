import { test, expect } from '../fixtures/equipqr-test';
import { seedDsr } from '../shared/seed-data';

test.describe('DSR case detail @full', () => {
  test('opens seeded DSR case from cockpit', async ({ gotoDashboard, page, assertHealthyShell }) => {
    await gotoDashboard('/dsr');
    await assertHealthyShell();
    await page.goto(`/dashboard/dsr/${seedDsr.processingCase.id}`);
    await assertHealthyShell();
    await expect(page.getByText(/dsr|data subject|privacy request/i).first()).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText(/processing|received|verify/i).first()).toBeVisible({
      timeout: 60_000,
    });
  });
});
