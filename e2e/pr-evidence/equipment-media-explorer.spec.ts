import { test, expect } from '../user/fixtures/equipqr-test';
import { seedEquipment } from '../user/shared/seed-data';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

test.describe('Equipment media library explorer @pr-evidence', () => {
  test('details summary, media library filters, and explorer', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard(`/dashboard/equipment/${seedEquipment.cat320.id}?tab=details`);
    await assertHealthyShell();

    await expect(page.getByTestId('equipment-media-summary')).toBeVisible({ timeout: 60_000 });
    await evidenceScreenshot(page, '01-equipment-details-media-summary');

    await page.getByRole('button', { name: /view all media/i }).click();
    await expect(page.getByRole('heading', { name: /media & artifacts/i })).toBeVisible({
      timeout: 30_000,
    });
    await evidencePause(page, 500);
    await evidenceScreenshot(page, '02-equipment-media-explorer');

    await page.keyboard.press('Escape');

    await gotoDashboard(`/dashboard/equipment/${seedEquipment.cat320.id}?tab=images`);
    await assertHealthyShell();
    await expect(page.getByRole('heading', { name: /media library/i })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByLabel(/search media/i)).toBeVisible();
    await evidenceScreenshot(page, '03-equipment-media-library-tab');

    const search = page.getByLabel(/search media/i);
    await search.fill('cat');
    await evidencePause(page, 400);
    await evidenceScreenshot(page, '04-equipment-media-library-filtered');
  });
});
