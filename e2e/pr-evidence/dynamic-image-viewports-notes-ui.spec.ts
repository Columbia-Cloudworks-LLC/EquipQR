import { test, expect } from '../user/fixtures/equipqr-test';
import { seedEquipment } from '../user/shared/seed-data';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

test.describe('Dynamic image viewports and notes cards @pr-evidence', () => {
  test('equipment notes cards with carousel and images tab viewport', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard(`/dashboard/equipment/${seedEquipment.cat320.id}?tab=notes`);
    await assertHealthyShell();

    await expect(page.getByRole('button', { name: /add note/i })).toBeVisible({ timeout: 60_000 });

    const noteCards = page.locator('[class*="group/viewport"]');
    if ((await noteCards.count()) > 0) {
      const firstViewport = noteCards.first();
      const box = await firstViewport.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.25);
        await evidencePause(page, 600);
      }
    }

    await evidenceScreenshot(page, '01-equipment-notes-cards');

    await gotoDashboard(`/dashboard/equipment/${seedEquipment.cat320.id}?tab=images`);
    await assertHealthyShell();
    await expect(page.getByRole('heading', { name: /equipment images/i })).toBeVisible({
      timeout: 60_000,
    });

    const imageViewport = page.locator('[class*="group/viewport"]').first();
    if (await imageViewport.isVisible()) {
      const box = await imageViewport.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.8);
        await evidencePause(page, 600);
      }
    }

    await evidenceScreenshot(page, '02-equipment-images-viewport');
  });
});
