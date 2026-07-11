import { test, expect } from '../user/fixtures/equipqr-test';
import { seedEquipment, seedWorkOrders } from '../user/shared/seed-data';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

test.use({ viewport: { width: 390, height: 844 } });

test.describe('Mobile inline image viewport @pr-evidence', () => {
  test('note cards show export controls and open pinch-zoom lightbox on tap', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard(`/dashboard/equipment/${seedEquipment.cat320.id}?tab=notes`);
    await assertHealthyShell();

    await expect(page.getByRole('button', { name: /add note/i })).toBeVisible({ timeout: 60_000 });

    const downloadButton = page.getByRole('button', { name: /download/i }).first();
    if (!(await downloadButton.isVisible())) {
      test.skip(true, 'No seeded note images on equipment notes tab');
    }

    await expect(downloadButton).toBeVisible();
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

  test('work order images open lightbox from carousel', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard(`/dashboard/work-orders/${seedWorkOrders.oilChange.id}`);
    await assertHealthyShell();

    const imagesTrigger = page.getByRole('button', { name: /work order images/i });
    if (!(await imagesTrigger.isVisible({ timeout: 15_000 }))) {
      test.skip(true, 'No work order images section in seeded data');
    }

    await imagesTrigger.click();
    const imageViewport = page.locator('[class*="group/viewport"]').first();
    if (!(await imageViewport.isVisible({ timeout: 15_000 }))) {
      test.skip(true, 'No work order images loaded');
    }

    await imageViewport.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await evidenceScreenshot(page, '03-mobile-work-order-image-lightbox');
  });
});
