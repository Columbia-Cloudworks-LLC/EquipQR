import { test, expect } from '../fixtures/equipqr-test';
import { personas } from '../shared/seed-data';

test.describe('settings profile @full', () => {
  test('settings shows profile and notification sections', async ({ gotoDashboard, page, assertHealthyShell }) => {
    await gotoDashboard('/settings');
    await assertHealthyShell();
    await expect(page.getByText(/profile|account|personalization|notifications/i).first()).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText(personas.owner.displayName, { exact: false }).first()).toBeVisible({
      timeout: 60_000,
    });
  });
});
