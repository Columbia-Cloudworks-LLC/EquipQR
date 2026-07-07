import { test, expect } from '../fixtures/equipqr-test';
import { buildCreationRunData } from '../shared/create-flow-data';
import {
  addInventoryCompatibilityRule,
  fillInputByLabel,
  openInventoryCreateDialog,
  selectRadixOption,
  submitInventoryItemDialog,
  expectToastOrRecordVisible,
} from '../shared/ui-form-helpers';

const data = buildCreationRunData('iag');

const createdInventoryNames: string[] = [];
let createdGroupName = '';
let primaryInventorySku = '';

test.describe.serial('creation flows: inventory and alternate groups @full', () => {
  test('creates multiple inventory items with compatibility rules', async ({
    page,
    gotoDashboard,
    assertHealthyShell,
  }) => {
    await gotoDashboard('/inventory');
    await assertHealthyShell();

    for (let index = 0; index < data.inventoryItems.length; index += 1) {
      const item = data.inventoryItems[index];
      await test.step(`Create inventory item ${item.name}`, async () => {
        const dialog = await openInventoryCreateDialog(page, gotoDashboard);
        await fillInputByLabel(dialog, /^Name/i, item.name);
        await fillInputByLabel(dialog, /^SKU/i, item.sku);
        await fillInputByLabel(dialog, /^Description/i, item.description);
        await fillInputByLabel(dialog, /^Location/i, item.location);
        await fillInputByLabel(dialog, /^Quantity on Hand/i, String(item.quantityOnHand));
        await fillInputByLabel(dialog, /^Low Stock Threshold/i, String(item.lowStockThreshold));
        await fillInputByLabel(dialog, /^Default Unit Cost/i, String(item.defaultUnitCost));

        if (index === 0) {
          primaryInventorySku = item.sku;
          await addInventoryCompatibilityRule(dialog, page, {
            manufacturer: 'Toyota',
            matchType: /Any Model/i,
          });
        }

        await submitInventoryItemDialog(page, dialog);
        createdInventoryNames.push(item.name);
        await expectToastOrRecordVisible(page, item.name);
      });
    }

    expect(createdInventoryNames.length).toBeGreaterThanOrEqual(3);
  });

  test('adds created inventory items to a new alternate parts group', async ({
    page,
    gotoDashboard,
    assertHealthyShell,
  }) => {
    createdGroupName = data.alternateGroup.name;

    await gotoDashboard('/alternate-groups');
    await assertHealthyShell();
    await page.getByRole('button', { name: /new alternate part group/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(/new alternate part group/i)).toBeVisible({ timeout: 15_000 });

    await test.step('Fill group details', async () => {
      await fillInputByLabel(dialog, /^Name/i, data.alternateGroup.name);
      await fillInputByLabel(dialog, /^Description/i, data.alternateGroup.description);
      await fillInputByLabel(dialog, /^Verification Notes/i, data.alternateGroup.notes);
      await fillInputByLabel(dialog, /^Evidence URL/i, data.alternateGroup.evidenceUrl);
      await selectRadixOption(page, dialog.getByLabel(/^Verification Status/i), /Verified/i);
      await dialog.getByRole('button', { name: /select parts/i }).click();
    });

    await test.step('Select created inventory items', async () => {
      for (const item of data.inventoryItems) {
        const search = dialog.getByPlaceholder(/search by name or sku/i);
        await search.fill(item.sku);
        const row = dialog.getByText(item.name, { exact: false }).first();
        await expect(row).toBeVisible({ timeout: 30_000 });
        await row.click();
      }

      const primaryItem = data.inventoryItems[0];
      const setPrimary = dialog.getByRole('button', {
        name: new RegExp(`Mark ${primaryItem.name} as primary`, 'i'),
      });
      if (await setPrimary.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await setPrimary.click();
      }

      await dialog.getByRole('button', { name: /^Review$/i }).click();
      await expect(dialog.getByText(data.alternateGroup.name).first()).toBeVisible({
        timeout: 15_000,
      });
      for (const item of data.inventoryItems) {
        await expect(dialog.getByText(item.name).first()).toBeVisible({ timeout: 15_000 });
      }
    });

    await test.step('Create group and verify detail page', async () => {
      await dialog.getByRole('button', { name: /create group/i }).click();
      await expect(page).toHaveURL(/\/dashboard\/alternate-groups\//, { timeout: 60_000 });
      await assertHealthyShell();
      await expect(page.getByText(createdGroupName).first()).toBeVisible({ timeout: 60_000 });
      await expect(page.getByText(new RegExp(`${data.inventoryItems.length}\\s+part`, 'i')).first()).toBeVisible({
        timeout: 30_000,
      }).catch(async () => {
        for (const item of data.inventoryItems) {
          await expect(page.getByText(item.name).first()).toBeVisible({ timeout: 30_000 });
        }
      });
    });
  });

  test('shows the compatible item as applicable to matching equipment', async ({
    page,
    gotoDashboard,
    assertHealthyShell,
  }) => {
    await gotoDashboard('/equipment');
    await assertHealthyShell();

    // Reuse the shared card/legacy-aware opener; the dense list renders the
    // whole equipment card as the clickable button (no "Open details for" name).
    const search = page.getByPlaceholder(/search equipment/i).first();
    await expect(search).toBeVisible({ timeout: 30_000 });
    await search.fill('Toyota');
    const toyotaButton = page
      .getByRole('button', { name: /^(?:Playwright Toyota Forklift|Open details for .*Toyota)/i })
      .or(page.getByRole('button', { name: /^Toyota/i }))
      .first();
    await expect(toyotaButton).toBeVisible({ timeout: 30_000 });
    await toyotaButton.click();
    await expect(page).toHaveURL(/\/dashboard\/equipment\//, { timeout: 60_000 });

    await test.step('Open compatible parts tab and verify created inventory item', async () => {
      await page.getByRole('tab', { name: /parts/i }).click();
      await assertHealthyShell();

      const primaryItemName = data.inventoryItems[0].name;
      const visible = page.getByText(primaryItemName).first();
      if (!(await visible.isVisible({ timeout: 15_000 }).catch(() => false))) {
        await page.reload();
        await page.getByRole('tab', { name: /parts/i }).click();
      }

      const searchParts = page.getByPlaceholder(/search parts|search inventory|search/i).first();
      if (await searchParts.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await searchParts.fill(primaryInventorySku || data.inventoryItems[0].sku);
      }

      await expect(page.getByText(primaryItemName).first()).toBeVisible({ timeout: 60_000 });
    });
  });
});
