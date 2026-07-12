/**
 * Help Center docs media — "Technician Field Work" collection, desktop (#1161).
 *
 * One continuous field-work narrative covering six articles:
 *   scan-equipment-qr, create-work-order-from-equipment,
 *   update-work-order-status, add-notes-and-photos, pm-checklist,
 *   consume-inventory-on-wo.
 *
 * The demo creates a fresh PM work order on the seeded CAT 320 so repeated
 * captures never mutate durable-core fixtures.
 *
 * Capture:
 *   .\scripts\pr-evidence\Invoke-PrEvidence.ps1 -Flow "docs-technician-field-work-desktop" `
 *     -Spec "e2e/pr-evidence/docs-technician-field-work-desktop.spec.ts"
 * Publish:
 *   .\scripts\docs-media\Publish-DocsMedia.ps1 `
 *     -ManifestPath tmp\pr-evidence\docs-technician-field-work-desktop\manifest.json `
 *     -Collection technician-field-work -Variant desktop
 */

import { test, expect } from '../user/fixtures/equipqr-test';
import { seedEquipment, seedInventory } from '../user/shared/seed-data';
import { evidenceScreenshot } from './shared/evidence-helpers';
import { focusAndClick, focusAndFill, focusControl, settleForDemo } from './shared/docs-demo-helpers';
import { selectPmTemplateIfAvailable } from '../user/shared/ui-form-helpers';

test.describe('Docs media: Technician field work desktop @pr-evidence', () => {
  test('scan QR, create WO from equipment, status, notes, PM checklist, consume parts', async ({
    assertHealthyShell,
    page,
  }) => {
    test.setTimeout(420_000);
    const workOrderTitle = `Field Service Demo ${Date.now().toString().slice(-6)}`;

    // --- scan-equipment-qr: QR link lands on the equipment record ---
    await page.goto(`/qr/equipment/${seedEquipment.cat320.id}`);
    await settleForDemo(page);
    await evidenceScreenshot(page, '01-scan-qr-landing');

    // --- create-work-order-from-equipment ---
    await page.goto(`/dashboard/equipment/${seedEquipment.cat320.id}?tab=work-orders`);
    await assertHealthyShell();
    await expect(page.getByRole('heading', { name: /cat 320 excavator/i }).first()).toBeVisible({
      timeout: 60_000,
    });
    await settleForDemo(page);

    await focusAndClick(page, page.getByRole('button', { name: /create work order|^create$/i }).first());
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: /create work order/i })).toBeVisible({
      timeout: 30_000,
    });

    await focusAndFill(page, dialog.getByLabel(/^title/i), workOrderTitle);
    const description = dialog.getByLabel(/^description/i);
    if (await description.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await focusAndFill(page, description, 'Hydraulic system inspection reported from the field.');
    }

    // PM work order so the detail page carries a live checklist for the demo.
    await selectPmTemplateIfAvailable(page, dialog, /excavator pm|forklift pm|pm/i);

    await settleForDemo(page, 600);
    await evidenceScreenshot(page, '02-create-work-order-dialog');

    await focusAndClick(
      page,
      dialog.getByTestId('submit-button').or(dialog.getByRole('button', { name: /create work order/i })).last(),
    );
    const confirmHours = page.getByRole('button', { name: /yes, create without hours/i });
    if (await confirmHours.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await focusAndClick(page, confirmHours);
    }
    await expect(dialog).toBeHidden({ timeout: 60_000 });
    await expect(page).toHaveURL(/\/dashboard\/work-orders\//, { timeout: 60_000 });
    await expect(page.getByRole('heading', { name: new RegExp(workOrderTitle, 'i') }).first()).toBeVisible({
      timeout: 60_000,
    });
    await settleForDemo(page);
    await evidenceScreenshot(page, '03-work-order-created-submitted');

    // --- update-work-order-status: accept & assign, then start work ---
    const acceptButton = page.getByRole('button', { name: /^accept/i }).first();
    await focusAndClick(page, acceptButton);

    const acceptDialog = page.getByRole('dialog').filter({ hasText: /accept work order/i });
    await expect(acceptDialog).toBeVisible({ timeout: 30_000 });
    await focusAndClick(page, acceptDialog.getByRole('combobox', { name: /assign to/i }));
    await focusAndClick(page, page.getByRole('option').first(), { postActionHoldMs: 400 });
    await focusAndClick(page, acceptDialog.getByRole('button', { name: /accept & assign/i }));
    await expect(acceptDialog).toBeHidden({ timeout: 30_000 });
    await settleForDemo(page);
    await evidenceScreenshot(page, '04-status-accepted-assigned');

    // Start work: either the direct action button or the inline assignee gate.
    const inlineAssignee = page.getByRole('combobox', { name: /select assignee to start work/i });
    if (await inlineAssignee.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await focusAndClick(page, inlineAssignee);
      await focusAndClick(page, page.getByRole('option').first(), { postActionHoldMs: 400 });
    }
    await focusAndClick(page, page.getByRole('button', { name: /start work/i }).first());
    await expect(page.getByText(/in progress/i).first()).toBeVisible({ timeout: 30_000 });
    await settleForDemo(page);
    await evidenceScreenshot(page, '05-status-in-progress');

    // --- add-notes-and-photos: inline composer is already visible on desktop ---
    const noteBox = page.getByRole('textbox', { name: /note content/i }).first();
    await focusAndFill(page, noteBox, 'Inspected hydraulic lines; replacing the main filter next.');
    await settleForDemo(page, 600);
    await evidenceScreenshot(page, '06-add-note-composer');

    const saveNote = page.getByRole('button', { name: /^add note$/i }).last();
    await focusAndClick(page, saveNote);
    await settleForDemo(page);
    await evidenceScreenshot(page, '07-note-added');

    // --- pm-checklist: work through checklist items ---
    const checklistHeading = page.getByText(/pm checklist|preventative maintenance/i).first();
    await focusControl(page, checklistHeading);
    await evidenceScreenshot(page, '08-pm-checklist-section');

    // --- consume-inventory-on-wo: add a part from inventory ---
    const addCostItem = page.getByRole('button', { name: /add cost item/i }).first();
    await focusAndClick(page, addCostItem);

    const addFromInventory = page.getByRole('button', { name: /add from inventory/i }).first();
    await focusAndClick(page, addFromInventory);

    const partDialog = page.getByRole('dialog').filter({ hasText: /add part from inventory/i });
    await expect(partDialog).toBeVisible({ timeout: 30_000 });
    const partSearch = partDialog.getByPlaceholder(/search by name, sku/i);
    await focusAndFill(page, partSearch, seedInventory.hydraulicOil.name.slice(0, 13));
    await settleForDemo(page, 800);

    await focusAndClick(page, partDialog.getByText(seedInventory.hydraulicOil.name).first());
    await settleForDemo(page, 600);
    await evidenceScreenshot(page, '09-inventory-part-selector');

    await focusAndClick(page, partDialog.getByRole('button', { name: /add to work order/i }));
    await expect(partDialog).toBeHidden({ timeout: 30_000 });

    const saveCosts = page.getByRole('button', { name: /^save/i }).last();
    await focusAndClick(page, saveCosts);
    await settleForDemo(page);
    await evidenceScreenshot(page, '10-part-consumed-on-work-order');
  });
});
