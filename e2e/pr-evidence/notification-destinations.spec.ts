import { test, expect } from '../user/fixtures/equipqr-test';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';
import { seedNotificationDestinationFixtures } from './shared/notification-destinations-seed';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test.describe('PR evidence notification destinations @pr-evidence', () => {
  test('taps open the matching team and work order', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    const fixtures = await seedNotificationDestinationFixtures();

    await gotoDashboard('/');
    await assertHealthyShell();

    const userMenu = page.getByRole('button', { name: /user menu/i }).first();
    await expect(userMenu).toBeVisible();
    await userMenu.click();

    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    await expect(menu.getByText(fixtures.teamMemberAdded.title)).toBeVisible({
      timeout: 30_000,
    });
    await expect(menu.getByText(fixtures.workOrderAssigned.title)).toBeVisible();
    await expect(menu.getByText('View →').first()).toBeVisible();
    await evidencePause(page, 600);
    await evidenceScreenshot({
      page,
      label: '01-user-menu-destination-ctas',
      target: menu,
    });

    await page.keyboard.press('Escape');
    await gotoDashboard('/notifications');
    await assertHealthyShell();

    const teamRow = page.getByRole('button', {
      name: new RegExp(escapeRegExp(fixtures.teamMemberAdded.title), 'i'),
    });
    const workOrderRow = page.getByRole('button', {
      name: new RegExp(escapeRegExp(fixtures.workOrderAssigned.title), 'i'),
    });
    await expect(teamRow).toBeVisible({ timeout: 30_000 });
    await expect(workOrderRow).toBeVisible();
    await expect(teamRow.getByText('Click to view team')).toBeVisible();
    await expect(workOrderRow.getByText('Click to view work order')).toBeVisible();
    await evidencePause(page, 600);
    await evidenceScreenshot({
      page,
      label: '02-notifications-page-destinations',
      target: teamRow,
    });

    await teamRow.click();
    await expect(page).toHaveURL(
      new RegExp(`/dashboard/teams/${fixtures.teamMemberAdded.teamId}(?:\\?|$)`),
      { timeout: 30_000 },
    );
    await assertHealthyShell();
    const teamHeading = page.getByRole('heading', { name: /heavy equipment team/i });
    await expect(teamHeading).toBeVisible({ timeout: 30_000 });
    await evidencePause(page, 600);
    await evidenceScreenshot({
      page,
      label: '03-team-destination',
      target: teamHeading,
    });

    await gotoDashboard('/notifications');
    await assertHealthyShell();
    await expect(workOrderRow).toBeVisible({ timeout: 30_000 });
    await workOrderRow.click();
    await expect(page).toHaveURL(
      new RegExp(`/dashboard/work-orders/${fixtures.workOrderAssigned.workOrderId}(?:\\?|$)`),
      { timeout: 30_000 },
    );
    await assertHealthyShell();
    const workOrderHeading = page.getByRole('heading', {
      name: new RegExp(escapeRegExp(fixtures.workOrderAssigned.workOrderTitle), 'i'),
    }).first();
    await expect(workOrderHeading).toBeVisible({ timeout: 30_000 });
    await evidencePause(page, 600);
    await evidenceScreenshot({
      page,
      label: '04-work-order-destination',
      target: workOrderHeading,
    });
  });
});
