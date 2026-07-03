import { test, expect } from '../user/fixtures/equipqr-test';
import { seedWorkOrders } from '../user/shared/seed-data';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

test.describe('Work order follow-up notes @pr-evidence', () => {
  test('technician can add a note on a completed work order', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard(`/dashboard/work-orders/${seedWorkOrders.completed.id}`);
    await assertHealthyShell();

    await expect(
      page.getByRole('heading', { name: new RegExp(seedWorkOrders.completed.title, 'i') }).first(),
    ).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/completed/i).first()).toBeVisible({ timeout: 30_000 });

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '01-completed-work-order-notes-section');

    const addNoteButton = page.getByRole('button', { name: /^add note$/i }).first();
    await expect(addNoteButton).toBeVisible({ timeout: 30_000 });
    await addNoteButton.click();

    const noteField = page.getByPlaceholder(/enter your note/i).first();
    await expect(noteField).toBeVisible({ timeout: 15_000 });
    await noteField.fill('PO #Apex-8842 attached for billing follow-up.');

    await evidencePause(page, 600);
    await evidenceScreenshot(page, '02-completed-work-order-note-composer');

    await page.getByRole('button', { name: /^add note$/i }).last().click();
    await expect(page.getByText(/PO #Apex-8842/i)).toBeVisible({ timeout: 30_000 });

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '03-completed-work-order-note-saved');
  });
});
