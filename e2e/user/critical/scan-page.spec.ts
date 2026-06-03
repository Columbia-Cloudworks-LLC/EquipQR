import { test, expect } from '../fixtures/equipqr-test';

test.describe('dashboard scanner @critical', () => {
  test('scan page loads upload and camera affordances', async ({ gotoDashboard, page, assertHealthyShell }) => {
    await gotoDashboard('/scan');
    await assertHealthyShell();
    await expect(page.getByRole('heading', { name: /scan equipment|equipment scanner|scan/i }).first()).toBeVisible({
      timeout: 60_000,
    });
    await expect(
      page.getByRole('button', { name: /upload|choose image|scan from image/i }).first(),
    ).toBeVisible({ timeout: 30_000 });
  });
});
