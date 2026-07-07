import { test, expect } from '../fixtures/equipqr-test';
import { buildCreationRunData } from '../shared/create-flow-data';
import { seedEquipment } from '../shared/seed-data';
import {
  assignPmTemplateOnEquipmentDetail,
  createEquipmentFromEquipmentPage,
  fillWorkOrderBasics,
  openEquipmentDetailByName,
  openWorkOrderCreateDialog,
  selectPmTemplateIfAvailable,
  selectWorkOrderEquipment,
  setWorkOrderType,
  submitWorkOrderForm,
} from '../shared/ui-form-helpers';

const data = buildCreationRunData('ewo');

let equipmentWithDefaultPmName = '';
let equipmentWithoutDefaultPmName = '';

test.describe.serial('creation flows: equipment and work orders @full', () => {
  test('creates equipment with a rich property set through the UI', async ({
    page,
    gotoDashboard,
    assertHealthyShell,
  }) => {
    await test.step('Create Toyota equipment with full property set', async () => {
      equipmentWithDefaultPmName = await createEquipmentFromEquipmentPage(
        page,
        gotoDashboard,
        data.equipmentWithDefaultPm,
      );
    });

    await test.step('Verify equipment detail shows core properties', async () => {
      await gotoDashboard('/equipment');
      await openEquipmentDetailByName(page, equipmentWithDefaultPmName);
      await assertHealthyShell();
      await expect(page.getByText(data.equipmentWithDefaultPm.manufacturer).first()).toBeVisible({
        timeout: 30_000,
      });
      await expect(page.getByText(data.equipmentWithDefaultPm.model).first()).toBeVisible({
        timeout: 30_000,
      });
      await expect(page.getByText(data.equipmentWithDefaultPm.serialNumber).first()).toBeVisible({
        timeout: 30_000,
      });
      // The details page now renders the effective-location module instead of
      // the legacy free-text location description (#1123 location sources).
      await expect(page.getByRole('combobox', { name: /location source/i })).toBeVisible({
        timeout: 30_000,
      });
    });

    await test.step('Assign Forklift PM as default checklist on equipment', async () => {
      await assignPmTemplateOnEquipmentDetail(page, /Forklift PM/i);
    });
  });

  test('creates a generic work order for a deterministic equipment record', async ({
    page,
    gotoDashboard,
    assertHealthyShell,
  }) => {
    const dialog = await openWorkOrderCreateDialog(page, gotoDashboard);

    await test.step('Fill generic work order fields', async () => {
      await fillWorkOrderBasics(dialog, data.genericWorkOrder);
      await setWorkOrderType(dialog, 'standard');
      await selectWorkOrderEquipment(
        page,
        dialog,
        equipmentWithDefaultPmName,
        seedEquipment.cat320.name,
      );
    });

    await test.step('Submit and verify work order detail', async () => {
      await submitWorkOrderForm(page, dialog);
      await assertHealthyShell();
      await expect(
        page.getByRole('heading', { name: new RegExp(data.genericWorkOrder.title, 'i') }).first(),
      ).toBeVisible({ timeout: 60_000 });
    });
  });

  test('creates a PM work order for equipment with a default PM checklist', async ({
    page,
    gotoDashboard,
    assertHealthyShell,
  }) => {
    const dialog = await openWorkOrderCreateDialog(page, gotoDashboard);

    await test.step('Create PM work order using equipment with assigned default template', async () => {
      await fillWorkOrderBasics(dialog, data.pmWorkOrderWithDefault);
      // Work-order equipment summaries omit default_pm_template_id, so use seeded CAT 320
      // (Excavator PM) for the default-template PM create path; test 1 still assigns Forklift PM
      // on the detail page for the UI-created Toyota unit.
      await selectWorkOrderEquipment(page, dialog, seedEquipment.cat320.name);
      await setWorkOrderType(dialog, 'pm');
      await expect(
        dialog
          .getByText(/uses the assigned PM template|Excavator PM|PM Checklist Preview/i)
          .first(),
      ).toBeVisible({ timeout: 30_000 });
    });

    await test.step('Submit and verify PM checklist on detail page', async () => {
      await submitWorkOrderForm(page, dialog);
      await assertHealthyShell();
      await expect(
        page.getByRole('heading', { name: new RegExp(data.pmWorkOrderWithDefault.title, 'i') }).first(),
      ).toBeVisible({ timeout: 60_000 });
      await expect(
        page.getByText(/preventative maintenance|pm checklist|excavator pm|forklift pm/i).first(),
      ).toBeVisible({ timeout: 60_000 });
    });
  });

  test('creates a PM work order for equipment without a default PM checklist', async ({
    page,
    gotoDashboard,
    assertHealthyShell,
  }) => {
    await test.step('Create equipment without a default PM template', async () => {
      equipmentWithoutDefaultPmName = await createEquipmentFromEquipmentPage(
        page,
        gotoDashboard,
        data.equipmentWithoutDefaultPm,
      );
    });

    const dialog = await openWorkOrderCreateDialog(page, gotoDashboard);

    await test.step('Create PM work order with manual template selection', async () => {
      await fillWorkOrderBasics(dialog, data.pmWorkOrderWithoutDefault);
      await selectWorkOrderEquipment(page, dialog, equipmentWithoutDefaultPmName);
      await setWorkOrderType(dialog, 'pm');
      await expect(dialog.getByText(/^Checklist Template$/)).toBeVisible({ timeout: 15_000 });

      const manualSelector = dialog
        .locator('div')
        .filter({ has: dialog.getByText(/^Checklist Template$/) })
        .getByRole('combobox');
      if (await manualSelector.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await selectPmTemplateIfAvailable(page, dialog, /Forklift PM/i);
      } else {
        await expect(
          dialog.getByText(/Compressor PM|Forklift PM|PM Checklist Preview/i).first(),
        ).toBeVisible({ timeout: 15_000 });
      }
    });

    await test.step('Submit and verify PM checklist on detail page', async () => {
      await submitWorkOrderForm(page, dialog);
      await assertHealthyShell();
      await expect(
        page.getByRole('heading', { name: new RegExp(data.pmWorkOrderWithoutDefault.title, 'i') }).first(),
      ).toBeVisible({ timeout: 60_000 });
      await expect(
        page.getByText(/preventative maintenance|pm checklist|excavator pm|forklift pm/i).first(),
      ).toBeVisible({ timeout: 60_000 });
    });
  });
});
