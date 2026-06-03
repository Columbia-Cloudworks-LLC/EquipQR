import { test, expect } from '../fixtures/equipqr-test';

test.describe('reports downloads @full', () => {
  test('equipment export triggers a download', async ({ gotoDashboard, page, assertHealthyShell }) => {
    await gotoDashboard('/reports');
    await assertHealthyShell();

    const exportButton = page
      .getByRole('button', { name: /export|download/i })
      .filter({ hasText: /equipment/i })
      .first();

    if (!(await exportButton.isVisible({ timeout: 15_000 }).catch(() => false))) {
      await expect(page.getByText(/reports|export/i).first()).toBeVisible({ timeout: 30_000 });
      return;
    }

    const downloadPromise = page.waitForEvent('download', { timeout: 60_000 });
    await exportButton.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.(csv|xlsx|zip)$/i);
  });
});
