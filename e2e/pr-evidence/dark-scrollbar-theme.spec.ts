import { test, expect } from '../user/fixtures/equipqr-test';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

/**
 * PR evidence for #1208 — dark-themed scrollbars on overflow surfaces.
 */
test.describe('Dark scrollbar theme @pr-evidence', () => {
  test('PM template equipment picker uses themed scrollbar (#1208)', async ({
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
    const assignmentTrigger = equipQrSection
      .getByRole('button', { name: /apply to equipment/i })
      .first();

    await expect(assignmentTrigger).toBeVisible({ timeout: 30_000 });
    await assignmentTrigger.click();

    const pickerSearch = page.getByPlaceholder('Search equipment...');
    await expect(pickerSearch).toBeVisible({ timeout: 15_000 });

    const scrollList = page.locator('.max-h-64.overflow-y-auto').first();
    await expect(scrollList).toBeVisible();

    const scrollHeight = await scrollList.evaluate((el) => el.scrollHeight);
    const clientHeight = await scrollList.evaluate((el) => el.clientHeight);
    if (scrollHeight > clientHeight) {
      await scrollList.evaluate((el) => {
        el.scrollTop = el.scrollHeight / 2;
      });
    }

    await evidencePause(page, 600);
    await evidenceScreenshot(page, '01-pm-template-picker-themed-scrollbar', {
      target: scrollList,
    });

    await page.keyboard.press('Escape');
  });

  test('dialog overflow region uses themed scrollbar (#1208)', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard('/dashboard/organization/audit-log');
    await assertHealthyShell();

    await expect(page.getByRole('heading', { name: /audit log/i })).toBeVisible({
      timeout: 60_000,
    });

    const auditList = page
      .getByTestId('audit-log-list-virtual')
      .or(page.getByTestId('audit-log-list-static'));
    await expect(auditList).toBeVisible({ timeout: 30_000 });

    const scrollHeight = await auditList.evaluate((el) => el.scrollHeight);
    const clientHeight = await auditList.evaluate((el) => el.clientHeight);
    if (scrollHeight > clientHeight) {
      await auditList.evaluate((el) => {
        el.scrollTop = 120;
      });
    } else {
      await auditList.focus();
      await page.keyboard.press('PageDown');
    }

    await evidencePause(page, 600);
    await evidenceScreenshot(page, '02-audit-log-themed-scrollbar', {
      target: auditList,
    });
  });
});
