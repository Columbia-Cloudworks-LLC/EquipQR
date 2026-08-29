import { test, expect, quickLogin, type Page } from '../user/fixtures/equipqr-test';
import {
  fillWorkOrderBasics,
  openWorkOrderCreateDialog,
  selectWorkOrderEquipment,
  selectRadixOption,
  submitWorkOrderForm,
} from '../user/shared/ui-form-helpers';
import { evidencePause, evidenceScreenshot } from './shared/evidence-helpers';

async function confirmPmWarningIfVisible(page: Page): Promise<void> {
  const confirmButton = page.getByRole('button', { name: /yes, disable pm|yes, change template/i });
  if (await confirmButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await confirmButton.click();
  }
}

async function openPmManagement(page: Page): Promise<void> {
  const button = page.getByRole('button', { name: /add pm checklist|manage pm template/i }).first();
  await expect(button).toBeVisible({ timeout: 60_000 });
  await button.click();
  await expect(page.getByRole('dialog', { name: /manage pm checklist/i })).toBeVisible({ timeout: 30_000 });
}

async function savePmDialog(page: Page): Promise<void> {
  await page.getByRole('button', { name: /save pm changes/i }).click();
  await confirmPmWarningIfVisible(page);
  await expect(page.getByRole('dialog', { name: /manage pm checklist/i })).toBeHidden({
    timeout: 30_000,
  });
}

async function ensureWorkOrderUsesEvidenceTemplate(page: Page): Promise<void> {
  await openPmManagement(page);
  const templateTrigger = page.getByRole('combobox', { name: /pm template/i });
  await templateTrigger.click();

  const previewOnlyEvidenceTemplate = page.getByRole('option', { name: /pr 1482 multi-section pm/i }).last();
  if (await previewOnlyEvidenceTemplate.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await previewOnlyEvidenceTemplate.click();
  } else {
    await page.keyboard.press('Escape');
    await selectRadixOption(page, templateTrigger, /excavator pm|forklift pm/i);
  }
  await savePmDialog(page);
}

test.describe('PM checklist section headers @pr-evidence', () => {
  test('shows each section as a readable header row instead of striped cells', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await quickLogin(page, 'technician');
    const title = `PM header evidence ${Date.now()}`;
    const dialog = await openWorkOrderCreateDialog(page, gotoDashboard);
    await selectWorkOrderEquipment(page, dialog, /cat 320 excavator/i);
    await fillWorkOrderBasics(dialog, {
      title,
      description: 'Preview evidence for PM section header layout.',
    });
    await submitWorkOrderForm(page, dialog);

    await expect(page.getByRole('heading', { name: new RegExp(title, 'i') }).first()).toBeVisible({
      timeout: 60_000,
    });
    await assertHealthyShell();
    await ensureWorkOrderUsesEvidenceTemplate(page);
    await assertHealthyShell();

    const checklistHeading = page.getByText(/pm checklist|preventative maintenance|checklist/i).first();
    await expect(checklistHeading).toBeVisible({ timeout: 60_000 });

    const visualInspectionTrigger = page.getByRole('button', { name: /visual inspection/i });
    await expect(visualInspectionTrigger).toBeVisible({ timeout: 30_000 });
    await visualInspectionTrigger.click();

    const firstAssessment = page.getByRole('combobox').filter({ hasText: /select assessment/i }).first();
    await expect(firstAssessment).toBeVisible({ timeout: 30_000 });
    await selectRadixOption(page, firstAssessment, /^Adjusted$/i);

    await expect(page.getByText('Adjusted').first()).toBeVisible({ timeout: 30_000 });
    await visualInspectionTrigger.click();
    await expect(visualInspectionTrigger).toContainText('1 flagged');

    await checklistHeading.scrollIntoViewIfNeeded();
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '01-pm-section-headers-scannable');
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '02-pm-section-header-flagged', {
      target: visualInspectionTrigger,
    });
  });
});
