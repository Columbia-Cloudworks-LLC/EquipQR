import { test, expect } from '../user/fixtures/equipqr-test';
import { pinContextToApex } from '../user/shared/auth-helpers';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';
import { resetApexOperatorCheckinEvidence } from './shared/operator-checkin-evidence-reset';
import {
  cloneStarterTemplate,
  deleteTemplateFromConsole,
  expandStarterCatalogIfNeeded,
  getYourTemplateCard,
  openDailyLedgerTab,
  setShowDeletedCheckins,
} from './shared/operator-checkin-evidence-helpers';

const PURGE_TEMPLATE_NAME = 'Purge Evidence Template';
const STARTER_TEMPLATE_NAME = 'FMCSA-style DVIR starter';

test.describe.serial('Operator check-in purge and restore @pr-evidence', () => {
  test.beforeAll(async () => {
    await resetApexOperatorCheckinEvidence();
  });

  test.beforeEach(async ({ context }) => {
    await pinContextToApex(context);
  });

  test('admin purges unused templates and restores archived templates with ledger data', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard('/operator-check-ins');
    await assertHealthyShell();

    await expandStarterCatalogIfNeeded(page);
    await cloneStarterTemplate(page, STARTER_TEMPLATE_NAME);
    await page.getByRole('button', { name: /^edit$/i }).first().click();
    const editDialog = page.getByRole('dialog');
    await editDialog.locator('#template-name').fill(PURGE_TEMPLATE_NAME);
    await editDialog.getByRole('button', { name: /^save$/i }).click();
    await expect(editDialog).toBeHidden({ timeout: 30_000 });

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '01-unused-template-before-delete', {
      target: getYourTemplateCard(page, PURGE_TEMPLATE_NAME),
    });

    await deleteTemplateFromConsole(page, PURGE_TEMPLATE_NAME);

    await openDailyLedgerTab(page);
    await setShowDeletedCheckins(page, true);
    const reportTemplateSelect = page.locator('#report-template-select');
    await expect(reportTemplateSelect).toBeDisabled();
    await expect(
      page.getByText(/select a report template to review daily check-ins/i),
    ).toBeVisible({ timeout: 15_000 });

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '02-unused-template-purged-from-ledger-picker', {
      target: reportTemplateSelect,
    });
  });
});
