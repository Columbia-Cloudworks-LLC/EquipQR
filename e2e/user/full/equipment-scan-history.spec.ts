import { test, expect } from '../fixtures/equipqr-test';
import { personas, seedEquipment } from '../shared/seed-data';

test.describe('equipment scan history @full', () => {
  test('shows seeded scan timeline on scan-history tab', async ({ page, assertHealthyShell }) => {
    await page.goto(`/dashboard/equipment/${seedEquipment.cat320.id}?tab=scan-history`);
    await assertHealthyShell();
    await expect(page.getByRole('tab', { name: /scan history/i })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText(/\d+ scans? recorded/i)).toBeVisible({ timeout: 60_000 });
    // Seeded CAT 320 scans are by Tom Technician (supabase/seeds/14_scans.sql).
    await expect(page.getByText(personas.technician.displayName).first()).toBeVisible();
  });
});
