import { expect, type Page } from '@playwright/test';

export const EVIDENCE_TEMPLATE_NAME = 'Evidence Daily Safety Walkaround';
export const STARTER_TEMPLATE_NAME = 'Odometer Log';

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
): Promise<void> {
  const templateCard = getYourTemplateCard(page, templateName);
  await templateCard.getByRole('button', { name: /assign to equipment/i }).click();

  const assignPanel = page.getByRole('dialog').filter({ hasText: new RegExp(`Assign ${templateName}`, 'i') });
  await expect(assignPanel).toBeVisible({ timeout: 15_000 });
  await assignPanel.getByRole('textbox', { name: /search equipment/i }).fill(equipmentName);

  const equipmentCheckbox = assignPanel.getByRole('checkbox', {
    name: new RegExp(`^${equipmentName} Unit`, 'i'),
  });
  await expect(equipmentCheckbox).toBeVisible({ timeout: 15_000 });
  await assignPanel.getByText(equipmentName, { exact: true }).click();
  await expect(assignPanel.getByText(/1 selected/i)).toBeVisible({ timeout: 15_000 });
  await assignPanel.getByRole('button', { name: /assign checklist/i }).click();
  await expect(assignPanel).toBeHidden({ timeout: 30_000 });

  await templateCard.getByRole('button', { name: /assign to equipment/i }).click();
  const verifyPanel = page.getByRole('dialog').filter({ hasText: new RegExp(`Assign ${templateName}`, 'i') });
  await expect(verifyPanel).toBeVisible({ timeout: 15_000 });
  await expect(verifyPanel.getByText(/^assigned$/i)).toBeVisible({ timeout: 30_000 });
  await page.keyboard.press('Escape');
}

export async function navigateToEquipmentDetails(
  page: Page,
  equipmentId: string,
  equipmentName: string,
  equipmentSerialNumber?: string,
): Promise<void> {
  await page.getByRole('link', { name: /^equipment$/i }).click();
  await expect(page).toHaveURL(/\/dashboard\/equipment\/?$/, { timeout: 30_000 });
  await page.getByRole('textbox', { name: /search equipment/i }).fill(equipmentName);

  const cardPattern = equipmentSerialNumber
    ? new RegExp(`${equipmentName}.*${equipmentSerialNumber}`, 'i')
    : new RegExp(`${equipmentName}`, 'i');
  await page.getByRole('button', { name: cardPattern }).first().click();
  await expect(page).toHaveURL(new RegExp(`/dashboard/equipment/${equipmentId}`), { timeout: 30_000 });
}

async function ensureOperatorCheckinQrLinkReady(page: Page, templateName: string): Promise<void> {
  const generateHint = page.getByText(/open the actions menu to generate a qr link/i);
  if (!(await generateHint.isVisible({ timeout: 2_000 }).catch(() => false))) {
    return;
  }

  const assignmentRow = page
    .locator('.rounded-lg.border.p-4')
    .filter({ hasText: templateName })
    .first();
  await assignmentRow.getByRole('button', { name: /checklist actions/i }).click();
  await page.getByRole('menuitem', { name: /generate qr link|rotate qr link/i }).click();
  await expect(generateHint).toHaveCount(0, { timeout: 30_000 });
  await page.keyboard.press('Escape');
}

export async function openEquipmentCheckinQrDialog(page: Page, templateName: string): Promise<void> {
  await expect(page.getByText(templateName).first()).toBeVisible({ timeout: 30_000 });
  await ensureOperatorCheckinQrLinkReady(page, templateName);

  const assignmentRow = page
    .locator('.rounded-lg.border.p-4')
    .filter({ hasText: templateName })
    .first();
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

export async function fillOdometerLogPublicForm(page: Page): Promise<void> {
  await page.getByLabel(/your name/i).fill('Evidence Operator');
  await page.getByLabel(/odometer reading/i).fill('128450');
  await page.getByLabel(/^notes$/i).fill('PR evidence submission — daily safety walkaround complete.');
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

export async function selectLedgerReportTemplate(page: Page, templateName: string): Promise<void> {
  await page.locator('#report-template-select').click();
  await page.getByRole('option').filter({ hasText: templateName }).click();
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
