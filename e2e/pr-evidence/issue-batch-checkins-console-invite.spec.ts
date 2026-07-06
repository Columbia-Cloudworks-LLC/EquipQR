import { test, expect } from '../user/fixtures/equipqr-test';
import {
  expectNoAppErrorBoundary,
  pinContextToApex,
} from '../user/shared/auth-helpers';
import { seedEquipment } from '../user/shared/seed-data';
import { evidencePause, evidenceScreenshot } from './shared/evidence-helpers';
import { resetApexOperatorCheckinEvidence } from './shared/operator-checkin-evidence-reset';
import {
  assignTemplateOnEquipmentDetails,
  cloneStarterTemplate,
  expandStarterCatalogIfNeeded,
  extractOperatorCheckinTokenFromQrDialog,
  navigateToEquipmentDetails,
  openEquipmentCheckinQrDialog,
  STARTER_TEMPLATE_NAME,
} from './shared/operator-checkin-evidence-helpers';

test.describe.serial('Issue batch: check-ins, console noise, invite modal @pr-evidence', () => {
  test.beforeAll(async () => {
    await resetApexOperatorCheckinEvidence();
  });

  test.beforeEach(async ({ context }) => {
    await pinContextToApex(context);
  });

  test('check-ins tab renders without crashing when no checklist is assigned (#1155)', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard(`/equipment/${seedEquipment.johnDeereDozer.id}`);
    await assertHealthyShell();
    await expect(
      page.getByRole('heading', { name: new RegExp(seedEquipment.johnDeereDozer.name, 'i') }).first(),
    ).toBeVisible({ timeout: 30_000 });

    await page.getByRole('tab', { name: /check-ins/i }).click();

    await expect(
      page.getByText(/no daily check-in reports are assigned to this equipment yet/i),
    ).toBeVisible({ timeout: 30_000 });
    await expectNoAppErrorBoundary(page);

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '01-checkins-tab-empty-state-no-crash');
  });

  test('daily check-in QR link persists across devices (#1154)', async ({
    browser,
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
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
    await openEquipmentCheckinQrDialog(page, STARTER_TEMPLATE_NAME);
    const mintedToken = await extractOperatorCheckinTokenFromQrDialog(page);

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '02-qr-link-minted-on-first-device');
    await page.keyboard.press('Escape');

    // Second browser context = clean in-memory state, same signed-in admin —
    // equivalent to opening the QR dialog from another device.
    const secondDeviceContext = await browser.newContext({
      storageState: 'tmp/playwright/auth/owner.json',
      baseURL: process.env.PR_EVIDENCE_BASE_URL ?? 'http://localhost:8080',
    });
    await pinContextToApex(secondDeviceContext);
    const secondDevicePage = await secondDeviceContext.newPage();

    await navigateToEquipmentDetails(
      secondDevicePage,
      seedEquipment.cat320.id,
      seedEquipment.cat320.name,
      seedEquipment.cat320.serialNumber,
    );
    await openEquipmentCheckinQrDialog(secondDevicePage, STARTER_TEMPLATE_NAME);
    const secondDeviceToken = await extractOperatorCheckinTokenFromQrDialog(secondDevicePage);
    expect(secondDeviceToken).toBe(mintedToken);

    await evidencePause(secondDevicePage, 800);
    await evidenceScreenshot(secondDevicePage, '03-qr-link-same-token-on-second-device');
    await secondDeviceContext.close();
  });

  test('invite member closes the dialog and surfaces the outcome toast (#1081)', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard('/organization/members');
    await assertHealthyShell();

    await page.getByRole('button', { name: /invite member/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: /invite new member/i })).toBeVisible({
      timeout: 15_000,
    });

    await dialog.getByLabel(/email address/i).fill(`evidence.invite.${Date.now()}@example.com`);

    await evidencePause(page, 400);
    await evidenceScreenshot(page, '04-invite-member-dialog-open');

    await dialog.getByRole('button', { name: /send invitation/i }).click();

    // The dialog must close on every terminal outcome and the sonner toast
    // (success or partial-failure) must be visible above the page.
    await expect(dialog).toBeHidden({ timeout: 30_000 });
    await expect(page.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 15_000 });

    await evidenceScreenshot(page, '05-invite-toast-visible-dialog-closed');
  });

  test('work order list renders equipment thumbnails without raw storage paths (#1086)', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard('/work-orders');
    await assertHealthyShell();
    await expect(page.getByRole('heading', { level: 1, name: /work orders/i })).toBeVisible({
      timeout: 30_000,
    });

    // No <img> on the page may carry a canonical storage path (the #1086
    // regression rendered them relative to /dashboard/... and 404'd).
    const rawPathImages = await page.evaluate(() =>
      Array.from(document.querySelectorAll('img'))
        .map((img) => img.getAttribute('src') ?? '')
        .filter((src) => src.length > 0 && !/^(https?:|blob:|data:|\/)/i.test(src)),
    );
    expect(rawPathImages).toEqual([]);

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '06-work-orders-list-no-raw-image-paths');
  });
});
