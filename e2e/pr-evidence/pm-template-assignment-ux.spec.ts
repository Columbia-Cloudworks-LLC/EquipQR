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
    await expect(page.getByRole('heading', { name: /equipqr templates/i })).toBeVisible({
      timeout: 30_000,
    });

    // Grid scanability: multiple outline assignment triggers, not a wall of solid primary buttons.
    const assignmentTriggers = page.getByRole('button', {
      name: /apply to equipment|assigned equipment/i,
    });
    await expect(assignmentTriggers.first()).toBeVisible({ timeout: 30_000 });
    const triggerCount = await assignmentTriggers.count();
    expect(triggerCount).toBeGreaterThan(1);

    await evidencePause(page, 600);
    await evidenceScreenshot(page, '01-pm-templates-grid-outline-triggers');

    // Open the first picker to prove assignment still works.
    await assignmentTriggers.first().click();
    await expect(page.getByText(/^Apply /).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: /select all/i })).toBeVisible();

    await evidencePause(page, 600);
    await evidenceScreenshot(page, '02-assignment-picker-open');
    await page.keyboard.press('Escape');

    // If any template already has assignments in the current team scope, capture the count label.
    const assignedTrigger = page.getByRole('button', { name: /assigned equipment \(\d+\)/i }).first();
    if (await assignedTrigger.isVisible().catch(() => false)) {
      await assignedTrigger.scrollIntoViewIfNeeded();
      await evidencePause(page, 400);
      await evidenceScreenshot(page, '03-assigned-equipment-count-label');
    }
  });
});
