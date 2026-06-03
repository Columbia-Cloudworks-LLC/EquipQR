import { test, expect } from '../fixtures/equipqr-test';
import { newPersonaPage } from '../shared/auth-helpers';
import { seedWorkOrders } from '../shared/seed-data';

test.describe('work order PM checklist @full', () => {
  test('in-progress work order shows PM checklist section', async ({ browser }) => {
    const { context, page } = await newPersonaPage(browser, 'metroTech');
    await page.goto(`/dashboard/work-orders/${seedWorkOrders.bobcatPm.id}`);
    await expect(page.getByText(/pm checklist|preventative maintenance|checklist/i).first()).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
    await context.close();
  });
});
