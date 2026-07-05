import { test, expect } from '../user/fixtures/equipqr-test';
import { seedEquipment, seedInventory, seedTeams, seedWorkOrders } from '../user/shared/seed-data';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

const TEAM_HEAVY_EQUIPMENT_ID = seedTeams.apexHeavyEquipment.id;

async function openLocationSourceDropdown(page: import('@playwright/test').Page) {
  const locationSource = page.getByRole('combobox', { name: 'Location source' });
  await expect(locationSource).toBeVisible({ timeout: 60_000 });
  await locationSource.click();
  return locationSource;
}

test.describe('Location maps desktop @pr-evidence', () => {
  test('captures fleet, equipment, inventory, organization, team, and work-order map states', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
    context,
  }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 32.776664, longitude: -96.796988 });

    await gotoDashboard('/dashboard/fleet-map');
    await assertHealthyShell();
    await expect(page.getByText('Location Source')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByLabel('Filter map markers by location source')).toBeVisible();
    await evidencePause(page, 800);
    await evidenceScreenshot(page, '01-fleet-map-source-filter');

    await gotoDashboard(`/dashboard/equipment/${seedEquipment.cat320.id}?tab=details`);
    await assertHealthyShell();
    await expect(page.getByRole('heading', { name: /CAT 320 Excavator/i }).first()).toBeVisible({
      timeout: 60_000,
    });
    await openLocationSourceDropdown(page);
    await expect(page.getByRole('option', { name: 'Team location' })).toBeVisible();
    await page.keyboard.press('Escape');
    await evidencePause(page, 800);
    await evidenceScreenshot(page, '02-equipment-detail-location-source');

    const addressGroup = page.locator('.group').filter({ has: page.getByRole('button', { name: /equipment address/i }) }).first();
    await addressGroup.hover();
    await evidencePause(page, 500);
    await evidenceScreenshot(page, '03-equipment-inline-address-actions');

    await page.getByRole('button', { name: 'Use my current location' }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('heading', { name: /set equipment location from this device/i })).toBeVisible();
    await evidencePause(page, 800);
    await evidenceScreenshot(page, '04-live-location-modal');
    await page.keyboard.press('Escape');

    await openLocationSourceDropdown(page);
    await page.getByRole('option', { name: 'Team location' }).click();
    await expect(page.getByText(/Dallas/i).first()).toBeVisible({ timeout: 30_000 });
    await evidencePause(page, 800);
    await evidenceScreenshot(page, '05-equipment-team-location-fallback');

    await gotoDashboard(`/dashboard/inventory/${seedInventory.hydraulicOil.id}`);
    await assertHealthyShell();
    await expect(page.getByText('Storage address').first()).toBeVisible({ timeout: 60_000 });
    await evidencePause(page, 800);
    await evidenceScreenshot(page, '06-inventory-item-effective-location');

    await gotoDashboard('/dashboard/organization');
    await assertHealthyShell();
    await expect(page.getByRole('heading', { name: /organization settings/i })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByRole('heading', { name: 'Inventory Default Location' })).toBeVisible();
    await evidencePause(page, 800);
    await evidenceScreenshot(page, '07-organization-inventory-default');

    await gotoDashboard(`/dashboard/teams/${TEAM_HEAVY_EQUIPMENT_ID}`);
    await assertHealthyShell();
    await expect(page.getByText('Team Location').first()).toBeVisible({ timeout: 60_000 });
    await page.getByRole('button', { name: 'Edit team location' }).click();
    await expect(page.getByRole('heading', { name: 'Set team location' })).toBeVisible({
      timeout: 30_000,
    });
    await evidencePause(page, 800);
    await evidenceScreenshot(page, '08-team-location-editor');
    await page.keyboard.press('Escape');

    await gotoDashboard(`/dashboard/work-orders/${seedWorkOrders.oilChange.id}`);
    await assertHealthyShell();
    await expect(
      page.getByRole('heading', { name: new RegExp(seedWorkOrders.oilChange.title, 'i') }).first(),
    ).toBeVisible({ timeout: 60_000 });
    await openLocationSourceDropdown(page);
    await expect(page.getByRole('option', { name: 'Team location' })).toBeVisible();
    await page.keyboard.press('Escape');
    await evidencePause(page, 800);
    await evidenceScreenshot(page, '09-work-order-location-map');
  });
});
