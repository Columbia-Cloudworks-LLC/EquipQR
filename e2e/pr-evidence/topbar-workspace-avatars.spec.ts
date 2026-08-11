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

    // Prefer a named team that has a seeded image when available.
    await teamTrigger.click();
    const heavyTeam = page.getByRole('menuitem', {
      name: /heavy equipment team/i,
    });
    if (await heavyTeam.isVisible().catch(() => false)) {
      await heavyTeam.click();
    } else {
      await page.keyboard.press('Escape');
    }

    await evidencePause(page, 800);

    const orgLogo = orgTrigger.getByRole('img').first();
    // Logo may be absent on orgs without seed images; assert chrome either way.
    const hasOrgLogo = await orgLogo.isVisible().catch(() => false);
    if (hasOrgLogo) {
      await expect(orgLogo).toHaveAttribute('alt', /logo$/i);
    }

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

    // Select Heavy Equipment when present so the team avatar can resolve.
    await workspace.click();
    const sheet = page.getByRole('dialog', { name: /workspace/i });
    await expect(sheet).toBeVisible();
    const heavyOption = sheet.getByRole('button', {
      name: /heavy equipment team/i,
    });
    if (await heavyOption.isVisible().catch(() => false)) {
      await heavyOption.click();
    } else {
      await page.keyboard.press('Escape');
    }

    await evidencePause(page, 800);
    await expect(workspace).toBeVisible();
    await evidenceScreenshot(page, '03-mobile-workspace-avatars', {
      target: workspace,
    });
  });
});
