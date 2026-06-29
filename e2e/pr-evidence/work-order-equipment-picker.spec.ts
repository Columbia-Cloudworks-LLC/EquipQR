import { test, expect } from '../user/fixtures/equipqr-test';
import { seedEquipment } from '../user/shared/seed-data';
import { openWorkOrderCreateDialog } from '../user/shared/ui-form-helpers';
import { evidencePause, evidenceScreenshot } from './shared/evidence-helpers';

const MOBILE_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36';

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  userAgent: MOBILE_USER_AGENT,
});

test.describe('PR evidence: work order equipment picker @pr-evidence', () => {
  test('mobile create work order equipment select and search', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard('/work-orders');
    await assertHealthyShell();

    const dialog = await openWorkOrderCreateDialog(page, gotoDashboard);
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '01-create-work-order-modal');

    const equipmentTrigger = dialog.getByRole('combobox', { name: /select equipment/i });
    await expect(equipmentTrigger).toBeVisible({ timeout: 15_000 });
    await equipmentTrigger.click();

    await expect(page.getByRole('option', { name: seedEquipment.cat320.name }).first()).toBeVisible({
      timeout: 15_000,
    });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '02-scrollable-equipment-select-open');

    await page.keyboard.press('Escape');

    await dialog.getByRole('button', { name: /^search equipment$/i }).click();
    await expect(page.getByRole('dialog', { name: /search equipment/i })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByPlaceholder(/search equipment\.\.\./i).fill(seedEquipment.cat320.name);
    const searchResultRow = page
      .getByRole('button', { name: /^select /i })
      .filter({ hasText: seedEquipment.cat320.name })
      .first();
    await expect(searchResultRow).toBeVisible({ timeout: 15_000 });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '03-equipment-search-dialog-filtered');

    await searchResultRow.click();
    await expect(equipmentTrigger).toContainText(seedEquipment.cat320.name, { timeout: 15_000 });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '04-equipment-selected');
  });
});
