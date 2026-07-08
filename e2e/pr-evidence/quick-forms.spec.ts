import type { Page } from '@playwright/test';
import { test, expect } from '../user/fixtures/equipqr-test';
import { newPersonaPage, pinContextToApex, gotoDashboardRoute } from '../user/shared/auth-helpers';
import { selectRadixOption } from '../user/shared/ui-form-helpers';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

const FORM_NAME = 'Evidence Time Sheet';

/** Remove any leftover evidence form so the spec stays idempotent. */
async function deleteEvidenceFormIfPresent(page: Page): Promise<void> {
  const card = page
    .getByTestId('quick-form-card')
    .filter({ hasText: FORM_NAME })
    .first();
  if ((await card.count()) === 0) return;
  await card.getByRole('button', { name: `Delete ${FORM_NAME}` }).click();
  await page.getByRole('button', { name: /delete form/i }).click();
  await expect(
    page.getByTestId('quick-form-card').filter({ hasText: FORM_NAME }),
  ).toHaveCount(0, { timeout: 15_000 });
}

test.describe.serial('Quick Forms end-to-end @pr-evidence', () => {
  test.beforeEach(async ({ context }) => {
    await pinContextToApex(context);
  });

  test('admin builds a quick form, public user submits, ledger + exports + rotation work (#1184)', async ({
    browser,
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard('/quick-forms');
    await assertHealthyShell();

    await expect(page.getByRole('heading', { level: 1, name: /quick forms/i })).toBeVisible({
      timeout: 30_000,
    });
    await deleteEvidenceFormIfPresent(page);

    // Build the form: three fields covering text / number / checkbox.
    await page.getByRole('button', { name: /new quick form/i }).click();
    const dialog = page.getByRole('dialog', { name: /new quick form/i });
    await expect(dialog).toBeVisible();

    await dialog.getByLabel('Form name').fill(FORM_NAME);
    await dialog.getByLabel(/description/i).fill('Record who worked on site and for how long.');

    await dialog.getByRole('button', { name: /add field/i }).click();
    const rows = dialog.getByTestId('quick-form-field-row');
    await rows.nth(0).getByLabel('Field label').fill('Employee name');

    await dialog.getByRole('button', { name: /add field/i }).click();
    await rows.nth(1).getByLabel('Field label').fill('Hours on site');
    await selectRadixOption(page, rows.nth(1).getByLabel('Type'), /number/i);

    await dialog.getByRole('button', { name: /add field/i }).click();
    await rows.nth(2).getByLabel('Field label').fill('PPE worn');
    await selectRadixOption(page, rows.nth(2).getByLabel('Type'), /checkbox/i);

    await evidencePause(page, 600);
    await evidenceScreenshot(page, '01-admin-form-builder');

    await dialog.getByRole('button', { name: /create form/i }).click();
    await expect(dialog).toBeHidden({ timeout: 15_000 });

    const card = page.getByTestId('quick-form-card').filter({ hasText: FORM_NAME }).first();
    await expect(card).toBeVisible({ timeout: 15_000 });
    await expect(card.getByText(/3 fields/i)).toBeVisible();
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '02-admin-form-card-created');

    // QR link dialog: QR image + copyable public URL.
    await card.getByRole('button', { name: /qr link/i }).click();
    const qrDialog = page.getByRole('dialog', { name: /quick form qr link/i });
    await expect(qrDialog.getByTestId('quick-form-qr-image')).toBeVisible({ timeout: 30_000 });
    const publicUrl =
      (await qrDialog.getByTestId('quick-form-public-url').textContent())?.trim() ?? '';
    expect(publicUrl).toMatch(/\/qr\/quick-form\/[a-f0-9]{64}$/);
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '03-admin-qr-link-dialog');
    await page.keyboard.press('Escape');

    // Public, unauthenticated submission.
    const publicContext = await browser.newContext({
      baseURL: process.env.PR_EVIDENCE_BASE_URL ?? 'http://localhost:8080',
    });
    const publicPage = await publicContext.newPage();
    await publicPage.goto(publicUrl);

    await expect(publicPage.getByRole('heading', { name: FORM_NAME })).toBeVisible({
      timeout: 30_000,
    });
    await expect(publicPage.getByText(/record who worked on site/i)).toBeVisible();
    await evidencePause(publicPage, 600);
    await evidenceScreenshot(publicPage, '04-public-form-loaded');

    await publicPage.getByLabel(/employee name/i).fill('Jane Worker');
    await publicPage.getByLabel(/hours on site/i).fill('8');
    await publicPage.getByLabel(/ppe worn/i).click();
    await publicPage.getByRole('button', { name: /^submit$/i }).click();

    await expect(publicPage.getByText(/submission received/i)).toBeVisible({ timeout: 30_000 });
    await evidencePause(publicPage, 600);
    await evidenceScreenshot(publicPage, '05-public-submission-success');
    await publicContext.close();

    // Admin ledger shows the submission with detail view + exports.
    await gotoDashboard('/quick-forms');
    await assertHealthyShell();
    await page.getByRole('tab', { name: /ledger/i }).click();

    const submissionRow = page
      .getByTestId('quick-form-submission-row')
      .filter({ hasText: 'Jane Worker' })
      .first();
    await expect(submissionRow).toBeVisible({ timeout: 30_000 });

    await submissionRow.getByRole('button', { name: /view submission details/i }).click();
    await expect(page.getByRole('dialog').getByText('Jane Worker')).toBeVisible({
      timeout: 15_000,
    });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '06-admin-ledger-submission-details');
    await page.keyboard.press('Escape');

    for (const [pattern, extension] of [
      [/csv \(\.csv\)/i, 'csv'],
      [/excel \(\.xlsx\)/i, 'xlsx'],
      [/pdf \(\.pdf\)/i, 'pdf'],
    ] as const) {
      await page.getByRole('button', { name: /^export$/i }).click();
      const download = page.waitForEvent('download');
      await page.getByRole('menuitem', { name: pattern }).click();
      expect((await download).suggestedFilename()).toMatch(
        new RegExp(`quick-form-submissions.*\\.${extension}$`),
      );
    }
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '07-admin-ledger-exports');

    // Rotate the QR link: the old link must stop working immediately.
    await page.getByRole('tab', { name: /^forms$/i }).click();
    await card.getByRole('button', { name: /qr link/i }).click();
    await expect(qrDialog.getByTestId('quick-form-qr-image')).toBeVisible({ timeout: 30_000 });
    await qrDialog.getByRole('button', { name: /rotate qr link/i }).click();
    await page.getByRole('button', { name: /rotate link/i }).click();
    await expect(qrDialog.getByText(/rotating/i)).toBeHidden({ timeout: 30_000 });
    const rotatedUrl =
      (await qrDialog.getByTestId('quick-form-public-url').textContent())?.trim() ?? '';
    expect(rotatedUrl).toMatch(/\/qr\/quick-form\/[a-f0-9]{64}$/);
    expect(rotatedUrl).not.toBe(publicUrl);
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '08-admin-rotated-qr-link');
    await page.keyboard.press('Escape');

    const staleContext = await browser.newContext({
      baseURL: process.env.PR_EVIDENCE_BASE_URL ?? 'http://localhost:8080',
    });
    const stalePage = await staleContext.newPage();
    await stalePage.goto(publicUrl);
    await expect(stalePage.getByText(/not available/i)).toBeVisible({ timeout: 30_000 });
    await evidencePause(stalePage, 600);
    await evidenceScreenshot(stalePage, '09-old-link-unavailable-after-rotation');
    await staleContext.close();

    // Deactivating stops submissions on the new link too.
    await page.getByRole('switch', { name: `Toggle ${FORM_NAME} active` }).click();
    await expect(card.getByText(/inactive/i)).toBeVisible({ timeout: 15_000 });

    const inactiveContext = await browser.newContext({
      baseURL: process.env.PR_EVIDENCE_BASE_URL ?? 'http://localhost:8080',
    });
    const inactivePage = await inactiveContext.newPage();
    await inactivePage.goto(rotatedUrl);
    await expect(inactivePage.getByText(/not available/i)).toBeVisible({ timeout: 30_000 });
    await evidencePause(inactivePage, 600);
    await evidenceScreenshot(inactivePage, '10-inactive-form-unavailable');
    await inactiveContext.close();

    // Cleanup: delete the evidence form (also demonstrates delete confirm).
    await deleteEvidenceFormIfPresent(page);
  });
});

test.describe('Quick Forms access @pr-evidence', () => {
  test('non-admin members are denied the quick forms console', async ({ browser }) => {
    const { context, page } = await newPersonaPage(browser, 'technician');
    await pinContextToApex(context);
    await gotoDashboardRoute(page, '/quick-forms');

    await expect(page.getByText(/access denied/i)).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByText(/only available to organization owners and administrators/i),
    ).toBeVisible();

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '11-non-admin-access-denied');
    await context.close();
  });
});
