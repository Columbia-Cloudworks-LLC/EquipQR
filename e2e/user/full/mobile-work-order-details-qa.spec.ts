import { type BrowserContext, type Locator, type Page } from '@playwright/test';
import { test, expect } from '../fixtures/equipqr-test';
import { seedWorkOrders } from '../shared/seed-data';

const MOBILE_VIEWPORT = { width: 390, height: 844 };
const MOBILE_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36';

const SLOW_4G_NETWORK_CONDITIONS = {
  offline: false,
  latency: 400,
  downloadThroughput: (400 * 1024) / 8,
  uploadThroughput: (300 * 1024) / 8,
  connectionType: 'cellular4g',
};

test.use({
  viewport: MOBILE_VIEWPORT,
  isMobile: true,
  hasTouch: true,
  userAgent: MOBILE_USER_AGENT,
  reducedMotion: 'reduce',
});

test.describe('mobile work order details field QA @full', () => {
  test('stays field-ready on slow 4G with reduced motion enabled', async ({
    page,
    context,
    browserName,
    assertHealthyShell,
  }) => {
    test.skip(browserName !== 'chromium', 'Slow-network CDP emulation is Chromium-specific.');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/dashboard/work-orders/${seedWorkOrders.oilChange.id}`);
    await assertHealthyShell();
    await expect(
      page.getByRole('heading', { name: new RegExp(seedWorkOrders.oilChange.title, 'i') }).first(),
    ).toBeVisible({ timeout: 60_000 });

    const restoreNetwork = await emulateSlow4G(context, page);
    try {
      await expect(page.getByText(/high priority/i).filter({ visible: true }).first()).toBeVisible({
        timeout: 30_000,
      });
      await expect(page.getByText(/in progress/i).filter({ visible: true }).first()).toBeVisible({
        timeout: 30_000,
      });
      await expect(page.getByRole('button', { name: /open actions and settings/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /^note$/i }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: /put work order on hold/i }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: /^complete$/i }).first()).toBeVisible();
      await expect(page.getByText(/review & office details/i)).toBeVisible({ timeout: 30_000 });

      await expect(page.locator('body')).toHaveJSProperty('clientWidth', MOBILE_VIEWPORT.width);
      await expectReducedMotion(page);
      await expectTouchTarget(page.getByRole('link', { name: /work orders/i }).first(), 'Back to work orders');
      await expectTouchTarget(page.getByRole('button', { name: /edit work order/i }).first(), 'Edit work order');
      await expectTouchTarget(
        page.getByRole('button', { name: /open actions and settings/i }).first(),
        'Open actions and settings',
      );
      await expectTouchTarget(page.getByRole('button', { name: /^note$/i }).first(), 'Note quick action');
      await expectTouchTarget(
        page.getByRole('button', { name: /put work order on hold/i }).first(),
        'Put on hold quick action',
      );
      await expectTouchTarget(page.getByRole('button', { name: /^complete$/i }).first(), 'Complete quick action');

      await expectHeaderFocusOrder(page);
    } finally {
      await restoreNetwork();
    }
  });

  test('shows offline-safe feedback on the mobile detail surface', async ({
    page,
    context,
    assertHealthyShell,
  }) => {
    await page.goto(`/dashboard/work-orders/${seedWorkOrders.oilChange.id}`);
    await assertHealthyShell();
    await expect(
      page.getByRole('heading', { name: new RegExp(seedWorkOrders.oilChange.title, 'i') }).first(),
    ).toBeVisible({ timeout: 60_000 });

    try {
      await setOffline(context, page, true);

      await expect(
        page.getByText(/offline - text and status changes save locally|you are currently offline/i).first(),
      ).toBeVisible({ timeout: 10_000 });

      await page.getByRole('button', { name: /^note$/i }).first().click();
      await expect(page.getByText(/you're offline/i).first()).toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole('textbox', { name: /note content/i })).toBeVisible();
    } finally {
      await setOffline(context, page, false);
    }
  });
});

async function emulateSlow4G(context: BrowserContext, page: Page): Promise<() => Promise<void>> {
  const cdpSession = await context.newCDPSession(page);
  await cdpSession.send('Network.enable');
  await cdpSession.send('Network.emulateNetworkConditions', SLOW_4G_NETWORK_CONDITIONS);

  return async () => {
    await cdpSession
      .send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 0,
        downloadThroughput: -1,
        uploadThroughput: -1,
        connectionType: 'none',
      })
      .catch(() => undefined);
    await cdpSession.detach().catch(() => undefined);
  };
}

async function setOffline(context: BrowserContext, page: Page, offline: boolean): Promise<void> {
  await context.setOffline(offline);
  await page.evaluate((isOffline) => {
    window.dispatchEvent(new Event(isOffline ? 'offline' : 'online'));
  }, offline);
}

async function expectReducedMotion(page: Page): Promise<void> {
  await expect
    .poll(() => page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches))
    .toBe(true);

  const animatedElements = page.locator('.animate-stagger-in, .pm-collapsible-animate');
  await expect.poll(() => animatedElements.count()).toBeGreaterThan(0);

  const motionStyles = await animatedElements.first().evaluate((element) => {
    const style = window.getComputedStyle(element);
    return {
      animationName: style.animationName,
      transitionDuration: style.transitionDuration,
    };
  });

  expect(motionStyles.animationName).toBe('none');
  expect(motionStyles.transitionDuration.split(',').every((value) => value.trim() === '0s')).toBe(true);
}

async function expectTouchTarget(locator: Locator, label: string): Promise<void> {
  await expect(locator, `${label} should be visible before measuring touch target`).toBeVisible({
    timeout: 10_000,
  });

  const box = await locator.boundingBox();
  expect(box, `${label} should have a measurable bounding box`).not.toBeNull();
  expect(box!.width, `${label} touch target width`).toBeGreaterThanOrEqual(44);
  expect(box!.height, `${label} touch target height`).toBeGreaterThanOrEqual(44);
}

async function expectHeaderFocusOrder(page: Page): Promise<void> {
  await page.getByRole('link', { name: /work orders/i }).first().focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: /edit work order/i }).first()).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: /open actions and settings/i }).first()).toBeFocused();
}
