import { test, expect } from '../user/fixtures/equipqr-test';
import { seedEquipment } from '../user/shared/seed-data';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';
import { attachConsoleErrorCollector } from '../user/shared/page-helpers';

const apexHeavyEquipmentTeamId = '880e8400-e29b-41d4-a716-446655440000';

test.describe('Image media and console hygiene @pr-evidence', () => {
  test('equipment images tab, list search, and team location map', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    const consoleErrors = attachConsoleErrorCollector(page);
    await gotoDashboard(`/dashboard/equipment/${seedEquipment.cat320.id}?tab=images`);
    await assertHealthyShell();
    await expect(page.getByRole('heading', { name: /equipment images/i })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.locator('main img').first()).toBeVisible({ timeout: 60_000 });
    await evidencePause(page, 800);
    await evidenceScreenshot(page, '01-equipment-images-tab');

    await gotoDashboard('/dashboard/equipment');
    await assertHealthyShell();
    await page.getByRole('textbox', { name: /search equipment/i }).fill(seedEquipment.cat320.name);
    await page.waitForTimeout(800);
    await expect(page.getByRole('heading', { name: seedEquipment.cat320.name, exact: true })).toBeVisible({
      timeout: 60_000,
    });
    await evidencePause(page, 800);
    await evidenceScreenshot(page, '02-equipment-list-search');

    await gotoDashboard(`/dashboard/teams/${apexHeavyEquipmentTeamId}`);
    await assertHealthyShell();
    await expect(page.getByRole('heading', { name: /Heavy Equipment Team/i })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText('Team Location')).toBeVisible();
    await evidencePause(page, 1200);
    await evidenceScreenshot(page, '03-team-details-location-map');

    const lazyIntervention = consoleErrors.filter((line) =>
      line.includes('Images loaded lazily and replaced with placeholders'),
    );
    expect(lazyIntervention).toHaveLength(0);
    const markerDeprecation = consoleErrors.filter((line) =>
      line.includes('google.maps.Marker is deprecated'),
    );
    expect(markerDeprecation).toHaveLength(0);
  });
});
