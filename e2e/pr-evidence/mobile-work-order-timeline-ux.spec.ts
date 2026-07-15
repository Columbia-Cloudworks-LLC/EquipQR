import { test, expect } from '../user/fixtures/equipqr-test';
import { pinContextToOrg } from '../user/shared/auth-helpers';
import { apexOrgId, seedEquipment } from '../user/shared/seed-data';
import { fillWorkOrderBasics } from '../user/shared/ui-form-helpers';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

test.describe('PR evidence: mobile work order timeline UX @pr-evidence', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ context }) => {
    await pinContextToOrg(context, apexOrgId);
  });

  test('shows consolidated timeline and admin import control on mobile', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    const title = `PR Evidence Mobile Timeline ${Date.now()}`;

    await gotoDashboard(
      `/equipment/${seedEquipment.cat320.id}?createWorkOrder=1`,
    );
    const dialog = page.getByRole('dialog', { name: /create work order/i });
    await expect(dialog).toBeVisible({ timeout: 30_000 });

    await fillWorkOrderBasics(dialog, {
      title,
      description: 'Mobile timeline UX verification',
    });

    await dialog.getByRole('button', { name: /create work order/i }).click();
    const confirmHours = page.getByRole('button', { name: /yes, create without hours/i });
    if (await confirmHours.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await confirmHours.click();
    }

    await expect(page).toHaveURL(/\/dashboard\/work-orders\//, { timeout: 60_000 });
    await expect(page.getByRole('heading', { name: new RegExp(title, 'i') })).toBeVisible({
      timeout: 30_000,
    });
    await assertHealthyShell();

    const timelineSection = page.getByRole('button', { name: /timeline & office details/i });
    await expect(timelineSection).toBeVisible({ timeout: 30_000 });
    await timelineSection.click();

    await expect(page.getByRole('heading', { level: 4, name: 'Work Order Created' })).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 4 })).toHaveCount(1);
    await expect(page.getByText(/Submitted by/i)).toBeVisible();
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '01-mobile-consolidated-timeline', {
      target: page.getByText('Timeline (Status Events)'),
    });

    const importButton = page.getByRole('button', { name: /import paper records/i });
    await expect(importButton).toBeVisible();
    await expect(page.getByText('Admin').first()).toBeVisible();
    await importButton.click();

    const importDialog = page.getByRole('dialog').filter({ hasText: /import paper records/i });
    await expect(importDialog).toBeVisible({ timeout: 15_000 });
    await expect(importDialog.getByText(/backdate status events from paper records/i)).toBeVisible();
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '02-mobile-import-paper-records-dialog', {
      target: importDialog,
    });
    await importDialog.getByRole('button', { name: /cancel/i }).click();
  });
});
