import { test, expect } from '../user/fixtures/equipqr-test';
import { newPersonaPage, gotoDashboardRoute, pinContextToApex } from '../user/shared/auth-helpers';
import { metroOrgId, seedEquipment, seedWorkOrders } from '../user/shared/seed-data';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';
import { solveHcaptchaIfPresent } from '../user/shared/hcaptcha-helpers';
import { assertEvidenceOperatorCheckinTokenRegistered } from './shared/operator-checkin-evidence-reset';
import {
  assignTemplateOnEquipmentDetails,
  cloneStarterTemplate,
  deleteTemplateFromConsole,
  expandStarterCatalogIfNeeded,
  extractOperatorCheckinTokenFromQrDialog,
  fillOdometerLogPublicForm,
  getYourTemplateCards,
  navigateToEquipmentDetails,
  openEquipmentCheckinQrDialog,
  passRemainingPublicChecklistItems,
  renameTemplate,
  removeAssignedChecklistsNamed,
  STARTER_TEMPLATE_NAME,
  submitPublicCheckin,
} from './shared/operator-checkin-evidence-helpers';

const METRO_RENTAL_FLEET_TEAM_ID = '880e8400-e29b-41d4-a716-446655440002';
const FORM_NAME = 'RT-03 Throttle Guard';
const CHECKIN_TEMPLATE_NAME = 'RT-02 Same-Day Guard';

test.describe('Red-team findings user-visible fixes @pr-evidence', () => {
  test('Apex owner cannot open a Metro team UUID (RT-13)', async ({ browser }) => {
    const { context, page } = await newPersonaPage(browser, 'owner');

    await gotoDashboardRoute(page, `/teams/${METRO_RENTAL_FLEET_TEAM_ID}`);
    await expect(page.getByRole('heading', { name: /team not found/i })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText(/edit team/i)).toHaveCount(0);
    await expect(page.getByText(/@metro\.test/i)).toHaveCount(0);

    const notFoundCard = page.getByText(/team not found/i).first();
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '01-apex-owner-metro-team-not-found', { target: notFoundCard });

    await context.close();
  });

  test('Metro viewer All teams excludes Rental Fleet (RT-19)', async ({ browser }) => {
    const { context, page } = await newPersonaPage(browser, 'owner', { pinOrgId: metroOrgId });

    await gotoDashboardRoute(page, '/');
    await expect(page.getByText(/total equipment/i).first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/genie s-65 telescopic boom/i)).toHaveCount(0);
    await expect(page.getByText(/genies652023012/i)).toHaveCount(0);
    await expect(page.getByText(/genie2669sl2024002/i)).toHaveCount(0);
    await expect(page.getByText(/pre-rental inspection/i)).toHaveCount(0);

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '02-metro-viewer-dashboard-team-scoped', {
      target: page.getByText(/total equipment/i).first(),
    });

    await gotoDashboardRoute(page, `/work-orders/${seedWorkOrders.assigned.id}`);
    await expect(page.getByRole('heading', { name: /pre-rental inspection/i })).toHaveCount(0);
    await expect(page).toHaveURL(/\/dashboard\/work-orders\/?(\?|$)/, { timeout: 30_000 });

    await evidencePause(page, 600);
    await evidenceScreenshot(page, '03-metro-viewer-rental-fleet-wo-forbidden', {
      target: page.getByRole('main'),
    });

    await context.close();
  });

  test('privacy request details and name have length caps (RT-06)', async ({ page }) => {
    await page.goto('/privacy-request');
    await expect(page.getByLabel(/full name/i)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByLabel(/full name/i)).toHaveAttribute('maxlength', '200');
    await expect(page.getByLabel(/additional details/i)).toHaveAttribute('maxlength', '4000');

    await evidencePause(page, 500);
    await evidenceScreenshot(page, '04-privacy-request-length-caps', {
      target: page.getByLabel(/additional details/i),
    });
  });

  test('public quick form cooldown rejects an immediate second submit (RT-03)', async ({
    browser,
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard('/quick-forms');
    await assertHealthyShell();

    const leftover = page.getByTestId('quick-form-card').filter({ hasText: FORM_NAME }).first();
    if ((await leftover.count()) > 0) {
      await leftover.getByRole('button', { name: `Delete ${FORM_NAME}` }).click();
      await page.getByRole('button', { name: /delete form/i }).click();
      await expect(
        page.getByTestId('quick-form-card').filter({ hasText: FORM_NAME }),
      ).toHaveCount(0, { timeout: 15_000 });
    }

    await page.getByRole('button', { name: /new quick form/i }).click();
    const dialog = page.getByRole('dialog', { name: /new quick form/i });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Form name').fill(FORM_NAME);
    await dialog.getByRole('button', { name: /add field/i }).click();
    await dialog.getByTestId('quick-form-field-row').nth(0).getByLabel('Field label').fill('Site note');
    await dialog.getByRole('button', { name: /create form/i }).click();
    await expect(dialog).toBeHidden({ timeout: 15_000 });

    const card = page.getByTestId('quick-form-card').filter({ hasText: FORM_NAME }).first();
    await expect(card).toBeVisible({ timeout: 15_000 });
    await card.getByRole('button', { name: /qr link/i }).click();
    const qrDialog = page.getByRole('dialog', { name: /quick form qr link/i });
    const publicUrl =
      (await qrDialog.getByTestId('quick-form-public-url').textContent())?.trim() ?? '';
    expect(publicUrl).toMatch(/\/qr\/quick-form\/[a-f0-9]{64}$/);
    await page.keyboard.press('Escape');

    const publicContext = await browser.newContext({
      baseURL: process.env.PR_EVIDENCE_BASE_URL ?? 'http://localhost:8080',
    });
    const publicPage = await publicContext.newPage();
    await publicPage.goto(publicUrl);
    await expect(publicPage.getByRole('heading', { name: FORM_NAME })).toBeVisible({
      timeout: 30_000,
    });
    await publicPage.getByLabel(/site note/i).fill('First submit');
    expect(await solveHcaptchaIfPresent(publicPage)).toBe('solved');
    const firstSubmit = publicPage.getByRole('button', { name: /^submit$/i });
    await expect(firstSubmit).toBeEnabled({ timeout: 15_000 });
    await firstSubmit.click();
    await expect(publicPage.getByText(/submission received/i)).toBeVisible({ timeout: 30_000 });
    await expect(publicPage.getByText(/submit again with the same qr code/i)).toHaveCount(0);
    await evidencePause(publicPage, 600);
    await evidenceScreenshot(publicPage, '05-quick-form-success-no-resubmit-invite', {
      target: publicPage.getByText(/submission received/i),
    });

    await publicPage.reload();
    await expect(publicPage.getByRole('heading', { name: FORM_NAME })).toBeVisible({
      timeout: 30_000,
    });
    await publicPage.getByLabel(/site note/i).fill('Second submit');
    expect(await solveHcaptchaIfPresent(publicPage)).toBe('solved');
    const secondSubmit = publicPage.getByRole('button', { name: /^submit$/i });
    await expect(secondSubmit).toBeEnabled({ timeout: 15_000 });
    await secondSubmit.click();
    await expect(
      publicPage.getByText(/too many submissions|try again later|please wait before submitting/i).first(),
    ).toBeVisible({
      timeout: 15_000,
    });
    await evidencePause(publicPage, 600);
    await evidenceScreenshot(publicPage, '06-quick-form-cooldown-second-submit', {
      target: publicPage
        .getByText(/too many submissions|try again later|please wait before submitting/i)
        .first(),
    });
    await publicContext.close();

    await gotoDashboard('/quick-forms');
    const cleanupCard = page.getByTestId('quick-form-card').filter({ hasText: FORM_NAME }).first();
    await cleanupCard.getByRole('button', { name: `Delete ${FORM_NAME}` }).click();
    await page.getByRole('button', { name: /delete form/i }).click();
    await expect(
      page.getByTestId('quick-form-card').filter({ hasText: FORM_NAME }),
    ).toHaveCount(0, { timeout: 15_000 });
  });

  test('operator check-in reload stays submitted for the same UTC day (RT-02)', async ({
    browser,
    context,
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await pinContextToApex(context);
    await gotoDashboard('/operator-check-ins');
    await assertHealthyShell();

    const leftover = getYourTemplateCards(page, CHECKIN_TEMPLATE_NAME);
    for (let i = 0; i < 4 && (await leftover.count()) > 0; i += 1) {
      await deleteTemplateFromConsole(page, CHECKIN_TEMPLATE_NAME);
    }

    await expandStarterCatalogIfNeeded(page);
    await cloneStarterTemplate(page, STARTER_TEMPLATE_NAME);
    await renameTemplate(page, STARTER_TEMPLATE_NAME, CHECKIN_TEMPLATE_NAME);

    await navigateToEquipmentDetails(
      page,
      seedEquipment.cat320.id,
      seedEquipment.cat320.name,
      seedEquipment.cat320.serialNumber,
    );
    await removeAssignedChecklistsNamed(page, CHECKIN_TEMPLATE_NAME);
    await assignTemplateOnEquipmentDetails(page, CHECKIN_TEMPLATE_NAME);
    await openEquipmentCheckinQrDialog(page, CHECKIN_TEMPLATE_NAME);
    const publicToken = await extractOperatorCheckinTokenFromQrDialog(page);
    await assertEvidenceOperatorCheckinTokenRegistered(publicToken);
    await page.keyboard.press('Escape');

    const publicContext = await browser.newContext({
      baseURL: process.env.PR_EVIDENCE_BASE_URL ?? 'http://localhost:8080',
    });
    const publicPage = await publicContext.newPage();
    try {
      await publicPage.goto(`/qr/operator-check-in/${publicToken}`);
      await expect(publicPage.getByRole('heading', { name: CHECKIN_TEMPLATE_NAME })).toBeVisible({
        timeout: 30_000,
      });
      await fillOdometerLogPublicForm(publicPage);
      await passRemainingPublicChecklistItems(publicPage);
      expect(await solveHcaptchaIfPresent(publicPage)).toBe('solved');
      await submitPublicCheckin(publicPage);
      await evidencePause(publicPage, 600);
      await evidenceScreenshot(publicPage, '07-checkin-first-submit-complete', {
        target: publicPage.getByText(/check-in complete/i).first(),
      });

      await publicPage.reload();
      await expect(publicPage.getByText(/check-in complete/i)).toBeVisible({ timeout: 30_000 });
      await expect(publicPage.getByRole('button', { name: /submit daily check-in/i })).toHaveCount(0);
      await evidencePause(publicPage, 600);
      await evidenceScreenshot(publicPage, '08-checkin-reload-already-submitted', {
        target: publicPage.getByText(/check-in complete/i).first(),
      });
    } finally {
      await publicContext.close();
    }

    await gotoDashboard('/operator-check-ins');
    await deleteTemplateFromConsole(page, CHECKIN_TEMPLATE_NAME);
  });
});
