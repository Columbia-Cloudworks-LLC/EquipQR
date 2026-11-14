import { test, expect } from '../fixtures/equipqr-test';
import { buildCreationRunData } from '../shared/create-flow-data';
import { seedEquipment } from '../shared/seed-data';
import {
  assignPmTemplateOnEquipmentDetail,
  createEquipmentFromEquipmentPage,
  fillWorkOrderBasics,
  openEquipmentDetailByName,
  openWorkOrderCreateDialog,
  selectWorkOrderEquipment,
  setPmTemplate,
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

  test('creates a work order without a PM template for a deterministic equipment record', async ({
    page,
    gotoDashboard,
    assertHealthyShell,
  }) => {
    const dialog = await openWorkOrderCreateDialog(page, gotoDashboard);

    await test.step('Fill work order fields without PM', async () => {
      await fillWorkOrderBasics(dialog, data.genericWorkOrder);
      await selectWorkOrderEquipment(
        page,
        dialog,
        equipmentWithDefaultPmName,
        seedEquipment.cat320.name,
      );
      await setPmTemplate(page, dialog, 'none');
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
      await expect(
        dialog.getByText(/PM Checklist Preview|Excavator PM|Equipment default/i).first(),
      ).toBeVisible({ timeout: 30_000 });
    });

    await test.step('Submit and verify PM checklist on detail page', async () => {
      await submitWorkOrderForm(page, dialog);
      await assertHealthyShell();
      await expect(
        page.getByRole('heading', { name: new RegExp(data.pmWorkOrderWithDefault.title, 'i') }).first(),
      ).toBeVisible({ timeout: 60_000 });
      // A checklist section only the Excavator PM template has. Text such as "PM checklist"
      // would also match the "Add PM Checklist" button that non-PM work orders show.
      await expect(
        page.getByRole('button', { name: /Swing System/i }).first(),
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
      // Without an equipment default, "Include PM" starts off and the template select
      // only renders once it is switched on; setPmTemplate asserts the select appears.
      await setPmTemplate(page, dialog, /Forklift PM/i);
    });

    await test.step('Submit and verify PM checklist on detail page', async () => {
      await submitWorkOrderForm(page, dialog);
      await assertHealthyShell();
      await expect(
        page.getByRole('heading', { name: new RegExp(data.pmWorkOrderWithoutDefault.title, 'i') }).first(),
      ).toBeVisible({ timeout: 60_000 });
      // A checklist section only the Forklift PM template has. Text such as "PM checklist"
      // would also match the "Add PM Checklist" button that non-PM work orders show.
      await expect(
        page.getByRole('button', { name: /Mast & Carriage/i }).first(),
      ).toBeVisible({ timeout: 60_000 });
    });
  });

  test('equipment create-work-order deep link opens the form with the equipment PM default', async ({
    page,
    gotoDashboard,
    assertHealthyShell,
  }) => {
    await gotoDashboard(`/equipment/${seedEquipment.cat320.id}?createWorkOrder=1`);
    await assertHealthyShell();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 60_000 });
    await expect(dialog.getByLabel(/^Title/i)).toBeVisible();
    const pmTemplate = dialog.getByRole('combobox', { name: /pm template/i });
    await expect(pmTemplate).toHaveText(/excavator pm/i, { timeout: 30_000 });

    await setPmTemplate(page, dialog, 'none');
    await expect(pmTemplate).toBeHidden();
  });
});
