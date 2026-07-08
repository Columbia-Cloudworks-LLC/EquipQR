import type { Page } from '@playwright/test';
import { test, expect } from '../user/fixtures/equipqr-test';
import { seedEquipment, seedInventory } from '../user/shared/seed-data';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

/**
 * Evidence for the three-issue fix pass:
 *   #1170 Microphone voice input works (consent flow + retry + bottom-left button)
 *   #1169 PM template selector moved to the top of the Work Orders tab
 *   #1165 Inventory item cost / low-stock threshold inline editing + audit trail
 */

const DICTATED_TEXT = 'Dictated via voice input';

/**
 * Deterministic browser speech stubs: grant-path getUserMedia plus a fake
 * SpeechRecognition that emits one final transcript. Exercises the real app
 * wiring (consent request -> recognition start -> transcript append) without
 * relying on Chromium's Google speech service, which is unavailable headless.
 */
async function installGrantedSpeechStubs(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>;
    w.__micConsentRequests = 0;
    navigator.mediaDevices.getUserMedia = async () => {
      w.__micConsentRequests = Number(w.__micConsentRequests) + 1;
      return { getTracks: () => [{ stop: () => undefined }] } as unknown as MediaStream;
    };

    class FakeSpeechRecognition {
      continuous = false;
      interimResults = false;
      maxAlternatives = 1;
      lang = '';
      onresult: ((event: unknown) => void) | null = null;
      onerror: ((event: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      onstart: (() => void) | null = null;

      start() {
        setTimeout(() => this.onstart?.(), 50);
        setTimeout(() => {
          const result = Object.assign([{ transcript: 'Dictated via voice input' }], {
            isFinal: true,
          });
          this.onresult?.({ resultIndex: 0, results: [result] });
        }, 700);
      }

      stop() {
        this.onend?.();
      }

      abort() {
        this.onend?.();
      }
    }

    w.SpeechRecognition = FakeSpeechRecognition;
    w.webkitSpeechRecognition = FakeSpeechRecognition;
  });
}

/** Denial-path stub: getUserMedia rejects like a user clicking "Block". */
async function installDeniedSpeechStubs(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>;
    w.__micConsentRequests = 0;
    navigator.mediaDevices.getUserMedia = async () => {
      w.__micConsentRequests = Number(w.__micConsentRequests) + 1;
      throw new DOMException('Permission denied', 'NotAllowedError');
    };

    class FakeSpeechRecognition {
      onstart: (() => void) | null = null;
      start() {
        this.onstart?.();
      }
      stop() {}
      abort() {}
    }
    w.SpeechRecognition = FakeSpeechRecognition;
    w.webkitSpeechRecognition = FakeSpeechRecognition;
  });
}

async function micConsentRequests(page: Page): Promise<number> {
  return page.evaluate(() => Number((window as unknown as Record<string, unknown>).__micConsentRequests));
}

test.describe('Mic + PM template + inventory fixes @pr-evidence', () => {
  test('voice dictation appends text into a note after mic consent (#1170)', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await installGrantedSpeechStubs(page);
    await gotoDashboard(`/equipment/${seedEquipment.cat320.id}?tab=notes`);
    await assertHealthyShell();

    await page.getByRole('button', { name: /add note/i }).click();
    const noteBox = page.getByRole('textbox', { name: 'Note content' });
    await expect(noteBox).toBeVisible({ timeout: 30_000 });

    const micButton = page.getByRole('button', { name: 'Start voice input' }).first();
    await expect(micButton).toBeVisible();
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '01-note-composer-mic-bottom-left');

    await micButton.click();
    await expect(noteBox).toHaveValue(new RegExp(DICTATED_TEXT), { timeout: 15_000 });
    expect(await micConsentRequests(page)).toBeGreaterThanOrEqual(1);

    await evidencePause(page, 400);
    await evidenceScreenshot(page, '02-note-dictated-via-voice');
  });

  test('denied mic consent shows retryable error and re-runs consent on next click (#1170)', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await installDeniedSpeechStubs(page);
    await gotoDashboard(`/equipment/${seedEquipment.cat320.id}?tab=notes`);
    await assertHealthyShell();

    await page.getByRole('button', { name: /add note/i }).click();
    const micButton = page.getByRole('button', { name: 'Start voice input' }).first();
    await expect(micButton).toBeVisible({ timeout: 30_000 });

    await micButton.click();
    await expect(page.getByText(/microphone access was denied/i)).toBeVisible({ timeout: 15_000 });
    await evidencePause(page, 500);
    await evidenceScreenshot(page, '03-mic-denied-retryable-error');

    // Clicking again restarts the consent process.
    await micButton.click();
    await expect
      .poll(() => micConsentRequests(page), { timeout: 10_000 })
      .toBeGreaterThanOrEqual(2);
  });

  test('equipment create form mic sits bottom-left of the notes box and dictates (#1170)', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await installGrantedSpeechStubs(page);
    await gotoDashboard('/equipment');
    await assertHealthyShell();

    await page.getByRole('button', { name: /add equipment/i }).first().click();
    await page.getByRole('menuitem', { name: /add single equipment/i }).click();
    await expect(page.getByRole('heading', { name: 'Create New Equipment' })).toBeVisible({
      timeout: 30_000,
    });

    const notesBox = page.getByPlaceholder(/additional information about the equipment/i);
    await notesBox.scrollIntoViewIfNeeded();
    await expect(notesBox).toBeVisible();

    const dialog = page.getByRole('dialog', { name: 'Create New Equipment' });
    const micButton = dialog.getByRole('button', { name: 'Start voice input' });
    await expect(micButton).toBeVisible();

    // Placement proof: mic anchored to the bottom-left corner of the textarea.
    const boxBounds = await notesBox.boundingBox();
    const micBounds = await micButton.boundingBox();
    expect(boxBounds).not.toBeNull();
    expect(micBounds).not.toBeNull();
    if (boxBounds && micBounds) {
      expect(micBounds.x).toBeLessThan(boxBounds.x + boxBounds.width / 2);
      expect(micBounds.y + micBounds.height).toBeLessThanOrEqual(boxBounds.y + boxBounds.height + 2);
      expect(micBounds.y).toBeGreaterThan(boxBounds.y + boxBounds.height / 2);
    }

    await evidencePause(page, 500);
    await evidenceScreenshot(page, '04-equipment-form-mic-bottom-left');

    await micButton.click();
    await expect(notesBox).toHaveValue(new RegExp(DICTATED_TEXT), { timeout: 15_000 });
    await evidencePause(page, 400);
    await evidenceScreenshot(page, '05-equipment-form-dictated');
    await page.keyboard.press('Escape');
  });

  test('PM template selector lives at the top of the Work Orders tab with locked dropdown (#1169)', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard(`/equipment/${seedEquipment.cat320.id}`);
    await assertHealthyShell();

    // Details tab no longer hosts the template selector.
    await expect(page.getByText('PM Schedule').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('combobox', { name: /^PM Template$/i })).toHaveCount(0);

    await page.getByRole('tab', { name: /work orders/i }).click();

    const templateTrigger = page.getByRole('combobox', { name: /^PM Template$/i });
    await expect(templateTrigger).toBeVisible({ timeout: 30_000 });
    await expect(templateTrigger).toBeDisabled();
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '06-pm-template-locked-on-work-orders-tab');

    // Unlock, change the template, and confirm auto-save + re-lock.
    const currentLabel = (await templateTrigger.textContent()) ?? '';
    const nextTemplate = /forklift/i.test(currentLabel) ? /excavator pm/i : /forklift pm/i;

    await page.getByRole('button', { name: 'Edit PM template' }).click();
    await expect(templateTrigger).toBeEnabled();
    await evidenceScreenshot(page, '07-pm-template-unlocked');

    await templateTrigger.click();
    await page.getByRole('option', { name: nextTemplate }).click();

    await expect(templateTrigger).toContainText(nextTemplate, { timeout: 30_000 });
    await expect(templateTrigger).toBeDisabled({ timeout: 30_000 });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '08-pm-template-saved-and-relocked');
  });

  test('inventory cost and low-stock threshold edit inline and land in the audit log (#1165)', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard(`/inventory/${seedInventory.hydraulicOil.id}`);
    await assertHealthyShell();

    await expect(page.getByText('Low Stock Threshold')).toBeVisible({ timeout: 30_000 });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '09-inventory-overview-inline-editors');

    // Threshold: click-to-edit, numeric input, save.
    await page.getByRole('button', { name: 'Edit low stock threshold' }).click();
    const thresholdInput = page.locator('input[type="number"]');
    await expect(thresholdInput).toBeVisible();
    await thresholdInput.fill('7');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('7', { exact: true })).toBeVisible({ timeout: 30_000 });

    // Cost: same inline pattern, formatted as currency after save.
    await page.getByRole('button', { name: 'Edit default unit cost' }).click();
    const costInput = page.locator('input[type="number"]');
    await expect(costInput).toBeVisible();
    await costInput.fill('42.5');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('$42.50')).toBeVisible({ timeout: 30_000 });

    await evidencePause(page, 600);
    await evidenceScreenshot(page, '10-inventory-cost-threshold-updated');

    // Audit trail proof: the change history link shows the UPDATE entries.
    await page
      .getByRole('link', { name: /view change history in the audit log/i })
      .click();
    await expect(page).toHaveURL(/audit-log/, { timeout: 30_000 });
    await expect(page.getByText(/audit log/i).first()).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByText(seedInventory.hydraulicOil.name).first(),
    ).toBeVisible({ timeout: 30_000 });

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '11-audit-log-inventory-update-entries');
  });
});
