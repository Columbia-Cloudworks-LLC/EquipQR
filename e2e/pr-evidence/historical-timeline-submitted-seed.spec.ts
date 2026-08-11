import { test, expect } from '../user/fixtures/equipqr-test';
import { pinContextToOrg } from '../user/shared/auth-helpers';
import {
  cursedHistoricalOrgId,
  cursedHistoricalWorkOrders,
} from '../user/shared/seed-data';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';
import {
  legacyTimelineEvidenceWorkOrderId,
  resetLegacyAcceptedTimelineEvidenceFixture,
} from './shared/legacy-timeline-evidence-seed';

test.describe('PR evidence: cursed historical timeline submitted seed @pr-evidence', () => {
  test.beforeEach(async ({ context }) => {
    await pinContextToOrg(context, cursedHistoricalOrgId);
    await resetLegacyAcceptedTimelineEvidenceFixture();
  });

  test('repairs durable cursed accepted-first timelines so event 2 offers Accepted', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    test.setTimeout(180_000);

    await gotoDashboard(`/dashboard/work-orders/${legacyTimelineEvidenceWorkOrderId}`);
    await assertHealthyShell();
    await expect(
      page.getByRole('heading', {
        name: new RegExp(cursedHistoricalWorkOrders.acceptedFirstStub.title, 'i'),
      }),
    ).toBeVisible({
      timeout: 30_000,
    });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '01-cursed-legacy-historical-work-order-details');

    await page.getByRole('button', { name: /edit timeline/i }).click();
    const editDialog = page.getByRole('dialog').filter({ hasText: /timeline editor/i });
    await expect(editDialog).toBeVisible({ timeout: 15_000 });

    const eventTwoStatus = editDialog.getByLabel(/^Status$/i).nth(1);
    await expect(eventTwoStatus).toBeVisible({ timeout: 15_000 });
    await eventTwoStatus.click();
    await expect(page.getByRole('option', { name: /^Accepted$/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('option', { name: /^Cancelled$/i })).toBeVisible({ timeout: 15_000 });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '02-event-two-accepted-available');

    await page.keyboard.press('Escape');
    await editDialog.getByRole('button', { name: /save timeline/i }).click();
    await expect(editDialog).toBeHidden({ timeout: 15_000 });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '03-cursed-legacy-timeline-saved');
  });
});
