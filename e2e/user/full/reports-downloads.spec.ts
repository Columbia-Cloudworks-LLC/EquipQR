import { test, expect } from '../fixtures/equipqr-test';
import { clickWithDemoCue } from '../shared/page-helpers';

test.describe('reports downloads @full', () => {
  // Equipment and work-order exports run as async queue jobs, which the local stack never drains
  // (invoke_queue_worker only calls hosted *.supabase.co URLs). Inventory exports synchronously.
  test('inventory export triggers a download', async ({ gotoDashboard, page, assertHealthyShell }) => {
    await gotoDashboard('/reports');
    await assertHealthyShell();

    // The innermost block holding the "Parts Inventory Snapshot" heading and its Export button.
    const inventorySnapshot = page
      .locator('div')
      .filter({ has: page.getByRole('heading', { name: 'Parts Inventory Snapshot', exact: true }) })
      .filter({ has: page.getByRole('button', { name: /^export$/i }) })
      .last();
    const exportButton = inventorySnapshot.getByRole('button', { name: /^export$/i });
    await expect(exportButton).toBeEnabled({ timeout: 60_000 });

    const downloadPromise = page.waitForEvent('download', { timeout: 60_000 });
    await clickWithDemoCue(exportButton, 'Download inventory report');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.(csv|xlsx|zip)$/i);
  });
});
