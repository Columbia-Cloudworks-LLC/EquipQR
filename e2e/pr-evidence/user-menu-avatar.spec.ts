import { test, expect } from '../user/fixtures/equipqr-test';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

/**
 * PR evidence for #1378 — TopBar user menu shows resolved avatar
 * (EquipQR upload override, Google metadata fallback, or initials).
 */
test.describe('PR evidence user menu avatar @pr-evidence', () => {
  test('user menu trigger and open menu show avatar chrome', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard('/');
    await assertHealthyShell();

    const userMenu = page.getByRole('button', { name: /user menu/i }).first();
    await expect(userMenu).toBeVisible();
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '01-user-menu-trigger', { target: userMenu });

    await userMenu.click();
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    await expect(menu.getByText(/@/)).toBeVisible();
    await evidencePause(page, 500);
    await evidenceScreenshot(page, '02-user-menu-open', { target: menu });

    await page.getByRole('link', { name: /^settings$/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/settings/);
    await assertHealthyShell();
    const profileSection = page.locator('#profile');
    await expect(profileSection).toBeVisible();
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '03-settings-profile-avatar', { target: profileSection });
  });
});
