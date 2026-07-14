import { expect, type Page } from '@playwright/test';

export const EVIDENCE_TEMPLATE_NAME = 'Evidence Daily Safety Walkaround';
export const STARTER_TEMPLATE_NAME = 'FMCSA-style DVIR starter';

function yourTemplatesGrid(page: Page) {
  return page
    .getByRole('heading', { name: /^your templates$/i })
    .locator('..')
    .locator('..')
    .locator('div.grid');
}

export function getYourTemplateCard(page: Page, templateName: string) {
  return yourTemplatesGrid(page).locator('> div').filter({ hasText: templateName }).first();
}

export async function expandStarterCatalogIfNeeded(page: Page): Promise<void> {
  const catalogTrigger = page.getByRole('button', { name: /starter template catalog/i });
  if (await catalogTrigger.isVisible({ timeout: 5_000 }).catch(() => false)) {
    const expanded = await catalogTrigger.getAttribute('aria-expanded');
    if (expanded !== 'true') {
      await catalogTrigger.click();
    }
  }
}

export async function cloneStarterTemplate(page: Page, starterName: string): Promise<void> {
  await expandStarterCatalogIfNeeded(page);
  const starterCard = page.locator('.border-dashed').filter({ hasText: starterName });
  await expect(starterCard).toBeVisible({ timeout: 30_000 });
  await starterCard.getByRole('button', { name: /clone template/i }).click();

  const yourTemplateCard = getYourTemplateCard(page, starterName);
  await expect(yourTemplateCard.getByRole('button', { name: /^edit$/i })).toBeVisible({
    timeout: 30_000,
  });
}

export async function renameTemplate(
  page: Page,
  currentName: string,
  nextName: string,
): Promise<void> {
  const templateCard = getYourTemplateCard(page, currentName);
  await templateCard.getByRole('button', { name: /^edit$/i }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  await dialog.locator('#template-name').fill(nextName);
  await dialog.getByRole('button', { name: /^save$/i }).click();
  await expect(dialog).toBeHidden({ timeout: 30_000 });
  await expect(getYourTemplateCard(page, nextName)).toBeVisible({
    timeout: 30_000,
  });
}

export async function assignTemplateToEquipment(
  page: Page,
  templateName: string,
  equipmentName: string,
  equipmentSerialNumber?: string,
): Promise<void> {
  const templateCard = getYourTemplateCard(page, templateName);
  await templateCard.getByRole('button', { name: /assign to equipment/i }).click();

  const assignPanel = page
    .locator('[data-radix-popper-content-wrapper]')
    .filter({ hasText: new RegExp(`Assign ${templateName}`, 'i') });
  await expect(assignPanel).toBeVisible({ timeout: 15_000 });
  await assignPanel.getByRole('textbox', { name: /search equipment/i }).fill(equipmentName);

  const checkboxPattern = equipmentSerialNumber
    ? new RegExp(`^${equipmentName} Unit ${equipmentSerialNumber}`, 'i')
    : new RegExp(`^${equipmentName} Unit`, 'i');
  const equipmentCheckbox = assignPanel.getByRole('checkbox', {
    name: checkboxPattern,
  });
  await expect(equipmentCheckbox).toBeVisible({ timeout: 15_000 });
  await equipmentCheckbox.check();
  await expect(equipmentCheckbox).toBeChecked({ timeout: 15_000 });
  await expect(assignPanel.getByText(/1 selected/i)).toBeVisible({ timeout: 15_000 });
  await assignPanel.getByRole('button', { name: /assign checklist/i }).scrollIntoViewIfNeeded();
  await assignPanel.getByRole('button', { name: /assign checklist/i }).click();
  await expect(assignPanel).toBeHidden({ timeout: 30_000 });
}

function getOperatorCheckinAssignmentRow(page: Page, templateName: string) {
  return page
    .locator('ul.divide-y > li')
    .filter({ hasText: templateName })
    .filter({ has: page.getByRole('button', { name: /view qr code/i }) })
    .first();
}

/** Assigns a template from the equipment Check-Ins tab multi-select menu. */
export async function assignTemplateOnEquipmentDetails(
  page: Page,
  templateName: string,
): Promise<void> {
  await page.getByRole('tab', { name: /check-ins/i }).click();
  await page.getByRole('button', { name: /assign checklists/i }).click();

  const assignPanel = page
    .locator('[data-radix-popper-content-wrapper]')
    .filter({ hasText: /Assign checklists to/i });
  await expect(assignPanel).toBeVisible({ timeout: 15_000 });

  const templateCheckbox = assignPanel.getByRole('checkbox', {
    name: new RegExp(`^${templateName}`, 'i'),
  });
  await expect(templateCheckbox).toBeVisible({ timeout: 15_000 });
  await templateCheckbox.check();
  await expect(templateCheckbox).toBeChecked({ timeout: 15_000 });

  await assignPanel.getByRole('button', { name: /assign checklist/i }).click();
  await expect(getOperatorCheckinAssignmentRow(page, templateName)).toBeVisible({
    timeout: 30_000,
  });
}

export async function navigateToEquipmentDetails(
  page: Page,
  equipmentId: string,
  equipmentName: string,
  _equipmentSerialNumber?: string,
): Promise<void> {
  await page.goto(`/dashboard/equipment/${equipmentId}`);
  await expect(page).toHaveURL(new RegExp(`/dashboard/equipment/${equipmentId}`), { timeout: 30_000 });
  await expect(page.getByRole('heading', { name: new RegExp(equipmentName, 'i') }).first()).toBeVisible({
    timeout: 30_000,
  });
}

async function ensureOperatorCheckinQrLinkReady(page: Page, templateName: string): Promise<void> {
  const generateHint = page.getByText(/open the actions menu to generate a qr link/i);
  if (!(await generateHint.isVisible({ timeout: 2_000 }).catch(() => false))) {
    return;
  }

  const assignmentRow = getOperatorCheckinAssignmentRow(page, templateName);
  await assignmentRow.getByRole('button', { name: /checklist actions/i }).click();
  await page.getByRole('menuitem', { name: /generate qr link|rotate qr link/i }).click();
  await expect(generateHint).toHaveCount(0, { timeout: 30_000 });
  await page.keyboard.press('Escape');
}

export async function openEquipmentCheckinQrDialog(page: Page, templateName: string): Promise<void> {
  await expect(page.getByText(templateName).first()).toBeVisible({ timeout: 30_000 });
  await ensureOperatorCheckinQrLinkReady(page, templateName);

  const assignmentRow = getOperatorCheckinAssignmentRow(page, templateName);
  await assignmentRow.getByRole('button', { name: /view qr code/i }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText(new RegExp(`${templateName} QR Code`, 'i'))).toBeVisible({
    timeout: 30_000,
  });
}

export async function extractOperatorCheckinTokenFromQrDialog(page: Page): Promise<string> {
  const urlBlock = page.locator('span:text-is("QR Code URL:")').locator('..').locator('.font-mono');
  await expect(urlBlock).toBeVisible({ timeout: 30_000 });
  const url = ((await urlBlock.textContent()) ?? '').replace(/\s+/g, '').trim();
  const match = url.match(/\/qr\/operator-check-in\/([^/?#\s]+)/);
  if (!match?.[1]) {
    throw new Error(`Could not parse operator check-in token from QR URL: ${url}`);
  }
  const token = decodeURIComponent(match[1]);
  if (token.length < 32 || token.length > 128) {
    throw new Error(`Parsed operator check-in token has unexpected length (${token.length})`);
  }
  return token;
}

function getPublicCheckinChecklistRow(page: Page, itemTitle?: string) {
  const rows = page.locator('[data-testid^="checklist-item-row-"]');
  return itemTitle ? rows.filter({ hasText: itemTitle }).first() : rows.first();
}

/** Scrolls the mobile public checklist UI into the viewport for PR evidence screenshots. */
export async function framePublicCheckinChecklistIntro(page: Page): Promise<void> {
  const swipeHint = page.getByText(/swipe right for pass, left for fail/i);
  const firstRow = getPublicCheckinChecklistRow(page);
  await firstRow.scrollIntoViewIfNeeded();
  await expect(firstRow.getByRole('button', { name: /^pass:/i })).toBeVisible({ timeout: 15_000 });
  await swipeHint.evaluate((element) => element.scrollIntoView({ block: 'start', inline: 'nearest' }));
  await page.waitForTimeout(400);
}

/** Centers a checklist row that shows Pass/Fail state after swiping. */
export async function framePublicCheckinAnsweredRow(
  page: Page,
  itemTitle: string,
  expectedStatus: 'pass' | 'fail',
): Promise<void> {
  const row = getPublicCheckinChecklistRow(page, itemTitle);
  await row.scrollIntoViewIfNeeded();
  await expect(row.locator('[data-testid^="checklist-item-status-"]')).toHaveText(
    new RegExp(`^${expectedStatus}$`, 'i'),
    { timeout: 15_000 },
  );
  await row.evaluate((element) => element.scrollIntoView({ block: 'center', inline: 'nearest' }));
  await page.waitForTimeout(400);
}

/** Centers a cleared checklist row and the reset affordance after reset. */
export async function framePublicCheckinResetState(page: Page): Promise<void> {
  const firstRow = getPublicCheckinChecklistRow(page);
  await firstRow.scrollIntoViewIfNeeded();
  await expect(firstRow.locator('[data-testid^="checklist-item-status-"]')).toHaveText(/^not checked$/i, {
    timeout: 15_000,
  });
  await expect(firstRow.getByRole('button', { name: /^pass:/i })).toBeVisible();
  await firstRow.evaluate((element) => element.scrollIntoView({ block: 'center', inline: 'nearest' }));
  await page.waitForTimeout(400);
}

/** Scrolls the equipment assignment card into view for admin evidence. */
export async function frameEquipmentCheckinAssignment(page: Page, templateName: string): Promise<void> {
  const assignmentRow = getOperatorCheckinAssignmentRow(page, templateName);
  await assignmentRow.scrollIntoViewIfNeeded();
  await expect(assignmentRow.getByRole('button', { name: /view qr code/i })).toBeVisible({
    timeout: 15_000,
  });
  await assignmentRow.evaluate((element) => element.scrollIntoView({ block: 'center', inline: 'nearest' }));
  await page.waitForTimeout(400);
}

export async function fillOdometerLogPublicForm(page: Page): Promise<void> {
  await page.getByLabel(/driver \/ operator name/i).fill('Evidence Operator');
  const odometerField = page.getByLabel(/odometer reading/i);
  if (await odometerField.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await odometerField.fill('128450');
  }
}

async function dispatchChecklistRowSwipe(
  row: ReturnType<Page['locator']>,
  direction: 'pass' | 'fail',
): Promise<void> {
  const startRatio = direction === 'pass' ? 0.15 : 0.85;
  const endRatio = direction === 'pass' ? 0.85 : 0.15;
  await row.evaluate(
    (element, ratios) => {
      const rect = element.getBoundingClientRect();
      const y = rect.top + rect.height / 2;
      const startX = rect.left + rect.width * ratios.startRatio;
      const endX = rect.left + rect.width * ratios.endRatio;
      const pointerId = 1;
      const pointerInit = {
        clientX: startX,
        clientY: y,
        pointerId,
        button: 0,
        bubbles: true,
        cancelable: true,
        composed: true,
        pointerType: 'touch',
        isPrimary: true,
      } as PointerEventInit;

      element.dispatchEvent(new PointerEvent('pointerdown', { ...pointerInit, buttons: 1 }));
      element.dispatchEvent(
        new PointerEvent('pointermove', { ...pointerInit, clientX: endX, buttons: 1 }),
      );
      element.dispatchEvent(
        new PointerEvent('pointerup', { ...pointerInit, clientX: endX, buttons: 0 }),
      );
    },
    { startRatio, endRatio },
  );
}

export async function swipePublicChecklistItem(
  page: Page,
  itemTitle: string,
  direction: 'pass' | 'fail',
): Promise<void> {
  const row = getPublicCheckinChecklistRow(page, itemTitle);
  await row.scrollIntoViewIfNeeded();
  await expect(row).toBeVisible({ timeout: 15_000 });
  await dispatchChecklistRowSwipe(row, direction);

  const expectedStatus = direction === 'pass' ? /^pass$/i : /^fail$/i;
  await expect(row.locator('[data-testid^="checklist-item-status-"]')).toHaveText(expectedStatus, {
    timeout: 10_000,
  });
}

export async function passRemainingPublicChecklistItems(page: Page): Promise<void> {
  const rows = page.locator('[data-testid^="checklist-item-row-"]');
  const rowCount = await rows.count();
  for (let index = 0; index < rowCount; index += 1) {
    const row = rows.nth(index);
    const status = row.locator('[data-testid^="checklist-item-status-"]');
    if (await status.filter({ hasText: /^not checked$/i }).count()) {
      await row.scrollIntoViewIfNeeded();
      await dispatchChecklistRowSwipe(row, 'pass');
      await expect(status).toHaveText(/^pass$/i, { timeout: 10_000 });
    }
  }
  await expect(page.getByText(/^not checked$/i)).toHaveCount(0, { timeout: 15_000 });
}

export async function resetPublicCheckinForm(page: Page): Promise<void> {
  await page.getByRole('button', { name: /reset form/i }).click();
  await expect(page.getByLabel(/driver \/ operator name/i)).toHaveValue('');
}

export async function submitPublicCheckin(page: Page): Promise<void> {
  const submitButton = page.getByRole('button', { name: /submit daily check-in/i });
  await expect(submitButton).toBeEnabled({ timeout: 30_000 });
  await submitButton.click();
  await expect(page.getByText(/check-in complete/i)).toBeVisible({
    timeout: 30_000,
  });
}

export async function openDailyLedgerTab(page: Page): Promise<void> {
  await page.getByRole('tab', { name: /daily ledger/i }).click();
  await expect(page.getByLabel(/^report template$/i)).toBeVisible({ timeout: 30_000 });
}

export async function setShowDeletedCheckins(page: Page, enabled: boolean): Promise<void> {
  const toggle = page.getByRole('switch', { name: /show deleted check-ins/i }).first();
  await expect(toggle).toBeVisible({ timeout: 15_000 });
  const isChecked = await toggle.isChecked();
  if (isChecked !== enabled) {
    await toggle.click();
  }
  if (enabled) {
    await expect(toggle).toBeChecked({ timeout: 15_000 });
  } else {
    await expect(toggle).not.toBeChecked({ timeout: 15_000 });
  }
}

export async function selectLedgerReportTemplate(page: Page, templateName: string): Promise<void> {
  await page.locator('#report-template-select').click();
  const listbox = page.getByRole('listbox');
  await listbox.getByRole('option', { name: templateName, exact: true }).click();
  await expect(page.getByText(/loading ledger/i)).toHaveCount(0, { timeout: 30_000 });
}

export async function expectLedgerSubmissionVisible(
  page: Page,
  operatorName: string,
  equipmentName: string,
): Promise<void> {
  const desktopTable = page.getByTestId('ledger-desktop-table');
  await expect(desktopTable.getByText(operatorName).first()).toBeVisible({ timeout: 30_000 });
  await expect(desktopTable.getByText(equipmentName).first()).toBeVisible({ timeout: 30_000 });
}

export async function deleteTemplateFromConsole(page: Page, templateName: string): Promise<void> {
  await page.getByRole('tab', { name: /^templates$/i }).click();
  const templateCard = getYourTemplateCard(page, templateName);
  await templateCard.getByRole('button', { name: /^delete$/i }).click();

  const dialog = page.getByRole('alertdialog');
  await expect(dialog.getByRole('heading', { name: /delete template/i })).toBeVisible({
    timeout: 15_000,
  });
  await dialog.getByRole('button', { name: /delete template/i }).click();
  await expect(dialog).toBeHidden({ timeout: 30_000 });
  await expect(getYourTemplateCard(page, templateName)).toHaveCount(0, { timeout: 30_000 });
}

export async function restoreTemplateFromConsole(page: Page, templateName: string): Promise<void> {
  await setShowDeletedCheckins(page, true);
  await page.getByRole('tab', { name: /^templates$/i }).click();
  const deletedCard = page
    .getByRole('heading', { name: /^deleted check-ins$/i })
    .locator('..')
    .locator('..')
    .locator('div.grid')
    .locator('> div')
    .filter({ hasText: templateName })
    .first();
  await expect(deletedCard).toBeVisible({ timeout: 30_000 });
  await deletedCard.getByRole('button', { name: /^restore$/i }).click();
  await expect(getYourTemplateCard(page, templateName)).toBeVisible({ timeout: 30_000 });
}
