import { test, expect } from '../user/fixtures/equipqr-test';
import { seedEquipment, seedInventory, seedWorkOrders } from '../user/shared/seed-data';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

test.describe('Location maps mobile @pr-evidence', () => {
  test('captures mobile equipment, inventory, and work-order location workflows', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
    context,
  }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 32.776664, longitude: -96.796988 });

    await gotoDashboard(`/dashboard/equipment/${seedEquipment.cat320.id}?tab=details`);
    await assertHealthyShell();
    await expect(page.getByRole('heading', { name: /CAT 320 Excavator/i }).first()).toBeVisible({
      timeout: 60_000,
    });

    const locationSource = page.getByRole('combobox', { name: 'Location source' });
    await expect(locationSource).toBeVisible();
    await locationSource.click();
    await expect(page.getByRole('option', { name: 'Team location' })).toBeVisible();
    await page.keyboard.press('Escape');
    await evidencePause(page, 800);
    await evidenceScreenshot(page, '01-equipment-detail-location-source');

    await expect(page.getByRole('button', { name: /equipment address/i }).first()).toBeVisible();
    await evidencePause(page, 500);
    await evidenceScreenshot(page, '02-equipment-inline-address-actions');

    await page.getByRole('button', { name: 'Use my current location' }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('heading', { name: /set equipment location from this device/i })).toBeVisible();
    await evidencePause(page, 800);
    await evidenceScreenshot(page, '03-live-location-modal');
    await page.keyboard.press('Escape');

    await gotoDashboard(`/dashboard/inventory/${seedInventory.hydraulicOil.id}`);
    await assertHealthyShell();
    await expect(page.getByText('Storage address').first()).toBeVisible({ timeout: 60_000 });
    await evidencePause(page, 800);
    await evidenceScreenshot(page, '04-inventory-item-map-directions');

    await gotoDashboard(`/dashboard/work-orders/${seedWorkOrders.oilChange.id}`);
    await assertHealthyShell();
    await expect(
      page.getByRole('heading', { name: new RegExp(seedWorkOrders.oilChange.title, 'i') }).first(),
    ).toBeVisible({ timeout: 60_000 });
    await page.getByRole('button', { name: 'Equipment Details' }).click();
    const workOrderLocationSource = page.getByRole('combobox', { name: 'Location source' });
    await expect(workOrderLocationSource).toBeVisible({ timeout: 30_000 });
    await workOrderLocationSource.click();
    await expect(page.getByRole('option', { name: 'Team location' })).toBeVisible();
    await page.keyboard.press('Escape');
    await evidencePause(page, 800);
    await evidenceScreenshot(page, '05-work-order-location-map');
  });
});
