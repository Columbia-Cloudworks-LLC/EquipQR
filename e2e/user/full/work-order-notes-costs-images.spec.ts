import { test, expect } from '../fixtures/equipqr-test';
import { seedWorkOrders } from '../shared/seed-data';

test.describe('work order notes and costs @full', () => {
  test('can open note dialog from work order detail', async ({ page, assertHealthyShell }) => {
    await page.goto(`/dashboard/work-orders/${seedWorkOrders.oilChange.id}`);
    await assertHealthyShell();

    const noteButton = page.getByRole('button', { name: /^note$/i }).first();
    if (await noteButton.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await noteButton.click();
      await expect(page.getByRole('textbox', { name: /note content/i })).toBeVisible({
        timeout: 15_000,
      });
      return;
    }

    await page.getByRole('button', { name: /add note|new note/i }).first().click();
    await expect(page.getByRole('textbox', { name: /note/i }).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('field cost section is reachable on work order detail', async ({ page, assertHealthyShell }) => {
    await page.goto(`/dashboard/work-orders/${seedWorkOrders.oilChange.id}`);
    await assertHealthyShell();
    await expect(page.getByText(/cost|labor|parts|field cost/i).first()).toBeVisible({
      timeout: 60_000,
    });
  });
});
