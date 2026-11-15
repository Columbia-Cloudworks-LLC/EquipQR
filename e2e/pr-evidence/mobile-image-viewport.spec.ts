import { test, expect } from '../user/fixtures/equipqr-test';
import { seedEquipment } from '../user/shared/seed-data';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test.describe('Mobile inline image viewport @pr-evidence', () => {
  test('note cards show export controls and open pinch-zoom lightbox on tap', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard(`/dashboard/equipment/${seedEquipment.cat320.id}?tab=notes`);
    await assertHealthyShell();

    await expect(page.getByRole('button', { name: /add note/i })).toBeVisible({ timeout: 60_000 });

    // The seeded CAT 320 note carries an image (supabase/seed-images), so export controls must render.
    const downloadButton = page.getByRole('button', { name: /download/i }).first();
    await expect(downloadButton).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: /copy/i }).first()).toBeVisible();

    const viewport = page.locator('[class*="group/viewport"]').first();
    await viewport.click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /^download$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^copy$/i })).toBeVisible();

    await evidenceScreenshot(page, '01-mobile-note-lightbox');

    await page.getByRole('button', { name: /close/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();

    const box = await viewport.boundingBox();
    if (box) {
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.8);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.2);
      await page.mouse.up();
    }

    await evidencePause(page, 400);
    await evidenceScreenshot(page, '02-mobile-notes-scroll-past-image');
  });
});
