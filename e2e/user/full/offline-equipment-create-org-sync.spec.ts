import { type BrowserContext, type Page } from '@playwright/test';
import { test, expect } from '../fixtures/equipqr-test';
import { newPersonaPage, pinContextToOrg } from '../shared/auth-helpers';
import { apexOrgId } from '../shared/seed-data';
import {
  fillEquipmentDialog,
  openAddEquipmentDialog,
} from '../shared/ui-form-helpers';

test.describe('offline equipment create then org-visible sync @full', () => {
  test.beforeEach(async ({ context }) => {
    await pinContextToOrg(context, apexOrgId);
  });

  test('authenticated owner can create equipment while disconnected and another org user sees it after sync', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
    context,
    browser,
  }) => {
    const uniqueSuffix = Date.now();
    const equipmentName = `Offline Proof Excavator ${uniqueSuffix}`;
    const serialNumber = `OFF-PROOF-${uniqueSuffix}`;

    await gotoDashboard('/equipment?team=all');
    await assertHealthyShell();
    await expect(page.getByRole('button', { name: /add equipment/i }).first()).toBeVisible({
      timeout: 60_000,
    });

    await setDisconnected(context, page, true);

    await expect(page.getByText(/you are currently offline|you are offline/i).first()).toBeVisible({
      timeout: 15_000,
    });

    const dialog = await openAddEquipmentDialog(page);
    await expect(dialog.getByText(/you're offline/i)).toBeVisible({ timeout: 15_000 });
    await fillEquipmentDialog(dialog, page, {
      manufacturer: 'Caterpillar',
      model: '320 GC',
      name: equipmentName,
      serialNumber,
      location: 'Dead-zone yard',
      installationDate: '2024-01-15',
    });
    await expect(dialog.getByRole('button', { name: /create equipment/i })).toBeEnabled({
      timeout: 15_000,
    });
    await dialog.getByRole('button', { name: /create equipment/i }).click();

    const continueWithoutTeam = page.getByRole('button', { name: /continue without a team/i });
    await expect(continueWithoutTeam).toBeVisible({ timeout: 30_000 });
    await continueWithoutTeam.click();

    await expect(page.getByText(/saved offline/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/item.*saved locally|pending sync/i).first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page.getByRole('button', { name: new RegExp(`${equipmentName}.*Pending sync`, 'i') }),
    ).toBeVisible({ timeout: 20_000 });

    const queuedWhileOffline = await page.evaluate(() => {
      const keys = Object.keys(localStorage).filter((key) => key.includes('offline_queue'));
      return keys.flatMap((key) => {
        try {
          const parsed = JSON.parse(localStorage.getItem(key) ?? '[]') as Array<{
            type?: string;
            status?: string;
            payload?: { name?: string };
          }>;
          return parsed;
        } catch {
          return [];
        }
      });
    });
    expect(
      queuedWhileOffline.some(
        (item) =>
          item.type === 'equipment_create_full' &&
          item.status === 'pending' &&
          item.payload?.name === equipmentName,
      ),
      `expected pending equipment_create_full in localStorage, got ${JSON.stringify(queuedWhileOffline)}`,
    ).toBe(true);

    await setDisconnected(context, page, false);

    await expect(page.getByText(/synced 1 offline item/i).first()).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText(/items? pending sync|saved locally/i)).toHaveCount(0, {
      timeout: 30_000,
    });

    const { context: adminContext, page: adminPage } = await newPersonaPage(browser, 'admin', {
      pinOrgId: apexOrgId,
    });
    try {
      await adminPage.goto('/dashboard/equipment?team=all');
      await expect(adminPage.locator('#main-content, main#main-content, main').first()).toBeVisible({
        timeout: 60_000,
      });
      const search = adminPage.getByPlaceholder(/search equipment/i);
      await expect(search).toBeVisible({ timeout: 30_000 });
      await search.fill(equipmentName);
      await expect(adminPage.getByRole('heading', { name: equipmentName, level: 3 })).toBeVisible({
        timeout: 60_000,
      });
    } finally {
      await adminContext.close();
    }
  });
});

async function setDisconnected(context: BrowserContext, page: Page, offline: boolean): Promise<void> {
  await context.setOffline(offline);
  await page.evaluate((isOffline) => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => !isOffline,
    });
    window.dispatchEvent(new Event(isOffline ? 'offline' : 'online'));
  }, offline);
}
