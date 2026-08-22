import { test, expect } from '../user/fixtures/equipqr-test';
import { seedTeams } from '../user/shared/seed-data';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';
import {
  notificationDestinationFixtures,
  seedNotificationDestinationFixtures,
} from './shared/notification-destinations-seed';

test.describe('PR evidence notification destinations @pr-evidence', () => {
  test('taps open the matching team and work order', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await seedNotificationDestinationFixtures();

    await gotoDashboard('/');
    await assertHealthyShell();

    const userMenu = page.getByRole('button', { name: /user menu/i }).first();
    await expect(userMenu).toBeVisible();
    await userMenu.click();

    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    await expect(menu.getByText(notificationDestinationFixtures.teamMemberAdded.title)).toBeVisible({
      timeout: 30_000,
    });
    await expect(menu.getByText(notificationDestinationFixtures.workOrderAssigned.title)).toBeVisible();
    await expect(menu.getByText('View →').first()).toBeVisible();
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '01-user-menu-destination-ctas', { target: menu });

    await page.keyboard.press('Escape');
    await gotoDashboard('/notifications');
    await assertHealthyShell();

    const teamRow = page.getByRole('button', {
      name: new RegExp(notificationDestinationFixtures.teamMemberAdded.title, 'i'),
    });
    const workOrderRow = page.getByRole('button', {
      name: new RegExp(notificationDestinationFixtures.workOrderAssigned.title, 'i'),
    });
    await expect(teamRow).toBeVisible({ timeout: 30_000 });
    await expect(workOrderRow).toBeVisible();
    await expect(page.getByText('Click to view team')).toBeVisible();
    await expect(page.getByText('Click to view work order')).toBeVisible();
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '02-notifications-page-destinations', { target: teamRow });

    await teamRow.click();
    await expect(page).toHaveURL(
      new RegExp(`/dashboard/teams/${notificationDestinationFixtures.teamMemberAdded.teamId}`),
      { timeout: 30_000 },
    );
    await assertHealthyShell();
    await expect(page.getByText(seedTeams.apexHeavyEquipment.name)).toBeVisible({
      timeout: 30_000,
    });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '03-team-destination');

    await gotoDashboard('/notifications');
    await assertHealthyShell();
    await expect(workOrderRow).toBeVisible({ timeout: 30_000 });
    await workOrderRow.click();
    await expect(page).toHaveURL(
      new RegExp(
        `/dashboard/work-orders/${notificationDestinationFixtures.workOrderAssigned.workOrderId}`,
      ),
      { timeout: 30_000 },
    );
    await assertHealthyShell();
    await expect(
      page.getByRole('heading', {
        name: new RegExp(notificationDestinationFixtures.workOrderAssigned.workOrderTitle, 'i'),
      }).first(),
    ).toBeVisible({ timeout: 60_000 });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '04-work-order-destination');
  });
});
