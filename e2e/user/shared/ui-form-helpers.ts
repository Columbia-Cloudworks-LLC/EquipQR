import { expect, type Locator, type Page } from '@playwright/test';
import type { EquipmentCreationData } from './create-flow-data';

function patternToSearchText(name: string | RegExp): string {
  if (typeof name === 'string') return name;
  return name.source.replace(/\\(.)/g, '$1').replace(/[\\^$.*+?()[\]{}|]/g, '').trim();
}

export async function selectRadixOption(
  page: Page,
  trigger: Locator,
  optionName: string | RegExp,
): Promise<void> {
  await trigger.click();
  const option = page.getByRole('option', { name: optionName }).last();
  await expect(option).toBeVisible({ timeout: 15_000 });
  await option.click();
}

async function pickComboboxOption(
  page: Page,
  trigger: Locator,
  optionName: string | RegExp,
): Promise<boolean> {
  await trigger.click();
  const searchText = patternToSearchText(optionName);
  const commandInput = page.getByPlaceholder(/search equipment|search by name or sku/i);
  if (await commandInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await commandInput.fill(searchText);
  }

  const option = page.getByRole('option').filter({ hasText: optionName }).first();
  if (await option.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await option.click();
    return true;
  }

  await page.keyboard.press('Escape');
  return false;
}

export async function selectComboboxOption(
  page: Page,
  trigger: Locator,
  optionName: string | RegExp,
): Promise<void> {
  const selected = await pickComboboxOption(page, trigger, optionName);
  if (!selected) {
    throw new Error(`Could not select combobox option: ${String(optionName)}`);
  }
}

export async function fillInputByLabel(
  pageOrLocator: Page | Locator,
  label: string | RegExp,
  value: string,
): Promise<void> {
  const field = pageOrLocator.getByLabel(label, { exact: false });
  await expect(field.first()).toBeVisible({ timeout: 15_000 });
  await field.first().fill(value);
}

async function fillTextControlByLabel(
  pageOrLocator: Page | Locator,
  label: string | RegExp,
  value: string,
): Promise<void> {
  const field = pageOrLocator.getByLabel(label, { exact: false }).first();
  await expect(field).toBeVisible({ timeout: 15_000 });
  await field.click();
  await field.fill('');
  await field.fill(value);
  await field.blur();
}

export async function expectToastOrRecordVisible(
  page: Page,
  text: string | RegExp,
): Promise<void> {
  const searchText = typeof text === 'string' ? text : patternToSearchText(text);
  const escaped = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const search = page.getByPlaceholder(/search equipment|search inventory|search parts/i).first();
  if (await search.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await search.fill(searchText);
  }

  const openDetails = page
    .getByRole('button', { name: new RegExp(`Open details for ${escaped}`, 'i') })
    .first();
  if ((await openDetails.count()) > 0) {
    await expect(openDetails).toBeVisible({ timeout: 60_000 });
    return;
  }

  const record = page.getByText(text).first();
  await expect(record).toBeAttached({ timeout: 60_000 });
}

export async function openAddEquipmentDialog(page: Page): Promise<Locator> {
  const addButton = page.getByRole('button', { name: /add equipment/i }).first();
  await expect(addButton).toBeVisible({ timeout: 30_000 });
  await addButton.click();

  const singleItem = page.getByRole('menuitem', { name: /add single equipment/i });
  if (await singleItem.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await singleItem.click();
  }

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText(/create new equipment/i)).toBeVisible({ timeout: 15_000 });
  return dialog;
}

export async function fillEquipmentDialog(
  dialog: Locator,
  page: Page,
  data: EquipmentCreationData,
): Promise<void> {
  // Autocomplete fields and name need explicit focus/blur so react-hook-form state updates.
  await fillTextControlByLabel(dialog, /^Manufacturer/i, data.manufacturer);
  await fillTextControlByLabel(dialog, /^Model/i, data.model);
  await fillTextControlByLabel(dialog, /^Equipment Name/i, data.name);
  await fillTextControlByLabel(dialog, /^Serial Number/i, data.serialNumber);
  await fillTextControlByLabel(dialog, /^Location Description/i, data.location);
  await fillTextControlByLabel(dialog, /^Installation Date/i, data.installationDate);

  // Status defaults to active; team is optional for owner/admin. Radix selects inside
  // the dialog can dismiss it via onOpenChange, so skip optional selects here.

  if (data.notes) {
    const notes = dialog.getByLabel(/^Notes/i);
    if (await notes.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await notes.fill(data.notes);
    }
  }
}

export async function createEquipmentFromEquipmentPage(
  page: Page,
  gotoDashboard: (route: string) => Promise<void>,
  data: EquipmentCreationData,
): Promise<string> {
  await gotoDashboard('/equipment');
  const dialog = await openAddEquipmentDialog(page);
  await fillEquipmentDialog(dialog, page, data);
  await expect(dialog.getByRole('button', { name: /create equipment/i })).toBeEnabled({
    timeout: 15_000,
  });
  await dialog.getByRole('button', { name: /create equipment/i }).click();
  await expect(dialog).toBeHidden({ timeout: 60_000 });
  await expectToastOrRecordVisible(page, data.name);
  return data.name;
}

export async function openEquipmentDetailByName(page: Page, equipmentName: string): Promise<void> {
  const escaped = equipmentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const search = page.getByPlaceholder(/search equipment/i).first();
  if (await search.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await search.fill(equipmentName);
  }

  const openButton = page
    .getByRole('button', { name: new RegExp(`Open details for ${escaped}`, 'i') })
    .first();
  await expect(openButton).toBeVisible({ timeout: 60_000 });
  await openButton.click();
  await expect(page).toHaveURL(/\/dashboard\/equipment\//, { timeout: 60_000 });
}

export async function assignPmTemplateOnEquipmentDetail(
  page: Page,
  templateName: string | RegExp,
): Promise<void> {
  await page.getByRole('button', { name: /edit pm template/i }).click({ force: true });

  const templateTrigger = page.getByLabel(/^PM Template$/i);
  await expect(templateTrigger).toBeVisible({ timeout: 15_000 });
  await selectRadixOption(page, templateTrigger, templateName);

  const pmRow = page.locator('label').filter({ hasText: /^PM Template$/ }).locator('..');
  await pmRow.getByRole('button', { name: /^Save$/i }).click();

  await expect(page.getByText(templateName).first()).toBeVisible({ timeout: 30_000 });
}

export async function openWorkOrderCreateDialog(page: Page, gotoDashboard: (route: string) => Promise<void>): Promise<Locator> {
  await gotoDashboard('/work-orders');
  await page.reload({ waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: /^Work Orders$/i })).toBeVisible({
    timeout: 60_000,
  });
  await expect(
    page.getByText(/^(Showing all|Showing \d+|No team assignments)/i),
  ).toBeVisible({ timeout: 60_000 });

  const createButton = page.getByTestId('create-work-order-button');
  await expect(createButton).toBeVisible({ timeout: 15_000 });
  await expect(createButton).toBeEnabled();
  await createButton.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: /create work order/i })).toBeVisible({
    timeout: 15_000,
  });
  return dialog;
}

export async function fillWorkOrderBasics(
  dialog: Locator,
  data: { title: string; description: string; dueDate?: string },
): Promise<void> {
  await fillInputByLabel(dialog, /^Title/i, data.title);
  if (data.description) {
    const description = dialog.getByLabel(/^Description/i);
    if (await description.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await description.fill(data.description);
    }
  }
  if (data.dueDate) {
    const dueDate = dialog.getByLabel(/^Due Date/i);
    if (await dueDate.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await dueDate.fill(data.dueDate);
    }
  }
}

function getWorkOrderEquipmentTrigger(dialog: Locator): Locator {
  return dialog.locator('[role="combobox"]').filter({ hasText: /select equipment/i }).first();
}

export async function selectWorkOrderEquipment(
  page: Page,
  dialog: Locator,
  equipmentName: string | RegExp,
  fallbackName?: string | RegExp,
): Promise<void> {
  const selectExistingTab = dialog.getByRole('tab', { name: /select existing/i });
  if (await selectExistingTab.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await selectExistingTab.click();
  }

  const trigger = getWorkOrderEquipmentTrigger(dialog);
  await expect(trigger).toBeVisible({ timeout: 15_000 });

  const selected = await pickComboboxOption(page, trigger, equipmentName);
  if (selected) {
    return;
  }
  if (fallbackName) {
    const fallbackSelected = await pickComboboxOption(page, trigger, fallbackName);
    if (fallbackSelected) {
      return;
    }
  }
  throw new Error(`Could not select work order equipment: ${String(equipmentName)}`);
}

export async function setWorkOrderType(
  dialog: Locator,
  type: 'standard' | 'pm',
): Promise<void> {
  const label = type === 'pm' ? /With PM Checklist/i : /Standard Work Order/i;
  await dialog.getByRole('radio', { name: label }).click();
}

export async function selectPmTemplateIfAvailable(
  page: Page,
  dialog: Locator,
  templateName: string | RegExp,
): Promise<void> {
  const assignedBanner = dialog.getByText(/assigned PM template|uses the assigned PM template/i);
  if (await assignedBanner.isVisible({ timeout: 3_000 }).catch(() => false)) {
    return;
  }

  const templateSection = dialog.locator('div').filter({ has: dialog.getByText(/^Checklist Template$/) });
  const templateTrigger = templateSection.getByRole('combobox');
  if (!(await templateTrigger.isVisible({ timeout: 5_000 }).catch(() => false))) {
    return;
  }
  await selectRadixOption(page, templateTrigger, templateName);
}

export async function submitWorkOrderForm(page: Page, dialog: Locator): Promise<void> {
  const submit = dialog.getByTestId('submit-button').or(dialog.getByRole('button', { name: /create work order/i }));
  await submit.click();

  const confirmHours = page.getByRole('button', { name: /yes, create without hours/i });
  if (await confirmHours.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await confirmHours.click();
  }

  await expect(dialog).toBeHidden({ timeout: 60_000 });
  await expect(page).toHaveURL(/\/dashboard\/work-orders\//, { timeout: 60_000 });
}

export async function openInventoryCreateDialog(page: Page, gotoDashboard: (route: string) => Promise<void>): Promise<Locator> {
  await gotoDashboard('/inventory');
  const addItem = page.getByRole('button', { name: /add item/i }).first();
  await addItem.click();
  const singleItem = page.getByRole('menuitem', { name: /add single item/i });
  if (await singleItem.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await singleItem.click();
  }
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText(/create inventory item/i)).toBeVisible({ timeout: 15_000 });
  return dialog;
}

export async function addInventoryCompatibilityRule(
  dialog: Locator,
  page: Page,
  options: { manufacturer: string; matchType?: string | RegExp; model?: string; status?: string | RegExp },
): Promise<void> {
  const compatibilityHeading = dialog.getByText('Compatibility Rules', { exact: true });
  await compatibilityHeading.scrollIntoViewIfNeeded();
  await expect(compatibilityHeading).toBeVisible({ timeout: 15_000 });

  let manufacturerTrigger = dialog.getByRole('combobox').filter({ hasText: /Select manufacturer/i }).first();
  if ((await manufacturerTrigger.count()) === 0) {
    await dialog.getByRole('button', { name: /add rule/i }).click();
    manufacturerTrigger = dialog.getByRole('combobox').filter({ hasText: /Select manufacturer/i }).first();
  }
  await expect(manufacturerTrigger).toBeVisible({ timeout: 15_000 });

  await selectRadixOption(page, manufacturerTrigger, options.manufacturer);

  if (options.matchType) {
    const matchTrigger = dialog.getByRole('combobox').filter({ hasText: /Specific Model|Any Model|Starts With|Pattern|Unverified|Verified|Deprecated/i }).first();
    await selectRadixOption(page, matchTrigger, options.matchType);
  }

  if (options.model) {
    const modelTrigger = dialog.getByRole('combobox', { name: /select model/i });
    if (await modelTrigger.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await selectRadixOption(page, modelTrigger, options.model);
    }
  }

  if (options.status) {
    const statusTrigger = dialog.getByRole('combobox').filter({ hasText: /Unverified|Verified|Deprecated/i }).last();
    await selectRadixOption(page, statusTrigger, options.status);
  }
}

export async function submitInventoryItemDialog(page: Page, dialog: Locator): Promise<void> {
  await dialog.getByRole('button', { name: /create item/i }).click();
  await expect(dialog).toBeHidden({ timeout: 60_000 });
}
