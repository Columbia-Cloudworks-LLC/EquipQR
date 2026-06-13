import { test, expect } from '../user/fixtures/equipqr-test';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

const INTEGRATIONS_PATH = '/dashboard/organization/integrations';
const WORKSPACE_ONBOARDING_PATH = '/dashboard/onboarding/workspace';

test.describe('Google Workspace disconnect UX @pr-evidence', () => {
  test('captures connect, disconnect dialog, and onboarding reset states', async ({
    gotoDashboard,
    page,
    assertHealthyShell,
  }) => {
    await gotoDashboard(INTEGRATIONS_PATH);
    await assertHealthyShell();

    const gwCard = page.locator('div.rounded-lg.border').filter({ hasText: 'Google Workspace' });
    await expect(gwCard.first()).toBeVisible({ timeout: 60_000 });

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '01-integrations-google-workspace');

    const disconnectButton = gwCard.getByRole('button', { name: /^Disconnect$/ });
    const connectButton = gwCard.getByRole('button', { name: /^Connect$/ });

    if (await disconnectButton.isVisible()) {
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
      return;
    }

    if (await connectButton.isVisible()) {
      await evidenceScreenshot(page, '02-disconnected-connect-state');
      await gotoDashboard(WORKSPACE_ONBOARDING_PATH);
      await assertHealthyShell();
      await evidencePause(page, 800);
      await evidenceScreenshot(page, '03-workspace-onboarding-reset-ready');
      await expect(page.getByText(/connect google workspace/i).first()).toBeVisible({
        timeout: 60_000,
      });
    }
  });
});
