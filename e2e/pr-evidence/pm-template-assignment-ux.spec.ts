import { test, expect } from '../user/fixtures/equipqr-test';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

/**
 * PR evidence for #1209 — PM Templates grid assignment trigger de-emphasis
 * and scoped assignment count on the trigger label.
 */
test.describe('PM template assignment UX — desktop @pr-evidence', () => {
  test('grid uses outline triggers and shows scoped assignment counts (#1209)', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard('/pm-templates');
    await assertHealthyShell();

    await expect(page.getByRole('heading', { name: /pm templates/i })).toBeVisible({
      timeout: 60_000,
    });

    const equipQrHeading = page.getByRole('heading', { name: /equipqr templates/i });
    await expect(equipQrHeading).toBeVisible({ timeout: 30_000 });

    const equipQrSection = equipQrHeading.locator('..');
    const equipQrGrid = equipQrSection.locator('.grid').first();
    const assignmentTriggers = equipQrSection.getByRole('button', {
      name: /apply to equipment|assigned equipment/i,
    });

    await expect(assignmentTriggers.first()).toBeVisible({ timeout: 30_000 });
    expect(await assignmentTriggers.count()).toBeGreaterThanOrEqual(1);

    await evidencePause(page, 600);
    await evidenceScreenshot(page, '01-pm-templates-grid-outline-triggers', {
      target: equipQrGrid,
    });

    const firstTrigger = assignmentTriggers.first();
    await firstTrigger.click();

    const pickerSearch = page.getByPlaceholder('Search equipment...');
    const selectAllButton = page.getByRole('button', { name: /select all/i });
    const applyTemplateButton = page.getByRole('button', { name: /apply template/i });

    await expect(pickerSearch).toBeVisible({ timeout: 15_000 });
    await expect(selectAllButton).toBeVisible();
    await expect(applyTemplateButton).toBeVisible();

    await evidencePause(page, 600);
    await evidenceScreenshot(page, '02-assignment-picker-open', { target: pickerSearch });
    await page.keyboard.press('Escape');

    const assignedTrigger = equipQrSection
      .getByRole('button', { name: /assigned equipment \(\d+\)/i })
      .first();
    if (await assignedTrigger.isVisible().catch(() => false)) {
      await assignedTrigger.scrollIntoViewIfNeeded();
      await evidencePause(page, 400);
      await evidenceScreenshot(page, '03-assigned-equipment-count-label', {
        target: assignedTrigger,
      });
    }
  });
});
