import { test, expect } from '../fixtures/equipqr-test';
import { seedEquipment } from '../shared/seed-data';

const tabs = [
  { id: 'details', label: /details/i },
  { id: 'work-orders', label: /work orders/i },
  { id: 'notes', label: /notes/i },
  { id: 'parts', label: /parts/i },
  { id: 'images', label: /images/i },
  { id: 'scan-history', label: /scan history/i },
] as const;

test.describe('equipment detail tabs @full', () => {
  for (const tab of tabs) {
    test(`tab ${tab.id} loads`, async ({ page, assertHealthyShell }) => {
      await page.goto(`/dashboard/equipment/${seedEquipment.cat320.id}?tab=${tab.id}`);
      await assertHealthyShell();
      await expect(page.getByRole('tab', { name: tab.label }).first()).toBeVisible({
        timeout: 60_000,
      });
    });
  }
});
