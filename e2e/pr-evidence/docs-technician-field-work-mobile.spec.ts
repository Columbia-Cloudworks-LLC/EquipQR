/**
 * Help Center docs media — "Technician Field Work" collection, mobile (#1161).
 *
 * Phone-viewport companion to the desktop narrative: QR scan landing, mobile
 * work-order summary, status sheet, quick actions, and note composer against
 * the seeded in-progress oil change.
 *
 * Capture:
 *   .\scripts\pr-evidence\Invoke-PrEvidence.ps1 -Flow "docs-technician-field-work-mobile" `
 *     -Spec "e2e/pr-evidence/docs-technician-field-work-mobile.spec.ts" -MobileViewport
 * Publish:
 *   .\scripts\docs-media\Publish-DocsMedia.ps1 `
 *     -ManifestPath tmp\pr-evidence\docs-technician-field-work-mobile\manifest.json `
 *     -Collection technician-field-work -Variant mobile
 */

import { test, expect } from '../user/fixtures/equipqr-test';
import { seedEquipment, seedWorkOrders } from '../user/shared/seed-data';
import { evidenceScreenshot } from './shared/evidence-helpers';
import { focusAndClick, focusAndFill, focusControl, settleForDemo } from './shared/docs-demo-helpers';

test.describe('Docs media: Technician field work mobile @pr-evidence', () => {
  test('mobile scan landing, status sheet, quick actions, and note composer', async ({
    assertHealthyShell,
    page,
  }) => {
    test.setTimeout(300_000);

    // --- scan-equipment-qr on a phone ---
    await page.goto(`/qr/equipment/${seedEquipment.cat320.id}`);
    await settleForDemo(page);
    await evidenceScreenshot(page, '01-mobile-scan-qr-landing');

    // --- mobile work order details: compact summary ---
    await page.goto(`/dashboard/work-orders/${seedWorkOrders.oilChange.id}`);
    await assertHealthyShell();
    await expect(
      page.getByRole('heading', { name: new RegExp(seedWorkOrders.oilChange.title, 'i') }).first(),
    ).toBeVisible({ timeout: 60_000 });
    await settleForDemo(page);
    await evidenceScreenshot(page, '02-mobile-work-order-summary');

    // --- update-work-order-status: mobile status sheet ---
    const statusButton = page.getByRole('button', { name: /status:.*change status/i }).first();
    await focusAndClick(page, statusButton);
    await expect(page.getByRole('heading', { name: /change status/i })).toBeVisible({
      timeout: 30_000,
    });
    await settleForDemo(page, 800);
    await evidenceScreenshot(page, '03-mobile-status-sheet', {
      target: page.getByRole('heading', { name: /change status/i }),
    });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: /change status/i })).toBeHidden({
      timeout: 15_000,
    });

    // --- add-notes-and-photos: composer via the quick-actions FAB sheet ---
    await focusAndClick(page, page.getByRole('button', { name: /open work order quick actions/i }));
    await settleForDemo(page, 600);
    await evidenceScreenshot(page, '03b-mobile-quick-actions-sheet');
    await focusAndClick(page, page.getByRole('button', { name: /add note or photo/i }).first());
    const noteBox = page.getByRole('textbox', { name: /note/i }).first();
    await focusAndFill(page, noteBox, 'Field check complete. Oil level within range.');
    await settleForDemo(page, 600);
    await evidenceScreenshot(page, '04-mobile-note-composer');
    await page.keyboard.press('Escape');

    // --- consume-inventory-on-wo: field costs card ---
    const costsCard = page.getByText(/field costs|itemized costs|costs/i).first();
    await focusControl(page, costsCard);
    await evidenceScreenshot(page, '05-mobile-field-costs-card');
  });
});
