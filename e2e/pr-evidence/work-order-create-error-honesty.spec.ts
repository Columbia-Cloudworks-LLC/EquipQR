import { test, expect } from '../user/fixtures/equipqr-test';
import {
  devPassword,
} from '../user/shared/seed-data';
import {
  ensureCookieConsentAccepted,
  signInWithEmailPassword,
} from '../user/shared/auth-helpers';
import {
  evidencePause,
  evidenceScreenshot,
} from './shared/evidence-helpers';
import {
  fillWorkOrderBasics,
  openWorkOrderCreateDialog,
  selectWorkOrderEquipment,
} from '../user/shared/ui-form-helpers';

const ownerEmail = 'owner@apex.test';
const ownerPassword = process.env.VITE_DEV_TEST_PASSWORD ?? devPassword;
const cloudCat320Matcher = /CAT320GC-CLOUD-AGENT-001|CAT 320 Excavator/i;

test.describe('Work order create empty description @pr-evidence', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('equipqr:cookie-consent', 'accepted');
    });
    await signInWithEmailPassword(page, ownerEmail, ownerPassword);
    await ensureCookieConsentAccepted(page);
  });

  test('creates a work order with an empty description', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await assertHealthyShell();
    const dialog = await openWorkOrderCreateDialog(page, gotoDashboard);

    const title = `QA 1481 empty description ${Date.now()}`;
    await fillWorkOrderBasics(dialog, {
      title,
      description: '',
    });
    await selectWorkOrderEquipment(page, dialog, cloudCat320Matcher, /CAT 320 Excavator/i);

    await dialog.getByTestId('submit-button').or(
      dialog.getByRole('button', { name: /create work order/i }),
    ).click();

    const confirmHours = page.getByRole('button', { name: /yes, create without hours/i });
    if (await confirmHours.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await confirmHours.click();
    }

    await expect(page).toHaveURL(/\/dashboard\/work-orders\//, { timeout: 60_000 });
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText(/work order created successfully/i).first()).toBeVisible({
      timeout: 30_000,
    });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '01-work-order-create-empty-description-success');
  });
});
