import { test, expect } from '../user/fixtures/equipqr-test';
import { pinContextToApex, newPersonaPage, gotoDashboardRoute } from '../user/shared/auth-helpers';
import { seedEquipment } from '../user/shared/seed-data';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';
import { resetApexOperatorCheckinEvidence, assertEvidenceOperatorCheckinTokenRegistered } from './shared/operator-checkin-evidence-reset';
import {
  assignTemplateOnEquipmentDetails,
  cloneStarterTemplate,
  deleteTemplateFromConsole,
  EVIDENCE_TEMPLATE_NAME,
  expandStarterCatalogIfNeeded,
  expectLedgerSubmissionVisible,
  extractOperatorCheckinTokenFromQrDialog,
  fillOdometerLogPublicForm,
  frameEquipmentCheckinAssignment,
  framePublicCheckinAnsweredRow,
  framePublicCheckinChecklistIntro,
  framePublicCheckinResetState,
  getYourTemplateCard,
  navigateToEquipmentDetails,
  openDailyLedgerTab,
  openEquipmentCheckinQrDialog,
  passRemainingPublicChecklistItems,
  renameTemplate,
  resetPublicCheckinForm,
  selectLedgerReportTemplate,
  setShowDeletedCheckins,
  restoreTemplateFromConsole,
  STARTER_TEMPLATE_NAME,
  submitPublicCheckin,
  swipePublicChecklistItem,
} from './shared/operator-checkin-evidence-helpers';

test.describe.serial('Daily operator check-ins end-to-end @pr-evidence', () => {
  test.beforeAll(async () => {
    await resetApexOperatorCheckinEvidence();
  });

  test.beforeEach(async ({ context }) => {
    await pinContextToApex(context);
  });

  test('admin configures template, public operator submits, ledger retains history', async ({
    browser,
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    let publicToken = '';

    await gotoDashboard('/operator-check-ins');
    await assertHealthyShell();

    await expect(page.getByRole('heading', { level: 1, name: /daily check-ins/i })).toBeVisible({
      timeout: 30_000,
    });

    await expandStarterCatalogIfNeeded(page);
    await cloneStarterTemplate(page, STARTER_TEMPLATE_NAME);
    await renameTemplate(page, STARTER_TEMPLATE_NAME, EVIDENCE_TEMPLATE_NAME);

    const templateCard = getYourTemplateCard(page, EVIDENCE_TEMPLATE_NAME);
    await expect(templateCard.getByText(/\d+ data field/i)).toBeVisible({ timeout: 15_000 });
    await expect(templateCard.getByText(/\d+ checklist item/i)).toBeVisible({ timeout: 15_000 });

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '01-admin-templates-real-template');

    await navigateToEquipmentDetails(
      page,
      seedEquipment.cat320.id,
      seedEquipment.cat320.name,
      seedEquipment.cat320.serialNumber,
    );
    await assertHealthyShell();
    await assignTemplateOnEquipmentDetails(page, EVIDENCE_TEMPLATE_NAME);
    await frameEquipmentCheckinAssignment(page, EVIDENCE_TEMPLATE_NAME);
    await evidencePause(page, 800);
    await evidenceScreenshot(page, '02-admin-template-assigned-equipment');
    await openEquipmentCheckinQrDialog(page, EVIDENCE_TEMPLATE_NAME);

    publicToken = await extractOperatorCheckinTokenFromQrDialog(page);
    await assertEvidenceOperatorCheckinTokenRegistered(publicToken);
    await evidencePause(page, 800);
    await evidenceScreenshot(page, '03-equipment-checkin-card-qr-ready');
    await page.keyboard.press('Escape');

    const publicBaseUrl = process.env.PR_EVIDENCE_BASE_URL ?? 'http://localhost:8080';
    const publicContext = await browser.newContext({ baseURL: publicBaseUrl });
    const publicPage = await publicContext.newPage();

    await publicPage.goto(`/qr/operator-check-in/${publicToken}`);
    await expect(publicPage.getByRole('heading', { name: EVIDENCE_TEMPLATE_NAME })).toBeVisible({
      timeout: 30_000,
    });
    await expect(publicPage.getByText(/does not certify legal or regulatory compliance/i)).toBeVisible();
    await expect(publicPage.getByLabel(/driver \/ operator name/i)).toBeVisible();
    await expect(publicPage.getByText(/swipe right for pass, left for fail/i)).toBeVisible();

    await framePublicCheckinChecklistIntro(publicPage);
    await evidencePause(publicPage, 800);
    await evidenceScreenshot(publicPage, '04-public-operator-form-loaded');

    await fillOdometerLogPublicForm(publicPage);
    await swipePublicChecklistItem(publicPage, 'Service brakes operate correctly', 'pass');
    await swipePublicChecklistItem(publicPage, 'Headlights and tail lights working', 'fail');

    await framePublicCheckinAnsweredRow(publicPage, 'Headlights and tail lights working', 'fail');
    await evidencePause(publicPage, 800);
    await evidenceScreenshot(publicPage, '05-public-operator-swipe-answers');

    await resetPublicCheckinForm(publicPage);
    await expect(publicPage.getByText(/not checked/i).first()).toBeVisible({ timeout: 15_000 });

    await framePublicCheckinResetState(publicPage);
    await evidencePause(publicPage, 800);
    await evidenceScreenshot(publicPage, '06-public-operator-form-reset');

    await fillOdometerLogPublicForm(publicPage);
    await passRemainingPublicChecklistItems(publicPage);
    await submitPublicCheckin(publicPage);

    await evidencePause(publicPage, 800);
    await evidenceScreenshot(publicPage, '07-public-operator-submission-success');
    await publicContext.close();

    await gotoDashboard('/operator-check-ins');
    await openDailyLedgerTab(page);
    await selectLedgerReportTemplate(page, EVIDENCE_TEMPLATE_NAME);
    await expectLedgerSubmissionVisible(page, 'Evidence Operator', seedEquipment.cat320.name);

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '08-admin-ledger-submission-visible');

    await page.getByRole('button', { name: /^export$/i }).click();
    const exportDialog = page.getByRole('dialog');
    await expect(exportDialog.getByText(/export daily report/i)).toBeVisible({
      timeout: 15_000,
    });
    await expect(exportDialog.getByText(/pdf|excel|xlsx/i).first()).toBeVisible();

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '09-admin-export-dialog');
    await page.keyboard.press('Escape');

    await deleteTemplateFromConsole(page, EVIDENCE_TEMPLATE_NAME);

    await openDailyLedgerTab(page);
    await setShowDeletedCheckins(page, true);
    await selectLedgerReportTemplate(page, `${EVIDENCE_TEMPLATE_NAME} (deleted)`);
    await expectLedgerSubmissionVisible(page, 'Evidence Operator', seedEquipment.cat320.name);

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '10-deleted-template-retained-in-ledger');

    const disabledContext = await browser.newContext({ baseURL: publicBaseUrl });
    const disabledPage = await disabledContext.newPage();
    await disabledPage.goto(`/qr/operator-check-in/${publicToken}`);
    await expect(disabledPage.getByText(/not available/i)).toBeVisible({ timeout: 30_000 });

    await evidencePause(disabledPage, 800);
    await evidenceScreenshot(disabledPage, '11-invalid-or-disabled-public-token-unavailable');
    await disabledContext.close();

    await restoreTemplateFromConsole(page, EVIDENCE_TEMPLATE_NAME);

    await openDailyLedgerTab(page);
    await setShowDeletedCheckins(page, false);
    await page.locator('#report-template-select').click();
    await expect(page.getByRole('option', { name: EVIDENCE_TEMPLATE_NAME })).toBeVisible({
      timeout: 15_000,
    });
    await page.keyboard.press('Escape');

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '12-restored-template-active-in-ledger-picker', {
      target: page.locator('#report-template-select'),
    });
  });
});

test.describe('Daily operator check-ins access @pr-evidence', () => {
  test('technician cannot manage daily check-ins console', async ({ browser }) => {
    const { context, page } = await newPersonaPage(browser, 'technician');
    await pinContextToApex(context);
    await gotoDashboardRoute(page, '/operator-check-ins');

    await expect(
      page.getByText(/only organization owners and administrators can manage operator daily check-ins/i),
    ).toBeVisible({ timeout: 30_000 });

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '13-non-admin-management-denied', {
      target: page.getByText(
        /only organization owners and administrators can manage operator daily check-ins/i,
      ),
    });
    await context.close();
  });
});
