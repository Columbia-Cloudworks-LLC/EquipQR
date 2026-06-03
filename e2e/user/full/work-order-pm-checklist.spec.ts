import { test, expect } from '../fixtures/equipqr-test';
import { seedWorkOrders } from '../shared/seed-data';

test.describe('work order PM checklist @full', () => {
  test('in-progress work order shows PM checklist section', async ({ page, assertHealthyShell }) => {
    await page.goto(`/dashboard/work-orders/${seedWorkOrders.oilChange.id}`);
    await assertHealthyShell();
    await expect(page.getByText(/pm checklist|preventative maintenance|checklist/i).first()).toBeVisible({
      timeout: 60_000,
    });
  });
});
