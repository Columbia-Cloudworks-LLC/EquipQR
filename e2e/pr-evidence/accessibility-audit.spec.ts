import { test, expect } from '../user/fixtures/equipqr-test';
import { seedWorkOrders } from '../user/shared/seed-data';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

test.describe('Accessibility audit @pr-evidence', () => {
  test('captures skip link, dashboard heading, and mobile work order chrome', async ({
    page,
    gotoDashboard,
    assertHealthyShell,
  }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skipLink = page.getByRole('link', { name: /skip to main content/i });
    await expect(skipLink).toBeFocused();
    await evidenceScreenshot(page, '01-skip-link-focus');

    await gotoDashboard('/');
    await assertHealthyShell();
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toHaveAttribute(
      'data-route-heading',
      'true',
    );
    await evidencePause(page, 500);
    await evidenceScreenshot(page, '02-dashboard-route-heading');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/dashboard/work-orders/${seedWorkOrders.oilChange.id}`);
    await assertHealthyShell();
    await expect(
      page.getByRole('heading', { name: new RegExp(seedWorkOrders.oilChange.title, 'i') }).first(),
    ).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole('button', { name: /^note$/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^complete$/i }).first()).toBeVisible();
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '03-mobile-work-order-footer-labels');
  });
});
