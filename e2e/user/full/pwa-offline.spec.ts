import { test, expect } from '../fixtures/equipqr-test';

/**
 * Opt-in only: set E2E_PWA_PREVIEW_URL to a `vite preview` URL after `npm run build`.
 * Example: $env:E2E_PWA_PREVIEW_URL = 'http://127.0.0.1:4173'
 * The default `dev-test.bat full watch` run intentionally skips this spec.
 */
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
