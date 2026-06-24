import { test, expect } from '../user/fixtures/equipqr-test';
import { pinContextToOrg } from '../user/shared/auth-helpers';
import { apexOrgId, seedEquipment } from '../user/shared/seed-data';
import {
  fillEquipmentDialog,
  openAddEquipmentDialog,
} from '../user/shared/ui-form-helpers';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

test.describe('PR evidence: duplicate serial warning @pr-evidence', () => {
  test.beforeEach(async ({ context }) => {
    await pinContextToOrg(context, apexOrgId);
  });

  test('warns on duplicate serial and allows create anyway', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard('/equipment');
    await assertHealthyShell();
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '01-equipment-list');

    const dialog = await openAddEquipmentDialog(page);
    await fillEquipmentDialog(dialog, page, {
      manufacturer: 'Caterpillar',
      model: '320 GC',
      name: 'PR Evidence Duplicate Serial Test',
      serialNumber: 'CAT320GC2023001',
      location: 'Main yard',
      installationDate: '2024-01-15',
    });

    await expect(
      dialog.getByText(/possible duplicate — equipment with this serial already exists/i),
    ).toBeVisible({ timeout: 15_000 });
    await expect(dialog.getByText(seedEquipment.cat320.name)).toBeVisible();
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '02-inline-duplicate-warning');

    await dialog.getByRole('button', { name: /create equipment/i }).click();

    const confirm = page.getByRole('alertdialog');
    await expect(
      confirm.getByRole('heading', { name: /this serial number already exists/i }),
    ).toBeVisible({
      timeout: 15_000,
    });
    await expect(confirm.getByRole('button', { name: /create anyway/i })).toBeVisible();
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '03-create-anyway-confirm');

    await confirm.getByRole('button', { name: /go back/i }).click();
    await expect(confirm).toBeHidden({ timeout: 15_000 });
    await expect(dialog).toBeVisible();
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '04-form-after-go-back');
  });
});
