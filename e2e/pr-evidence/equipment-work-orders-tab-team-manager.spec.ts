import { test, expect } from '../user/fixtures/equipqr-test';
import { pinContextToApex } from '../user/shared/auth-helpers';
import { authStatePath } from '../user/shared/seed-data';
import { evidencePause, evidenceScreenshot } from './shared/evidence-helpers';

/**
 * #1729: a manager of the equipment's team (who is not an org owner/admin)
 * gets the assign control on the equipment's Work Orders tab.
 *
 * The seed has no member-role team manager, so before capture, make Tom
 * Technician (org member) a manager of Heavy Equipment Team on the LOCAL db,
 * and restore it afterwards:
 *
 *   update team_members set role = 'manager'
 *    where id = 'dd0e8400-e29b-41d4-a716-446655440002';
 *   -- after capture:
 *   update team_members set role = 'technician'
 *    where id = 'dd0e8400-e29b-41d4-a716-446655440002';
 */
const EQUIPMENT_ID = 'aa0e8400-e29b-41d4-a716-446655440001'; // John Deere 850L Dozer, Heavy Equipment Team

test.describe('Equipment Work Orders tab, team manager @pr-evidence', () => {
  test.use({ storageState: authStatePath('technician') });

  test('team manager gets the assign control on the equipment tab', async ({ page, gotoDashboard }) => {
    await pinContextToApex(page.context());
    await gotoDashboard(`/equipment/${EQUIPMENT_ID}?tab=work-orders`);

    await expect(page.getByRole('heading', { name: 'Work Orders', level: 3 })).toBeVisible({ timeout: 60_000 });
    await evidencePause(page, 800);

    const title = page.getByText('Replace Hydraulic Filter', { exact: true }).first();
    const card = page.locator('[role="button"]').filter({ has: title }).last();
    await expect(card).toBeVisible({ timeout: 60_000 });

    // The assignee chip is the Quick Assignment popover trigger only when
    // canEditAssignment is true. Before #1729 it was plain text for managers.
    const assignTrigger = card.getByText('Unassigned', { exact: true });
    await expect(assignTrigger).toHaveAttribute('aria-haspopup', 'dialog');
    await evidencePause(page, 800);
    await evidenceScreenshot(page, '01-team-manager-assign-control', { target: card });
  });
});
