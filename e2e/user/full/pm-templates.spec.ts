import { test, expect } from '../fixtures/equipqr-test';

test.describe('PM templates @full', () => {
  test('PM templates page loads for owner', async ({ gotoDashboard, page, assertHealthyShell }) => {
    await gotoDashboard('/pm-templates');
    await assertHealthyShell();
    await expect(page.getByRole('heading', { name: /pm templates/i })).toBeVisible({
      timeout: 60_000,
    });
  });
});
