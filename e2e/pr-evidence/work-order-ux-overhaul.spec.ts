import { test, expect } from '../user/fixtures/equipqr-test';
import { pinContextToOrg } from '../user/shared/auth-helpers';
import { apexOrgId, authStatePath, seedEquipment } from '../user/shared/seed-data';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

test.use({ storageState: authStatePath('owner') });

test.describe('Work order UX overhaul @pr-evidence', () => {
  test.beforeEach(async ({ context }) => {
    await pinContextToOrg(context, apexOrgId);
  });

  test('new work order, Log Completed rapid entry, and the QR scan page', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard(`/dashboard/equipment/${seedEquipment.cat320.id}?createWorkOrder=1`);
    await assertHealthyShell();

    const dialog = page.getByRole('dialog');
    const title = dialog.getByLabel(/^Title/i);
    await expect(title).toBeVisible({ timeout: 60_000 });
    await expect(dialog.getByRole('heading', { name: /create work order/i })).toBeVisible();
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '01-new-work-order-form');

    await dialog.getByRole('radio', { name: /log completed/i }).click();
    await expect(dialog.getByRole('heading', { name: /log completed work order/i })).toBeVisible();

    const loggedTitle = `Paper WO ${Date.now()}`;
    await title.fill(loggedTitle);
    await dialog.locator('#work-order-service-date').fill('2024-03-05');
    await dialog.locator('#work-order-service-hours').fill('12');

    const createAnother = dialog.getByRole('switch', { name: /create another/i });
    if (!(await createAnother.isChecked())) {
      await createAnother.click();
    }
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '02-log-completed-rapid-entry');

    await title.press('Control+Enter');
    await expect(page.getByText(/work order saved/i).first()).toBeVisible({ timeout: 60_000 });
    await expect(dialog).toBeVisible();
    await expect(title).toHaveValue('');
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '03-saved-dialog-stays-open');

    await page.goto(`/qr/equipment/${seedEquipment.cat320.id}`);
    await expect(page.getByRole('button', { name: /report issue/i })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole('button', { name: /update hours/i })).toBeVisible();
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '04-qr-scan-actions');
  });
});
