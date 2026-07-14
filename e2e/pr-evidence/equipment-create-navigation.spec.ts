import { test, expect } from '../user/fixtures/equipqr-test';
import { pinContextToOrg } from '../user/shared/auth-helpers';
import { apexOrgId } from '../user/shared/seed-data';
import { clickWithDemoCue } from '../user/shared/page-helpers';
import {
  fillEquipmentDialog,
  openAddEquipmentDialog,
} from '../user/shared/ui-form-helpers';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

test.describe('PR evidence: equipment create navigation @pr-evidence', () => {
  test.beforeEach(async ({ context }) => {
    await pinContextToOrg(context, apexOrgId);
  });

  test('navigates to equipment details after create and resets team scope', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    const uniqueSuffix = Date.now();
    const equipmentName = `PR Evidence Create Nav ${uniqueSuffix}`;

    await gotoDashboard('/equipment?team=all');
    await assertHealthyShell();
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '01-equipment-list-before-create');

    const dialog = await openAddEquipmentDialog(page);
    await fillEquipmentDialog(dialog, page, {
      manufacturer: 'Caterpillar',
      model: '320 GC',
      name: equipmentName,
      serialNumber: `PR-NAV-${uniqueSuffix}`,
      location: 'Main yard',
      installationDate: '2024-01-15',
    });
    await expect(dialog.getByRole('button', { name: /create equipment/i })).toBeEnabled({
      timeout: 15_000,
    });
    await clickWithDemoCue(
      dialog.getByRole('button', { name: /create equipment/i }),
      'Create equipment',
    );

    const continueWithoutTeam = page.getByRole('button', { name: /continue without a team/i });
    await expect(continueWithoutTeam).toBeVisible({ timeout: 30_000 });
    await clickWithDemoCue(continueWithoutTeam, 'Continue without a team');

    await expect(page).toHaveURL(/\/dashboard\/equipment\/[^/]+$/, { timeout: 60_000 });
    await expect(page.getByRole('heading', { name: equipmentName, exact: true })).toBeVisible({
      timeout: 30_000,
    });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '02-equipment-details-after-create', {
      target: page.getByRole('heading', { name: equipmentName, exact: true }),
    });

    await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: /^Equipment$/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/equipment(?:\?|$)/, { timeout: 30_000 });
    await expect(page.getByRole('button', { name: /all teams/i })).toBeVisible({ timeout: 15_000 });
    const search = page.getByPlaceholder(/search equipment/i);
    await expect(search).toBeVisible({ timeout: 30_000 });
    await search.fill(equipmentName);
    await expect(page.getByRole('heading', { name: equipmentName, level: 3 })).toBeVisible({
      timeout: 60_000,
    });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '03-equipment-visible-in-all-teams-list');
  });
});
