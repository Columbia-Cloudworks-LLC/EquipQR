import { type BrowserContext, type Page } from '@playwright/test';
import { test, expect } from '../user/fixtures/equipqr-test';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

/** Apex seed work order in `assigned` status (#1751 repro). */
const ASSIGNED_WORK_ORDER = {
  id: 'd20e8400-e29b-41d4-a716-446655000101',
  title: 'Warning Light Investigation',
};

test.use({ viewport: { width: 1440, height: 900 } });

test.describe('Desktop offline status change @pr-evidence', () => {
  test('Start Work offline is queued and syncs after reconnect', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
    context,
  }) => {
    await gotoDashboard(`/dashboard/work-orders/${ASSIGNED_WORK_ORDER.id}`);
    await assertHealthyShell();
    await expect(
      page.getByRole('heading', { name: new RegExp(ASSIGNED_WORK_ORDER.title, 'i') }).first(),
    ).toBeVisible({ timeout: 60_000 });

    const startWork = page.getByRole('button', { name: /^start work$/i }).first();
    await expect(startWork).toBeVisible({ timeout: 30_000 });
    await evidencePause(page, 800);
    await evidenceScreenshot(page, '01-online-assigned', { target: startWork });

    await setOffline(context, page, true);
    await startWork.click();

    await expect(page.getByText('Saved offline').first()).toBeVisible({ timeout: 15_000 });
    const queued = await page.evaluate(() =>
      Object.keys(localStorage)
        .filter((key) => key.startsWith('equipqr_offline_queue_'))
        .some((key) => (localStorage.getItem(key) ?? '').includes('"work_order_status"')),
    );
    expect(queued).toBe(true);

    await evidencePause(page, 600);
    await evidenceScreenshot(page, '02-offline-status-queued');

    await setOffline(context, page, false);

    await expect
      .poll(
        () =>
          page.evaluate(() =>
            Object.keys(localStorage)
              .filter((key) => key.startsWith('equipqr_offline_queue_'))
              .every((key) => !(localStorage.getItem(key) ?? '').includes('"work_order_status"')),
          ),
        { timeout: 90_000 },
      )
      .toBe(true);
    await page.reload();
    await expect(page.getByText(/in progress/i).first()).toBeVisible({ timeout: 30_000 });

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
