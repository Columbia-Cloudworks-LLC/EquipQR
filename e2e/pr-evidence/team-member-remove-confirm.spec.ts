import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../user/fixtures/equipqr-test';
import { pinContextToOrg } from '../user/shared/auth-helpers';
import { apexOrgId, seedTeams } from '../user/shared/seed-data';
import { evidencePause, evidenceScreenshot } from './shared/evidence-helpers';

const removableCandidateNames = [
  /Tom Technician/i,
  /Amanda Admin/i,
  /Multi Org User/i,
] as const;

async function getRemovableMemberRow(page: Page): Promise<Locator> {
  for (const name of removableCandidateNames) {
    const row = page.getByRole('row').filter({ hasText: name }).first();
    if (await row.count()) {
      return row;
    }
  }

  throw new Error('No removable seeded team member row found on Heavy Equipment Team.');
}

test.describe('PR evidence team member removal confirm @pr-evidence', () => {
  test.beforeEach(async ({ context }) => {
    await pinContextToOrg(context, apexOrgId);
  });

  test('owner confirms team-member removal from the team details gear menu', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard(`/dashboard/teams/${seedTeams.apexHeavyEquipment.id}`);
    await assertHealthyShell();

    await expect(
      page.getByRole('heading', { name: seedTeams.apexHeavyEquipment.name }),
    ).toBeVisible({ timeout: 60_000 });

    const memberRow = await getRemovableMemberRow(page);
    const actionsButton = memberRow.getByRole('button', { name: /actions for/i });

    await expect(actionsButton).toBeVisible({ timeout: 15_000 });
    await actionsButton.click();

    const removeItem = page.getByRole('menuitem', { name: /remove from team/i });
    await expect(removeItem).toBeVisible({ timeout: 15_000 });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '01-team-member-remove-menu', { target: removeItem });

    await removeItem.click();

    const confirmDialog = page.getByRole('alertdialog');
    await expect(
      confirmDialog.getByRole('heading', { name: /remove member from team\?/i }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      confirmDialog.getByText(/organization access stays unchanged/i),
    ).toBeVisible();
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '02-team-member-remove-confirm', { target: confirmDialog });

    await confirmDialog.getByRole('button', { name: /cancel/i }).click();
    await expect(confirmDialog).toBeHidden({ timeout: 15_000 });
    await expect(memberRow).toBeVisible({ timeout: 15_000 });

    await actionsButton.click();
    await expect(removeItem).toBeVisible({ timeout: 15_000 });
    await removeItem.click();

    await expect(confirmDialog).toBeVisible({ timeout: 15_000 });
    await confirmDialog.getByRole('button', { name: /remove from team/i }).click();

    await expect(memberRow).toHaveCount(0, { timeout: 30_000 });
    await expect(page.getByText(/team member removed successfully/i)).toBeVisible({
      timeout: 15_000,
    });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '03-team-member-removed-list', {
      target: page.getByRole('table').first(),
    });
  });
});
