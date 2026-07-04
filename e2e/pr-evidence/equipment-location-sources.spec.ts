import { test, expect } from '../user/fixtures/equipqr-test';
import { seedEquipment, seedWorkOrders } from '../user/shared/seed-data';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

test.describe('Equipment location sources @pr-evidence', () => {
  test('captures fleet map, equipment detail, scan history, and work order source UI', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard('/dashboard/fleet-map');
    await assertHealthyShell();

    await expect(page.getByText('Location Source')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByLabel('Filter map markers by location source')).toBeVisible();
    await evidencePause(page, 800);
    await evidenceScreenshot(page, '01-fleet-map-source-legend');

    await gotoDashboard(`/dashboard/equipment/${seedEquipment.cat320.id}?tab=details`);
    await assertHealthyShell();
    await expect(page.getByRole('heading', { name: /CAT 320 Excavator/i }).first()).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByRole('heading', { name: 'Location' })).toBeVisible();
    await expect(page.getByText('Team location').first()).toBeVisible();
    await expect(page.getByLabel('Location source')).toBeVisible();
    await evidencePause(page, 800);
    await evidenceScreenshot(page, '02-equipment-detail-location');

    await gotoDashboard(`/dashboard/equipment/${seedEquipment.cat320.id}?tab=scan-history`);
    await assertHealthyShell();
    await expect(page.getByText('Location Movement')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText('Scan GPS').first()).toBeVisible();
    await evidencePause(page, 800);
    await evidenceScreenshot(page, '03-equipment-location-history');

    await gotoDashboard(`/dashboard/work-orders/${seedWorkOrders.oilChange.id}`);
    await assertHealthyShell();
    await expect(
      page.getByRole('heading', { name: new RegExp(seedWorkOrders.oilChange.title, 'i') }).first(),
    ).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText('Team location').or(page.getByText('Equipment location'))).toBeVisible();
    await evidencePause(page, 800);
    await evidenceScreenshot(page, '04-work-order-location-source');
  });
});
