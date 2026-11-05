import { test, expect } from '../user/fixtures/equipqr-test';
import { seedEquipment, seedInventory } from '../user/shared/seed-data';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

/**
 * Evidence for the fix pass:
 *   #1169 PM template selector moved to the top of the Work Orders tab
 *   #1165 Inventory item cost / low-stock threshold inline editing + audit trail
 */

test.describe('PM template + inventory fixes @pr-evidence', () => {
  test('PM template selector lives at the top of the Work Orders tab with locked dropdown (#1169)', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard(`/equipment/${seedEquipment.cat320.id}`);
    await assertHealthyShell();

    // Details tab no longer hosts the template selector.
    await expect(page.getByText('PM Schedule').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('combobox', { name: /^PM Template$/i })).toHaveCount(0);

    await page.getByRole('tab', { name: /work orders/i }).click();

    const templateTrigger = page.getByRole('combobox', { name: /^PM Template$/i });
    await expect(templateTrigger).toBeVisible({ timeout: 30_000 });
    await expect(templateTrigger).toBeDisabled();
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '06-pm-template-locked-on-work-orders-tab');

    // Unlock, change the template, and confirm auto-save + re-lock.
    const currentLabel = (await templateTrigger.textContent()) ?? '';
    const nextTemplate = /forklift/i.test(currentLabel) ? /excavator pm/i : /forklift pm/i;

    await page.getByRole('button', { name: 'Edit PM template' }).click();
    await expect(templateTrigger).toBeEnabled();
    await evidenceScreenshot(page, '07-pm-template-unlocked');

    await templateTrigger.click();
    await page.getByRole('option', { name: nextTemplate }).click();

    await expect(templateTrigger).toContainText(nextTemplate, { timeout: 30_000 });
    await expect(templateTrigger).toBeDisabled({ timeout: 30_000 });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '08-pm-template-saved-and-relocked');
  });

  test('inventory cost and low-stock threshold edit inline and land in the audit log (#1165)', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard(`/inventory/${seedInventory.hydraulicOil.id}`);
    await assertHealthyShell();

    await expect(page.getByText('Low Stock Threshold')).toBeVisible({ timeout: 30_000 });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '09-inventory-overview-inline-editors');

    // Threshold: click-to-edit, numeric input, save.
    await page.getByRole('button', { name: 'Edit low stock threshold' }).click();
    const thresholdInput = page.locator('input[type="number"]');
    await expect(thresholdInput).toBeVisible();
    await thresholdInput.fill('7');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('7', { exact: true })).toBeVisible({ timeout: 30_000 });

    // Cost: same inline pattern, formatted as currency after save.
    await page.getByRole('button', { name: 'Edit default unit cost' }).click();
    const costInput = page.locator('input[type="number"]');
    await expect(costInput).toBeVisible();
    await costInput.fill('42.5');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('$42.50')).toBeVisible({ timeout: 30_000 });

    await evidencePause(page, 600);
    await evidenceScreenshot(page, '10-inventory-cost-threshold-updated');

    // Audit trail proof: the change history link shows the UPDATE entries.
    await page
      .getByRole('link', { name: /view change history in the audit log/i })
      .click();
    await expect(page).toHaveURL(/audit-log/, { timeout: 30_000 });
    await expect(page.getByText(/audit log/i).first()).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByText(seedInventory.hydraulicOil.name).first(),
    ).toBeVisible({ timeout: 30_000 });

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '11-audit-log-inventory-update-entries');
  });
});
