import { test, expect } from '../user/fixtures/equipqr-test';
import { evidencePause, evidenceScreenshot } from './shared/evidence-helpers';

/**
 * #1731: clicking the assignee chip on a desktop work order card opens the
 * Quick Assignment popover and stays on the list. Clicking the card title
 * still opens the work order.
 */
test.describe('Work order card Quick Assignment @pr-evidence', () => {
  test('assignee chip opens Quick Assignment without leaving the list', async ({ page, gotoDashboard }) => {
    await gotoDashboard('/work-orders');

    // First card whose assignee chip is a Quick Assignment trigger.
    const card = page
      .locator('[role="button"][tabindex="0"]')
      .filter({ has: page.locator('button[aria-haspopup="dialog"]') })
      .first();
    await expect(card).toBeVisible({ timeout: 60_000 });
    const title = card.getByRole('heading', { level: 3 });
    await evidencePause(page, 800);

    const chip = card.locator('button[aria-haspopup="dialog"]');
    await expect(chip).toBeVisible();
    await evidenceScreenshot(page, '01-card-with-assignee-chip', { target: card });

    await chip.click();
    const popover = page.getByRole('dialog').filter({ hasText: 'Quick Assignment' });
    await expect(popover).toBeVisible();
    await evidencePause(page, 600);
    expect(new URL(page.url()).pathname).toBe('/dashboard/work-orders');

    // Clicks inside the popover content must not bubble to the card.
    await popover.getByText('Quick Assignment').click();
    await evidencePause(page, 400);
    await expect(popover).toBeVisible();
    expect(new URL(page.url()).pathname).toBe('/dashboard/work-orders');
    await evidenceScreenshot(page, '02-quick-assignment-open', { target: popover });

    // Close the popover, then the rest of the card still navigates.
    await page.keyboard.press('Escape');
    await expect(popover).toBeHidden();
    await title.click();
    await page.waitForFunction(() => /^\/dashboard\/work-orders\/[0-9a-f-]+$/.test(location.pathname));
    await evidencePause(page, 800);
    await evidenceScreenshot(page, '03-card-title-opens-details');
  });
});
