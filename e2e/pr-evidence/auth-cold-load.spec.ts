import { test, expect } from '../user/fixtures/equipqr-test';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

/**
 * PR evidence for #1319 — AuthProvider cold-load bootstrap via INITIAL_SESSION only
 * (no parallel getSession race). Proves a hard reload still lands a healthy shell.
 */
test.describe('PR evidence auth cold load @pr-evidence', () => {
  test('dashboard stays healthy after hard reload', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard('/');
    await assertHealthyShell();

    const mainNav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(mainNav).toBeVisible();
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '01-dashboard-before-reload', { target: mainNav });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await assertHealthyShell();
    await expect(mainNav).toBeVisible();
    await evidencePause(page, 800);
    await evidenceScreenshot(page, '02-dashboard-after-cold-reload', { target: mainNav });
  });
});
