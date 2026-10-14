import { test, expect } from '../user/fixtures/equipqr-test';
import { pinContextToOrg } from '../user/shared/auth-helpers';
import { apexOrgId, seedEquipment } from '../user/shared/seed-data';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

test.describe('PR evidence: add another like this (#1643) @pr-evidence', () => {
  test.beforeEach(async ({ context }) => {
    await pinContextToOrg(context, apexOrgId);
  });

  test('clones shared specs, leaves serial blank, and creates a new unit', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    const serial = `PR-CLONE-${Date.now()}`;

    await gotoDashboard(`/equipment/${seedEquipment.cat320.id}`);
    await assertHealthyShell();
    const cloneButton = page.getByRole('button', { name: /add another like this/i });
    await expect(cloneButton).toBeVisible({ timeout: 30_000 });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '01-details-clone-action', { target: cloneButton });

    await cloneButton.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: /add another like this/i })).toBeVisible();
    await expect(dialog.getByText(`Specs copied from ${seedEquipment.cat320.name}`, { exact: false })).toBeVisible();

    const serialInput = dialog.getByLabel(/serial number/i);
    await expect(serialInput).toHaveValue('');
    await expect(serialInput).toBeFocused();
    await expect(dialog.getByLabel(/manufacturer/i)).not.toHaveValue('');
    await expect(dialog.getByLabel(/^model/i)).not.toHaveValue('');
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '02-prefilled-form');

    await serialInput.fill(serial);
    await dialog.getByRole('button', { name: /create equipment/i }).click();

    await expect(page).not.toHaveURL(new RegExp(seedEquipment.cat320.id), { timeout: 30_000 });
    await expect(page).toHaveURL(/\/dashboard\/equipment\/[0-9a-f-]{36}/);
    await expect(page.getByText(serial, { exact: false }).first()).toBeVisible({ timeout: 30_000 });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '03-new-unit-details');
  });

  test('mobile header exposes the action', async ({ gotoDashboard, page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoDashboard(`/equipment/${seedEquipment.cat320.id}`);
    const cloneButton = page.getByRole('button', { name: /add another like this/i });
    await expect(cloneButton).toBeVisible({ timeout: 30_000 });
    await cloneButton.click();
    const serialInput = page.getByRole('dialog').getByLabel(/serial number/i);
    await expect(serialInput).toBeFocused();
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '04-mobile-prefilled-form');
  });
});
