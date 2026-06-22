import { test, expect } from '../user/fixtures/equipqr-test';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';
import {
  assertRealAuthDashboard,
  googleWorkspaceCard,
  gotoRealAuthIntegrations,
} from './shared/real-auth-helpers';
import {
  hasRealAuthStorageState,
  missingRealAuthStorageMessage,
} from '../user/shared/real-auth-config';

test.describe('Google OAuth compliance @pr-evidence @real-auth', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(!hasRealAuthStorageState(), missingRealAuthStorageMessage());
    testInfo.setTimeout(180_000);
  });

  test('captures Google Workspace integrations states for incremental consent UX', async ({
    page,
    assertHealthyShell,
  }) => {
    await assertRealAuthDashboard(page);
    await gotoRealAuthIntegrations(page);
    await assertHealthyShell();

    const gwCard = googleWorkspaceCard(page);
    await expect(gwCard).toBeVisible({ timeout: 30_000 });

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '01-integrations-google-workspace-card');

    const finishAuthorization = gwCard.getByRole('button', { name: /finish authorization/i });
    if (await finishAuthorization.isVisible().catch(() => false)) {
      await evidencePause(page, 600);
      await evidenceScreenshot(page, '02-finish-authorization-export-consent');
    }

    const grantDriveButton = page.getByRole('button', { name: /grant drive permissions/i });
    if (await grantDriveButton.isVisible().catch(() => false)) {
      await evidencePause(page, 600);
      await evidenceScreenshot(page, '03-grant-drive-permissions-export-consent');
    }
  });
});
