import { test, expect } from '../user/fixtures/equipqr-test';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

/**
 * PR evidence for #1379 — TopBar workspace context shows org logo and
 * selected-team avatar (desktop breadcrumb + mobile side-by-side row).
 */
test.describe('PR evidence TopBar workspace avatars @pr-evidence', () => {
  test('desktop TopBar shows org logo and selected team image', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard('/');
    await assertHealthyShell();

    const orgTrigger = page.getByRole('button', {
      name: /switch organization \(current:/i,
    });
    await expect(orgTrigger).toBeVisible();

    const teamTrigger = page.getByRole('button', {
      name: /switch team \(current:/i,
    });
    await expect(teamTrigger).toBeVisible();

    // Apex's logo and the Heavy Equipment team image are seeded (supabase/seed-images/README.md).
    await teamTrigger.click();
    await page.getByRole('menuitem', { name: /heavy equipment team/i }).click();

    await evidencePause(page, 800);

    await expect(orgTrigger.getByRole('img', { name: /apex construction company logo/i })).toBeVisible();
    await expect(
      page.getByRole('img', { name: /heavy equipment team team image/i }).first(),
    ).toBeVisible({ timeout: 30_000 });

    const refreshedTeamTrigger = page.getByRole('button', {
      name: /switch team \(current:/i,
    });
    await expect(refreshedTeamTrigger).toBeVisible();

    const topBar = page.locator('header').first();
    await evidenceScreenshot(page, '01-desktop-topbar-workspace-avatars', {
      target: topBar,
    });

    await refreshedTeamTrigger.click();
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    await evidenceScreenshot(page, '02-desktop-team-menu', { target: menu });
  });

  test('mobile workspace control shows side-by-side avatars', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoDashboard('/');
    await assertHealthyShell();

    const workspace = page.getByRole('button', { name: /workspace:/i });
    await expect(workspace).toBeVisible();

    // Select Heavy Equipment so the seeded team image shows beside the org logo.
    await workspace.click();
    const sheet = page.getByRole('dialog', { name: /workspace/i });
    await expect(sheet).toBeVisible();
    await sheet.getByRole('button', { name: /heavy equipment team/i }).click();

    await evidencePause(page, 800);
    await expect(workspace).toBeVisible();
    await expect(workspace.getByRole('img', { name: /apex construction company logo/i })).toBeVisible();
    await expect(
      workspace.getByRole('img', { name: /heavy equipment team team image/i }),
    ).toBeVisible({ timeout: 30_000 });
    await evidenceScreenshot(page, '03-mobile-workspace-avatars', {
      target: workspace,
    });
  });
});
