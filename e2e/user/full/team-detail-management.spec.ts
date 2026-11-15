import { test, expect } from '../fixtures/equipqr-test';
import { personas, seedTeams } from '../shared/seed-data';

test.describe('team detail management @full', () => {
  test('team detail shows members and customer context', async ({ gotoDashboard, page, assertHealthyShell }) => {
    await gotoDashboard(`/teams/${seedTeams.apexHeavyEquipment.id}`);
    await assertHealthyShell();
    await expect(page.getByText('Team Members', { exact: true })).toBeVisible({ timeout: 60_000 });
    // Seeded Heavy Equipment team member (supabase/seeds/06_team_members.sql).
    await expect(page.getByText(personas.technician.displayName).first()).toBeVisible({
      timeout: 60_000,
    });
  });

  test('owner can open add member dialog', async ({ gotoDashboard, page, assertHealthyShell }) => {
    await gotoDashboard(`/teams/${seedTeams.apexHeavyEquipment.id}`);
    await assertHealthyShell();
    await page.getByRole('button', { name: /^add member$/i }).click({ timeout: 60_000 });
    await expect(page.getByRole('dialog', { name: /add team member/i })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('unknown team id shows team not found', async ({ gotoDashboard, page }) => {
    await gotoDashboard('/teams/00000000-0000-0000-0000-000000000099');
    await expect(page.getByText('Team not found')).toBeVisible({ timeout: 30_000 });
  });
});
