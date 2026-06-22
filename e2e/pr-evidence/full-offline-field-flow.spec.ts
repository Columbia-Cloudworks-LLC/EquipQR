import { type BrowserContext, type Page } from '@playwright/test';
import { test, expect } from '../user/fixtures/equipqr-test';
import { seedWorkOrders } from '../user/shared/seed-data';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

const MOBILE_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36';

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  userAgent: MOBILE_USER_AGENT,
});

test.describe('Full offline field flow @pr-evidence', () => {
  test('offline note saves locally and syncs after reconnect', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
    context,
  }) => {
    await gotoDashboard(`/dashboard/work-orders/${seedWorkOrders.oilChange.id}`);
    await assertHealthyShell();
    await expect(
      page.getByRole('heading', { name: new RegExp(seedWorkOrders.oilChange.title, 'i') }).first(),
    ).toBeVisible({ timeout: 60_000 });

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '01-online-work-order-detail');

    await setOffline(context, page, true);

    await expect(
      page.getByText(/offline|saved locally|you are currently offline/i).first(),
    ).toBeVisible({ timeout: 15_000 });

    const noteText = `Offline field note ${Date.now()}`;

    await page.getByRole('button', { name: /^note$/i }).first().click();
    await page.getByRole('textbox', { name: /note content/i }).fill(noteText);
    await page.getByRole('button', { name: /save note|post note|add note/i }).first().click();

    await expect(page.getByText(noteText).first()).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByText(/pending sync|saved locally/i).first(),
    ).toBeVisible({ timeout: 15_000 });

    await evidencePause(page, 600);
    await evidenceScreenshot(page, '02-offline-note-queued');

    await setOffline(context, page, false);

    await expect
      .poll(async () => (await page.getByText(/items? pending sync/i).count()) === 0, {
        timeout: 90_000,
      })
      .toBe(true);
    await expect(page.getByText(noteText).first()).toBeVisible({ timeout: 15_000 });

    await evidencePause(page, 1200);
    await evidenceScreenshot(page, '03-online-after-reconnect-sync');
  });
});

async function setOffline(context: BrowserContext, page: Page, offline: boolean): Promise<void> {
  await context.setOffline(offline);
  await page.evaluate((isOffline) => {
    window.dispatchEvent(new Event(isOffline ? 'offline' : 'online'));
  }, offline);
}
