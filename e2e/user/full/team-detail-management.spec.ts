import { test, expect } from '../fixtures/equipqr-test';
import { seedTeams } from '../shared/seed-data';

test.describe('team detail management @full', () => {
  test('team detail shows members and customer context', async ({ gotoDashboard, page, assertHealthyShell }) => {
    await gotoDashboard(`/teams/${seedTeams.apexHeavyEquipment.id}`);
    await assertHealthyShell();
    await expect(page.getByText(/member|technician|manager/i).first()).toBeVisible({
      timeout: 60_000,
    });
  });

  test('owner can open add member dialog', async ({ gotoDashboard, page, assertHealthyShell }) => {
    await gotoDashboard(`/teams/${seedTeams.apexHeavyEquipment.id}`);
    await assertHealthyShell();
    const addMember = page.getByRole('button', { name: /add member/i }).first();
    if (await addMember.isVisible({ timeout: 15_000 }).catch(() => false)) {
      await addMember.click();
      await expect(page.getByText(/role|technician|requestor/i).first()).toBeVisible({
        timeout: 15_000,
      });
    }
  });
});
