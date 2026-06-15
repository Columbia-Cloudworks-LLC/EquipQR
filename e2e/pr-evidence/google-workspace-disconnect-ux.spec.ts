import { test, expect } from '../user/fixtures/equipqr-test';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';
import {
  assertGoogleWorkspaceConnected,
  assertRealAuthDashboard,
  googleWorkspaceCard,
  gotoRealAuthIntegrations,
} from './shared/real-auth-helpers';
import {
  hasRealAuthStorageState,
  missingRealAuthStorageMessage,
} from '../user/shared/real-auth-config';

const WORKSPACE_ONBOARDING_PATH = '/dashboard/onboarding/workspace';

test.describe('Google Workspace disconnect UX @pr-evidence @real-auth', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(!hasRealAuthStorageState(), missingRealAuthStorageMessage());
    testInfo.setTimeout(180_000);
  });

  test('captures connected, disconnect dialog, and onboarding reset states', async ({
    page,
    assertHealthyShell,
  }) => {
    await assertRealAuthDashboard(page);
    await gotoRealAuthIntegrations(page);
    await assertHealthyShell();
    await assertGoogleWorkspaceConnected(page);

    const gwCard = googleWorkspaceCard(page);

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '01-integrations-google-workspace-connected');

    const disconnectButton = gwCard.getByRole('button', { name: /^Disconnect$/ });
    await expect(disconnectButton).toBeVisible({ timeout: 15_000 });
    await disconnectButton.click();

    await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 15_000 });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '02-disconnect-confirmation-dialog');

    await page.getByRole('button', { name: /^Disconnect Google Workspace$/ }).click();
    await expect(page).toHaveURL(/\/dashboard\/onboarding\/workspace/i, { timeout: 60_000 });
    await assertHealthyShell();
    await evidencePause(page, 800);
    await evidenceScreenshot(page, '03-post-disconnect-onboarding');
    await expect(page.getByText(/connect google workspace/i).first()).toBeVisible({
      timeout: 60_000,
    });

    await page.goto(WORKSPACE_ONBOARDING_PATH);
    await assertHealthyShell();
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '04-workspace-onboarding-reset-ready');
  });
});
