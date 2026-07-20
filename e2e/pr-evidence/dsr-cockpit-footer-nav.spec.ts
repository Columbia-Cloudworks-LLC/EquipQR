import { test, expect } from '../user/fixtures/equipqr-test';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

/**
 * PR evidence: DSR Cockpit moved out of the sidebar into Legal footer + Settings → Privacy.
 */
test.describe('PR evidence DSR cockpit footer nav @pr-evidence', () => {
  test('owner opens DSR Cockpit from Legal footer and Settings Privacy', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard('/');
    await assertHealthyShell();

    const mainNav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(mainNav).toBeVisible();
    await expect(mainNav.getByRole('link', { name: /dsr cockpit/i })).toHaveCount(0);
    await evidencePause(page, 500);
    await evidenceScreenshot(page, '01-sidebar-no-dsr', { target: mainNav });

    const legalTrigger = page.getByRole('button', { name: /legal links/i });
    await expect(legalTrigger).toBeVisible();
    await legalTrigger.click();
    const legalMenu = page.getByRole('menu');
    await expect(legalMenu).toBeVisible();
    const footerDsr = legalMenu.getByRole('menuitem', { name: /dsr cockpit/i });
    await expect(footerDsr).toBeVisible();
    await evidencePause(page, 400);
    await evidenceScreenshot(page, '02-legal-footer-dsr', { target: legalMenu });

    await footerDsr.click();
    await expect(page).toHaveURL(/\/dashboard\/dsr\/?$/);
    await assertHealthyShell();
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '03-dsr-cockpit-from-footer');

    await gotoDashboard('/settings');
    await assertHealthyShell();
    const privacyHeading = page.getByRole('heading', { name: /^privacy$/i });
    await expect(privacyHeading).toBeVisible();
    await privacyHeading.scrollIntoViewIfNeeded();
    const settingsDsr = page.getByRole('link', { name: /dsr cockpit/i });
    await expect(settingsDsr).toBeVisible();
    await evidencePause(page, 400);
    await evidenceScreenshot(page, '04-settings-privacy-dsr', { target: settingsDsr });

    await settingsDsr.click();
    await expect(page).toHaveURL(/\/dashboard\/dsr\/?$/);
    await assertHealthyShell();
    await evidencePause(page, 500);
    await evidenceScreenshot(page, '05-dsr-cockpit-from-settings');
  });
});
