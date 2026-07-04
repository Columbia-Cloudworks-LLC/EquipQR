import { test, expect } from '../user/fixtures/equipqr-test';
import { pinContextToOrg } from '../user/shared/auth-helpers';
import { resetPendingApexInviteFixture } from '../user/shared/fresh-start-reset';
import {
  apexOrgId,
  authStatePath,
  pendingInviteePersonalOrgId,
  seedInvitations,
} from '../user/shared/seed-data';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

test.use({ storageState: authStatePath('pendingInvitee') });

test.describe('PR evidence: invite onboarding skip @pr-evidence', () => {
  test.beforeAll(async () => {
    await resetPendingApexInviteFixture();
  });

  test.beforeEach(async ({ context }) => {
    await pinContextToOrg(context, pendingInviteePersonalOrgId);
  });

  test('invited user accepts invitation and lands on apex dashboard without wizard', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard('/');
    await expect(page).toHaveURL(/\/dashboard/i, { timeout: 60_000 });
    await assertHealthyShell();
    await expect(page.getByTestId('getting-started-onboarding')).toHaveCount(0);

    await page.goto(`/invitation/${seedInvitations.pendingApex.token}`);
    await expect(page.getByText(/organization invitation/i)).toBeVisible({ timeout: 60_000 });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '01-invitation-accept-screen');

    await page.getByRole('button', { name: /accept invitation/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/?$/i, { timeout: 60_000 });
    await assertHealthyShell();
    await expect(page.getByTestId('getting-started-onboarding')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible({
      timeout: 30_000,
    });

    expect(await page.evaluate(() => localStorage.getItem('equipqr_current_organization'))).toBe(
      apexOrgId,
    );

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '02-invited-user-apex-dashboard-no-wizard');
    await evidencePause(page, 400);
  });
});
