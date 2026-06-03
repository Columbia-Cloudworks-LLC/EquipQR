import { test, expect } from '../fixtures/equipqr-test';

test.describe('PWA offline navigation @full', () => {
  test('production build registers service worker on preview server', async ({ page }) => {
    test.skip(
      !process.env.E2E_PWA_PREVIEW_URL,
      'Set E2E_PWA_PREVIEW_URL to a vite preview URL with PROD build to run PWA offline checks.',
    );

    await page.goto(process.env.E2E_PWA_PREVIEW_URL!);
    const hasSw = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const reg = await navigator.serviceWorker.getRegistration();
      return Boolean(reg);
    });
    expect(hasSw).toBe(true);
  });
});
