import { test, expect } from '../fixtures/equipqr-test';
import {
  closeFleetMapPanelIfOpen,
  expectFleetMapRootToStayMounted,
  markFleetMapRootAsStable,
  openFleetMapWithInterceptedMapsKey,
} from '../shared/fleet-map-test-helpers';
const INTERACTIVE_EQUIPMENT_MARKER_TITLE = 'Portable Generator';

test.describe('fleet map @full', () => {
  test('fleet map page loads map shell', async ({ page, assertHealthyShell }) => {
    await openFleetMapWithInterceptedMapsKey(page);
    await assertHealthyShell();
    await expect(page.locator('#main-content, main').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /fit all markers in view/i })).toBeVisible({
      timeout: 60_000,
    });
  });

  test('equipment and Team HQ markers stay interactive without remounting the map', async ({
    page,
    assertHealthyShell,
  }) => {
    await openFleetMapWithInterceptedMapsKey(page);
    await assertHealthyShell();

    await closeFleetMapPanelIfOpen(page);
    await markFleetMapRootAsStable(page);

    await page.getByTitle(INTERACTIVE_EQUIPMENT_MARKER_TITLE).first().click();
    await expect(page.getByRole('button', { name: 'Details' })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('heading', { name: INTERACTIVE_EQUIPMENT_MARKER_TITLE })).toBeVisible();
    await expectFleetMapRootToStayMounted(page);

    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /fit all markers in view/i }).click();
    await expect(page.getByTitle('Heavy Equipment Team').first()).toBeVisible({ timeout: 30_000 });

    await page.getByTitle('Heavy Equipment Team').first().click();
    await expect(page.getByRole('button', { name: 'View Team' })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Heavy Equipment Team').last()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Details' })).toHaveCount(0);
    await expectFleetMapRootToStayMounted(page);
  });
});
