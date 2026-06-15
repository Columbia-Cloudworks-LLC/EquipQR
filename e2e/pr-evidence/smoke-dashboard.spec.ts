import { test, expect } from '../user/fixtures/equipqr-test';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

/**
 * Fallback PR evidence spec when no feature-specific capture exists yet.
 * Agents should add a focused spec (e.g. e2e/pr-evidence/gw-disconnect.spec.ts)
 * that walks the changed UI and captures before/after screenshots plus motion.
 */
test.describe('PR evidence smoke @pr-evidence', () => {
  test('dashboard shell renders on local stack', async ({ gotoDashboard, assertHealthyShell, page }) => {
    await gotoDashboard('/');
    await assertHealthyShell();
    await evidencePause(page, 800);
    await evidenceScreenshot(page, '01-dashboard-overview');
    await expect(page.getByRole('navigation').or(page.locator('[data-testid="app-sidebar"]'))).toBeVisible();
  });
});
