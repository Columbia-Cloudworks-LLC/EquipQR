import { test, expect, type Page } from '../user/fixtures/equipqr-test';
import { pinContextToApex } from '../user/shared/auth-helpers';
import { seedEquipment } from '../user/shared/seed-data';
import { evidencePause, evidenceScreenshot } from './shared/evidence-helpers';
import {
  assertEvidenceOperatorCheckinTokenRegistered,
  clearApexOperatorCheckinTokenSecrets,
  resetApexOperatorCheckinEvidence,
} from './shared/operator-checkin-evidence-reset';
import {
  assignTemplateOnEquipmentDetails,
  cloneStarterTemplate,
  expandStarterCatalogIfNeeded,
  extractOperatorCheckinTokenFromQrDialog,
  navigateToEquipmentDetails,
  STARTER_TEMPLATE_NAME,
} from './shared/operator-checkin-evidence-helpers';

function getAssignmentRow(page: Page, templateName: string) {
  return page
    .locator('.rounded-lg.border.p-4')
    .filter({ hasText: templateName })
    .filter({ has: page.getByRole('button', { name: /view qr code/i }) })
    .first();
}

/**
 * Issue #1179 — daily check-in QR link unavailable and "generate" never worked.
 *
 * Legacy assignments (minted before server-side token persistence, #1154) have
 * no stored raw token, and the QR dialog previously only *told* the user to
 * generate a new link elsewhere. This spec reproduces the legacy state by
 * deleting the persisted token secret, then proves an org owner can now
 * generate the link directly inside the QR dialog and that the generated
 * public link actually resolves for operators.
 */
test.describe.serial('Daily check-in QR in-dialog generation (#1179) @pr-evidence', () => {
  test.beforeAll(async () => {
    await resetApexOperatorCheckinEvidence();
  });

  test.beforeEach(async ({ context }) => {
    await pinContextToApex(context);
  });

  test('owner recovers a legacy assignment QR link from the QR dialog', async ({
    browser,
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    // Arrange: template assigned to equipment, then wipe the persisted raw
    // token to reproduce the reporter's pre-#1154 legacy assignments.
    await gotoDashboard('/operator-check-ins');
    await assertHealthyShell();
    await expandStarterCatalogIfNeeded(page);
    await cloneStarterTemplate(page, STARTER_TEMPLATE_NAME);

    await navigateToEquipmentDetails(
      page,
      seedEquipment.cat320.id,
      seedEquipment.cat320.name,
      seedEquipment.cat320.serialNumber,
    );
    await assertHealthyShell();
    await assignTemplateOnEquipmentDetails(page, STARTER_TEMPLATE_NAME);
    await clearApexOperatorCheckinTokenSecrets();
    await page.reload();
    await expect(getAssignmentRow(page, STARTER_TEMPLATE_NAME)).toBeVisible({ timeout: 30_000 });

    await evidencePause(page, 600);
    await evidenceScreenshot(page, '01-legacy-assignment-without-stored-link');

    // Act 1: open the QR dialog straight from View QR code (no actions menu).
    await getAssignmentRow(page, STARTER_TEMPLATE_NAME)
      .getByRole('button', { name: /view qr code/i })
      .click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(new RegExp(`${STARTER_TEMPLATE_NAME} QR Code`, 'i'))).toBeVisible({
      timeout: 30_000,
    });
    await expect(dialog.getByText(/no stored qr link/i)).toBeVisible({ timeout: 30_000 });
    const generateButton = dialog.getByRole('button', { name: /generate qr link/i });
    await expect(generateButton).toBeVisible();

    await evidencePause(page, 600);
    await evidenceScreenshot(page, '02-qr-dialog-offers-generate-link');

    // Act 2: generate the replacement link without leaving the dialog.
    await generateButton.click();
    const mintedToken = await extractOperatorCheckinTokenFromQrDialog(page);
    await expect(dialog.getByText(/no stored qr link/i)).toHaveCount(0);
    await assertEvidenceOperatorCheckinTokenRegistered(mintedToken);

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '03-qr-generated-in-dialog');
    await page.keyboard.press('Escape');

    // Assert: the freshly generated public link resolves for an operator.
    const publicBaseUrl = process.env.PR_EVIDENCE_BASE_URL ?? 'http://localhost:8080';
    const publicContext = await browser.newContext({ baseURL: publicBaseUrl });
    const publicPage = await publicContext.newPage();
    await publicPage.goto(`/qr/operator-check-in/${mintedToken}`);
    await expect(publicPage.getByRole('heading', { name: STARTER_TEMPLATE_NAME })).toBeVisible({
      timeout: 30_000,
    });
    await expect(publicPage.getByLabel(/driver \/ operator name/i)).toBeVisible();

    await evidencePause(publicPage, 600);
    await evidenceScreenshot(publicPage, '04-generated-link-resolves-for-operator');
    await publicContext.close();
  });
});
