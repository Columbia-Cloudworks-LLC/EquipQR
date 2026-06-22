import { test, expect } from '../user/fixtures/equipqr-test';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';
import { googleWorkspaceCard } from './shared/real-auth-helpers';

const INTEGRATIONS_PATH = '/dashboard/organization/integrations';

test.describe('Google OAuth compliance @pr-evidence', () => {
  test('captures Google Workspace integrations card for incremental consent UX', async ({
    page,
    assertHealthyShell,
  }) => {
    await page.goto(INTEGRATIONS_PATH);
    await assertHealthyShell();

    const gwCard = googleWorkspaceCard(page);
    await expect(gwCard).toBeVisible({ timeout: 60_000 });
    await evidencePause(page, 800);
    await evidenceScreenshot(page, '01-integrations-google-workspace-card');

    const connectButton = gwCard.getByRole('button', { name: /^Connect$/ }).first();
    await expect(connectButton).toBeVisible({ timeout: 30_000 });
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '02-google-workspace-connect-directory-first');
  });
});
