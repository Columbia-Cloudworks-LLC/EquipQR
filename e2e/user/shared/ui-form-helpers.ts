import { expect, type Locator, type Page } from '@playwright/test';
import type { EquipmentCreationData } from './create-flow-data';
import { clickWithDemoCue, fillWithDemoCue, spotlightLocator } from './page-helpers';

function patternToSearchText(name: string | RegExp): string {
  if (typeof name === 'string') return name;
  return name.source.replace(/\\(.)/g, '$1').replace(/[\\^$.*+?()[\]{}|]/g, '').trim();
}

function labelText(name: string | RegExp): string {
  return patternToSearchText(name) || String(name);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function selectRadixOption(
  page: Page,
  trigger: Locator,
  optionName: string | RegExp,
): Promise<void> {
  await clickWithDemoCue(trigger, `Open ${labelText(optionName)} options`);
  const option = page.getByRole('option', { name: optionName }).last();
  await expect(option).toBeVisible({ timeout: 15_000 });
  await clickWithDemoCue(option, `Select ${labelText(optionName)}`);
}

async function pickWorkOrderEquipmentFromSearchDialog(
  page: Page,
  optionName: string | RegExp,
  searchText: string,
): Promise<boolean> {
  const searchEquipmentButton = page.getByRole('button', { name: /^search equipment$/i });
  if (!(await searchEquipmentButton.isVisible({ timeout: 2_000 }).catch(() => false))) {
    return false;
  }

  await clickWithDemoCue(searchEquipmentButton, 'Open equipment search dialog');
  const dialogSearch = page.getByPlaceholder(/search equipment\.\.\./i);
  await fillWithDemoCue(dialogSearch, `Search for ${searchText}`, searchText);

  const row = page
    .getByRole('button', { name: new RegExp(`select.*${escapeRegExp(searchText)}`, 'i') })
    .filter({ hasText: optionName })
    .first();
  if (await row.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await clickWithDemoCue(row, `Select ${labelText(optionName)} from search`);
    return true;
  }

  await page.keyboard.press('Escape');
  return false;
}

async function pickComboboxOption(
  page: Page,
  trigger: Locator,
  optionName: string | RegExp,
): Promise<boolean> {
  await clickWithDemoCue(trigger, `Open ${labelText(optionName)} picker`);
  const searchText = patternToSearchText(optionName);
  const commandInput = page.getByPlaceholder(/search equipment|search by name or sku/i);
  if (await commandInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await fillWithDemoCue(commandInput, `Search for ${searchText}`, searchText);
  }

  const option = page.getByRole('option').filter({ hasText: optionName }).first();
  if (await option.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await clickWithDemoCue(option, `Select ${labelText(optionName)}`);
    return true;
  }

  await page.keyboard.press('Escape');

  if (await pickWorkOrderEquipmentFromSearchDialog(page, optionName, searchText)) {
    return true;
  }

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
  await fillWithDemoCue(field.first(), `Fill ${labelText(label)}`, value);
}

async function fillTextControlByLabel(
  pageOrLocator: Page | Locator,
  label: string | RegExp,
  value: string,
): Promise<void> {
  const field = pageOrLocator.getByLabel(label, { exact: false }).first();
  await expect(field).toBeVisible({ timeout: 15_000 });
  await spotlightLocator(field, `Fill ${labelText(label)}`);
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
    await fillWithDemoCue(search, `Search for ${searchText}`, searchText);
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
  await clickWithDemoCue(addButton, 'Add equipment');

  const singleItem = page.getByRole('menuitem', { name: /add single equipment/i });
  if (await singleItem.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await clickWithDemoCue(singleItem, 'Add single equipment');
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
      await fillWithDemoCue(notes, 'Fill notes', data.notes);
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
  await clickWithDemoCue(dialog.getByRole('button', { name: /create equipment/i }), 'Create equipment');

  // Admin creates without a team show a confirmation gate after duplicate-serial validation.
  const detailUrl = /\/dashboard\/equipment\/[^/]+$/;
  const continueWithoutTeam = page.getByRole('button', { name: /continue without a team/i });
  const submitOutcome = await Promise.race([
    continueWithoutTeam
      .waitFor({ state: 'visible', timeout: 60_000 })
      .then(() => 'confirmation' as const),
    page.waitForURL(detailUrl, { timeout: 60_000 }).then(() => 'navigation' as const),
  ]);
  if (submitOutcome === 'confirmation') {
    await clickWithDemoCue(continueWithoutTeam, 'Continue without a team');
  }

  await page.waitForURL(detailUrl, { timeout: 60_000 });
  await expect(page.getByRole('heading', { name: data.name, exact: true })).toBeVisible({
    timeout: 30_000,
  });
  return data.name;
}

export async function openEquipmentDetailByName(page: Page, equipmentName: string): Promise<void> {
  const escaped = equipmentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const search = page.getByPlaceholder(/search equipment/i).first();
  await expect(search).toBeVisible({ timeout: 30_000 });
  await fillWithDemoCue(search, `Search for ${equipmentName}`, equipmentName);
  await expect(search).toHaveValue(equipmentName, { timeout: 5_000 });

  const openButton = equipmentOpenButtonForName(page, escaped, { anchored: true });
  await expect(openButton).toBeVisible({ timeout: 60_000 });
  await clickWithDemoCue(openButton, `Open ${equipmentName}`);
  await expect(page).toHaveURL(/\/dashboard\/equipment\//, { timeout: 60_000 });
}

/** Open the first equipment row whose card name matches a partial search term. */
export async function openFirstEquipmentDetailBySearch(page: Page, searchTerm: string): Promise<void> {
  const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const search = page.getByPlaceholder(/search equipment/i).first();
  await expect(search).toBeVisible({ timeout: 30_000 });
  await fillWithDemoCue(search, `Search for ${searchTerm}`, searchTerm);

  const openButton = equipmentOpenButtonForName(page, escaped, { anchored: false });
  await expect(openButton).toBeVisible({ timeout: 60_000 });
  await clickWithDemoCue(openButton, `Open equipment matching ${searchTerm}`);
  await expect(page).toHaveURL(/\/dashboard\/equipment\//, { timeout: 60_000 });
}

function equipmentOpenButtonForName(
  page: Page,
  escapedName: string,
  options: { anchored: boolean },
): Locator {
  // Dense list rows render the whole card as a button whose accessible name
  // starts with the equipment name; legacy layouts used "Open details for X".
  const densePattern = options.anchored
    ? new RegExp(`^${escapedName}`, 'i')
    : new RegExp(escapedName, 'i');
  const cardButton = page.getByRole('button', { name: densePattern }).first();
  const legacyOpenButton = page
    .getByRole('button', { name: new RegExp(`Open details for .*${escapedName}`, 'i') })
    .first();
  return cardButton.or(legacyOpenButton).first();
}

export async function assignPmTemplateOnEquipmentDetail(
  page: Page,
  templateName: string | RegExp,
): Promise<void> {
  // The PM template selector lives at the top of the Work Orders tab (#1169).
  // Mobile renders the tab label as just "Orders".
  await clickWithDemoCue(page.getByRole('tab', { name: /orders/i }), 'Open Work Orders tab', {
    force: true,
  });

  const templateTrigger = page.getByRole('combobox', { name: /^PM Template$/i });
  await expect(templateTrigger).toBeVisible({ timeout: 15_000 });

  // Unlock the dropdown; picking an option saves immediately and re-locks it.
  await clickWithDemoCue(page.getByRole('button', { name: /edit pm template/i }), 'Edit PM template', {
    force: true,
  });
  await expect(templateTrigger).toBeEnabled({ timeout: 15_000 });
  await selectRadixOption(page, templateTrigger, templateName);

  await expect(templateTrigger).toContainText(templateName, { timeout: 30_000 });
  await expect(templateTrigger).toBeDisabled({ timeout: 30_000 });
}

export async function openWorkOrderCreateDialog(page: Page, gotoDashboard: (route: string) => Promise<void>): Promise<Locator> {
  await gotoDashboard('/work-orders');
  await page.reload({ waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: /^Work Orders$/i })).toBeVisible({
    timeout: 60_000,
  });
  await expect(
    page.getByText(/^(Showing all|Showing \d+|No team assignments)/i).first(),
  ).toBeAttached({ timeout: 60_000 });

  const stableCreateButton = page.getByTestId('create-work-order-button');
  const createButton = stableCreateButton.or(page.getByRole('button', { name: /^Create Work Order$/i })).first();
  await expect(createButton).toBeVisible({ timeout: 15_000 });
  await expect(createButton).toBeEnabled();
  await clickWithDemoCue(createButton, 'Create work order');

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
      await fillWithDemoCue(description, 'Fill description', data.description);
    }
  }
  if (data.dueDate) {
    const dueDate = dialog.getByLabel(/^Due Date/i);
    if (await dueDate.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await fillWithDemoCue(dueDate, 'Fill due date', data.dueDate);
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
    await clickWithDemoCue(selectExistingTab, 'Select existing equipment');
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

export async function setPmTemplate(
  page: Page,
  dialog: Locator,
  templateName: string | RegExp | 'none',
): Promise<void> {
  const templateTrigger = dialog.getByRole('combobox', { name: /pm template/i });
  await expect(templateTrigger).toBeVisible({ timeout: 15_000 });
  if (templateName === 'none') {
    await selectRadixOption(page, templateTrigger, /^None$/i);
    return;
  }
  await selectRadixOption(page, templateTrigger, templateName);
}

/** @deprecated Use setPmTemplate instead */
export async function setWorkOrderType(
  dialog: Locator,
  type: 'standard' | 'pm',
): Promise<void> {
  const page = dialog.page();
  const templateTrigger = dialog.getByRole('combobox', { name: /pm template/i });
  await expect(templateTrigger).toBeVisible({ timeout: 15_000 });
  if (type === 'standard') {
    await setPmTemplate(page, dialog, 'none');
    return;
  }
  const currentValue = await templateTrigger.textContent();
  if (currentValue && !/none/i.test(currentValue)) {
    return;
  }
  await selectRadixOption(page, templateTrigger, /forklift pm|excavator pm|compressor pm/i);
}

export async function selectPmTemplateIfAvailable(
  page: Page,
  dialog: Locator,
  templateName: string | RegExp,
): Promise<void> {
  const templateTrigger = dialog.getByRole('combobox', { name: /pm template/i });
  if (!(await templateTrigger.isVisible({ timeout: 5_000 }).catch(() => false))) {
    return;
  }
  await selectRadixOption(page, templateTrigger, templateName);
}

export async function submitWorkOrderForm(page: Page, dialog: Locator): Promise<void> {
  const submit = dialog.getByTestId('submit-button').or(dialog.getByRole('button', { name: /create work order/i }));
  await clickWithDemoCue(submit, 'Submit work order');

  const confirmHours = page.getByRole('button', { name: /yes, create without hours/i });
  if (await confirmHours.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await clickWithDemoCue(confirmHours, 'Create without hours');
  }

  await expect(dialog).toBeHidden({ timeout: 60_000 });
  await expect(page).toHaveURL(/\/dashboard\/work-orders\//, { timeout: 60_000 });
}

export async function openInventoryCreateDialog(page: Page, gotoDashboard: (route: string) => Promise<void>): Promise<Locator> {
  await gotoDashboard('/inventory');
  const addItem = page.getByRole('button', { name: /add item/i }).first();
  await clickWithDemoCue(addItem, 'Add inventory item');
  const singleItem = page.getByRole('menuitem', { name: /add single item/i });
  if (await singleItem.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await clickWithDemoCue(singleItem, 'Add single inventory item');
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
    await clickWithDemoCue(dialog.getByRole('button', { name: /add rule/i }), 'Add compatibility rule');
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
  await clickWithDemoCue(dialog.getByRole('button', { name: /create item/i }), 'Create inventory item');
  await expect(dialog).toBeHidden({ timeout: 60_000 });
}

export async function pickHistoricalStartDate(
  page: Page,
  dialog: Locator,
  options?: { monthsBack?: number; day?: number },
): Promise<void> {
  const monthsBack = options?.monthsBack ?? 1;
  const day = options?.day ?? 10;
  const trigger = dialog.getByRole('button', { name: /pick start date and time/i });
  await clickWithDemoCue(trigger, 'Open historical start date picker');

  const calendarPopover = page
    .locator('[data-state="open"]')
    .filter({ has: page.getByLabel(/^Time:$/i) });
  await expect(calendarPopover).toBeVisible({ timeout: 15_000 });

  const previousMonthButton = calendarPopover.getByRole('button', {
    name: /Go to the Previous Month/i,
  });

  for (let index = 0; index < monthsBack; index += 1) {
    await clickWithDemoCue(previousMonthButton, 'Go to previous month');
  }

  const monthStatus = calendarPopover.getByRole('status');
  await expect(monthStatus).toBeVisible({ timeout: 15_000 });
  const monthLabel = (await monthStatus.textContent())?.trim() ?? '';
  const monthName = monthLabel.split(/\s+/)[0] ?? '';
  const monthGrid = calendarPopover.getByRole('grid', { name: monthLabel });
  await expect(monthGrid).toBeVisible({ timeout: 15_000 });

  const dayPattern = new RegExp(`${escapeRegExp(monthName)} ${day}(?:st|nd|rd|th)?`, 'i');
  const dayButton = monthGrid.getByRole('button', { name: dayPattern }).first();
  await expect(dayButton).toBeVisible({ timeout: 15_000 });
  await clickWithDemoCue(dayButton, `Select ${monthName} ${day}`);
}
