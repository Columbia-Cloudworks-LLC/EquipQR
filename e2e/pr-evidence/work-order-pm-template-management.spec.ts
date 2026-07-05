import { test, expect, type Page } from '../user/fixtures/equipqr-test';
import { pinContextToOrg } from '../user/shared/auth-helpers';
import { apexOrgId, authStatePath, seedWorkOrders } from '../user/shared/seed-data';
import { selectRadixOption } from '../user/shared/ui-form-helpers';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

async function confirmPmWarningIfVisible(page: Page): Promise<void> {
  const confirmButton = page.getByRole('button', { name: /yes, disable pm|yes, change template/i });
  if (await confirmButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await confirmButton.click();
  }
}

async function openPmManagement(page: Page): Promise<void> {
  const button = page.getByRole('button', { name: /add pm checklist|manage pm template/i }).first();
  await expect(button).toBeVisible({ timeout: 60_000 });
  await button.click();
  await expect(page.getByRole('dialog', { name: /manage pm checklist/i })).toBeVisible();
}

async function savePmDialog(page: Page): Promise<void> {
  await page.getByRole('button', { name: /save pm changes/i }).click();
  await confirmPmWarningIfVisible(page);
  await expect(page.getByRole('dialog', { name: /manage pm checklist/i })).toBeHidden({
    timeout: 30_000,
  });
}

async function ensureWorkOrderHasNoPm(page: Page): Promise<void> {
  const manageButton = page.getByRole('button', { name: /manage pm template/i });
  if (!(await manageButton.isVisible({ timeout: 2_000 }).catch(() => false))) {
    return;
  }

  await manageButton.click();
  await page.getByRole('radio', { name: /standard work order/i }).click();
  await savePmDialog(page);
  await page.reload();
}

test.use({ storageState: authStatePath('technician') });

test.describe('Work order PM template management @pr-evidence', () => {
  test.beforeEach(async ({ context }) => {
    await pinContextToOrg(context, apexOrgId);
  });

  test('add, change, and remove PM templates on active work orders', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    const target = seedWorkOrders.oilChange;

    await gotoDashboard(`/dashboard/work-orders/${target.id}`);
    await assertHealthyShell();
    await expect(
      page.getByRole('heading', { name: new RegExp(target.title, 'i') }).first(),
    ).toBeVisible({ timeout: 60_000 });

    await ensureWorkOrderHasNoPm(page);
    await assertHealthyShell();

    await openPmManagement(page);
    await page.getByRole('radio', { name: /with pm checklist/i }).click();
    const templateTrigger = page.getByRole('combobox').first();
    await selectRadixOption(page, templateTrigger, /excavator pm|forklift pm/i);
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '01-add-pm-dialog');
    await savePmDialog(page);

    await expect(page.getByRole('button', { name: /set all to ok/i })).toBeVisible({
      timeout: 30_000,
    });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '02-pm-checklist-after-add');

    await openPmManagement(page);
    const changeTemplateTrigger = page.getByRole('combobox').first();
    await selectRadixOption(page, changeTemplateTrigger, /forklift pm|excavator pm/i);
    await savePmDialog(page);
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '03-pm-template-changed');

    await openPmManagement(page);
    await page.getByRole('radio', { name: /standard work order/i }).click();
    await savePmDialog(page);
    await page.reload();
    await assertHealthyShell();
    await expect(page.getByRole('button', { name: /add pm checklist/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole('button', { name: /set all to ok/i })).toHaveCount(0);
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '04-pm-removed-notes-photos-remain');
    await expect(page.getByText(/notes|photos/i).first()).toBeVisible();

    await gotoDashboard(`/dashboard/work-orders/${seedWorkOrders.completed.id}`);
    await assertHealthyShell();
    await expect(page.getByRole('button', { name: /add pm checklist|manage pm template/i })).toHaveCount(0);
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '05-completed-work-order-locked');
  });
});
