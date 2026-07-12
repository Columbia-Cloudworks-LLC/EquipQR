import { test, expect } from '../user/fixtures/equipqr-test';
import { pinContextToOrg } from '../user/shared/auth-helpers';
import { apexOrgId, authStatePath, seedEquipment } from '../user/shared/seed-data';
import {
  fillWorkOrderBasics,
  selectPmTemplateIfAvailable,
  setPmTemplate,
  submitWorkOrderForm,
} from '../user/shared/ui-form-helpers';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

test.use({ storageState: authStatePath('owner') });

test.describe('Unified work order PM template create @pr-evidence', () => {
  test.beforeEach(async ({ context }) => {
    await pinContextToOrg(context, apexOrgId);
  });

  test('shows PM template dropdown below title with None and equipment default', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard(`/dashboard/equipment/${seedEquipment.cat320.id}?createWorkOrder=1`);
    await assertHealthyShell();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 60_000 });
    await expect(dialog.getByLabel(/^Title/i)).toBeVisible();
    await expect(dialog.getByRole('combobox', { name: /pm template/i })).toBeVisible();

    await evidencePause(page, 600);
    await evidenceScreenshot(page, '01-unified-create-default-pm', {
      target: dialog.getByRole('combobox', { name: /pm template/i }),
    });

    await setPmTemplate(page, dialog, 'none');
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '02-unified-create-pm-cleared', {
      target: dialog.getByRole('combobox', { name: /pm template/i }),
    });

    await fillWorkOrderBasics(dialog, {
      title: `Unified WO ${Date.now()}`,
      description: 'Created from unified PM template dropdown below title.',
    });
    await selectPmTemplateIfAvailable(page, dialog, /excavator pm|forklift pm/i);
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '03-unified-create-pm-selected', {
      target: dialog.getByRole('combobox', { name: /pm template/i }),
    });

    await submitWorkOrderForm(page, dialog);
    await assertHealthyShell();
    await expect(page.getByText(/pm checklist|preventative maintenance/i).first()).toBeVisible({
      timeout: 60_000,
    });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '04-unified-create-submitted');
  });
});
