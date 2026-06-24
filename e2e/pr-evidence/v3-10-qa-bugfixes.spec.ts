import { test, expect } from '../user/fixtures/equipqr-test';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

test.describe('v3.10.0 QA bug fixes @pr-evidence', () => {
  test('dashboard team filter, QR scan redirect, team not-found (#1074 #1075 #1076)', async ({
    page,
    gotoDashboard,
    assertHealthyShell,
  }) => {
    await gotoDashboard('/');
    await assertHealthyShell();
    await evidencePause(page, 800);
    await evidenceScreenshot(page, '01-dashboard-all-teams');

    const teamTrigger = page.getByRole('button', { name: /Switch team/i }).first();
    if (await teamTrigger.isVisible()) {
      await teamTrigger.click();
      const siteOps = page.getByRole('menuitem', { name: /Site Operations/i }).first();
      if (await siteOps.isVisible()) {
        await siteOps.click();
        await evidencePause(page, 1200);
        await evidenceScreenshot(page, '02-dashboard-team-scoped');
      }
    }

    await gotoDashboard('/teams/00000000-0000-0000-0000-000000000099');
    await expect(page.getByText('Team not found')).toBeVisible({ timeout: 15000 });
    await evidenceScreenshot(page, '03-team-not-found');

    await page.context().clearCookies();
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });

    await page.goto('/qr/equipment/aa0e8400-e29b-41d4-a716-446655440000');
    await page.waitForURL(/\/auth\?tab=signin/, { timeout: 15000 });
    await evidenceScreenshot(page, '04-qr-scan-signin-redirect');
  });
});
