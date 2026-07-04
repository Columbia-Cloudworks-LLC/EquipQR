import { test, expect } from '../user/fixtures/equipqr-test';
import { pinContextToApex } from '../user/shared/auth-helpers';
import { seedEquipment } from '../user/shared/seed-data';
import { evidenceScreenshot, evidencePause, assertDocsDevServerReady } from './shared/evidence-helpers';
import { resetApexOperatorCheckinEvidence } from './shared/operator-checkin-evidence-reset';
import {
  assignTemplateToEquipment,
  cloneStarterTemplate,
  EVIDENCE_TEMPLATE_NAME,
  expandStarterCatalogIfNeeded,
  extractOperatorCheckinTokenFromQrDialog,
  navigateToEquipmentDetails,
  openEquipmentCheckinQrDialog,
  renameTemplate,
  STARTER_TEMPLATE_NAME,
} from './shared/operator-checkin-evidence-helpers';

const DOCS_BASE = process.env.PR_EVIDENCE_DOCS_URL ?? 'http://localhost:5174';
const OPERATOR_GUIDE_PATH = '/support/administration/operator-daily-check-ins';

test.describe.serial('Daily operator check-in docs discovery @pr-evidence', () => {
  let publicToken = '';

  test.beforeAll(async ({ request }) => {
    await resetApexOperatorCheckinEvidence();
    await assertDocsDevServerReady(request);
  });

  test.beforeEach(async ({ context }) => {
    await pinContextToApex(context);
  });

  test('users can discover the operator guide from app surfaces and Help Center', async ({
    page,
    gotoDashboard,
    assertHealthyShell,
  }) => {
    await gotoDashboard('/operator-check-ins');
    await assertHealthyShell();

    const adminHelpLink = page.getByRole('link', {
      name: /learn how daily operator check-ins work/i,
    });
    await expect(adminHelpLink).toBeVisible({ timeout: 30_000 });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '01-admin-console-help-link');

    const docsPopupPromise = page.context().waitForEvent('page');
    await adminHelpLink.click();
    const docsFromAdmin = await docsPopupPromise;
    await docsFromAdmin.waitForLoadState('domcontentloaded');
    await expect(docsFromAdmin).toHaveURL(/\/support\/administration\/operator-daily-check-ins$/);
    await expect(
      docsFromAdmin.getByRole('heading', { name: /daily operator check-ins/i }).first(),
    ).toBeVisible({ timeout: 30_000 });
    await evidencePause(docsFromAdmin, 600);
    await evidenceScreenshot(docsFromAdmin, '02-admin-console-docs-opened');
    await docsFromAdmin.close();

    await expandStarterCatalogIfNeeded(page);
    await cloneStarterTemplate(page, STARTER_TEMPLATE_NAME);
    await renameTemplate(page, STARTER_TEMPLATE_NAME, EVIDENCE_TEMPLATE_NAME);
    await assignTemplateToEquipment(page, EVIDENCE_TEMPLATE_NAME, seedEquipment.cat320.name);

    await navigateToEquipmentDetails(
      page,
      seedEquipment.cat320.id,
      seedEquipment.cat320.name,
      seedEquipment.cat320.serialNumber,
    );
    await assertHealthyShell();

    const equipmentHelpLink = page.getByRole('link', {
      name: /setup, qr placement, and assignment guide/i,
    });
    await expect(equipmentHelpLink).toBeVisible({ timeout: 30_000 });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '03-equipment-details-help-link');

    await openEquipmentCheckinQrDialog(page, EVIDENCE_TEMPLATE_NAME);
    const qrHelpLink = page.getByRole('link', {
      name: /daily check-in qr placement and printing guide/i,
    });
    await expect(qrHelpLink).toBeVisible({ timeout: 15_000 });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '04-qr-dialog-help-link');

    publicToken = await extractOperatorCheckinTokenFromQrDialog(page);
    await page.keyboard.press('Escape');

    const publicPage = await page.context().newPage();
    await publicPage.goto(`/qr/operator-check-in/${publicToken}`);
    await expect(publicPage.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 30_000 });

    const publicHelpLink = publicPage.getByRole('link', {
      name: /what is a daily operator check-in/i,
    });
    await expect(publicHelpLink).toBeVisible({ timeout: 15_000 });
    await evidencePause(publicPage, 600);
    await evidenceScreenshot(publicPage, '05-public-checkin-help-link');
    await publicPage.close();

    const helpCenterPage = await page.context().newPage();
    await helpCenterPage.goto(`${DOCS_BASE}/support/`);
    await expect(helpCenterPage.getByRole('heading', { name: /equipqr help center/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(helpCenterPage.getByRole('link', { name: /administration/i }).first()).toBeVisible({
      timeout: 15_000,
    });
    await evidencePause(helpCenterPage, 600);
    await evidenceScreenshot(helpCenterPage, '06-help-center-category-visible');

    await helpCenterPage.goto(`${DOCS_BASE}${OPERATOR_GUIDE_PATH}`);
    await expect(
      helpCenterPage.getByRole('heading', { name: /service truck mileage log/i }).first(),
    ).toBeVisible({ timeout: 30_000 });
    await evidencePause(helpCenterPage, 600);
    await evidenceScreenshot(helpCenterPage, '07-docs-mileage-scenario-visible');

    await expect(
      helpCenterPage.getByText(/does not have to be physically affixed to the machine/i).first(),
    ).toBeVisible({ timeout: 15_000 });
    await evidencePause(helpCenterPage, 600);
    await evidenceScreenshot(helpCenterPage, '08-docs-qr-placement-guidance-visible');
    await helpCenterPage.close();
  });
});
