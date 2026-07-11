/**
 * Help Center docs media — "Start Here" collection, mobile (#1161).
 *
 * Mobile companion to docs-start-here-desktop.spec.ts: bottom-navigation
 * tour, invite flow, and role overview at phone viewport.
 *
 * Capture:
 *   .\scripts\pr-evidence\Invoke-PrEvidence.ps1 -Flow "docs-start-here-mobile" `
 *     -Spec "e2e/pr-evidence/docs-start-here-mobile.spec.ts" -MobileViewport
 * Publish:
 *   .\scripts\docs-media\Publish-DocsMedia.ps1 `
 *     -ManifestPath tmp\pr-evidence\docs-start-here-mobile\manifest.json `
 *     -Collection start-here -Variant mobile
 */

import { test, expect } from '../user/fixtures/equipqr-test';
import { evidenceScreenshot } from './shared/evidence-helpers';
import { focusAndClick, focusAndFill, focusControl, settleForDemo } from './shared/docs-demo-helpers';

test.describe('Docs media: Start Here mobile @pr-evidence', () => {
  test('mobile dashboard, bottom navigation, invite member, and roles', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    // --- welcome-to-equipqr on a phone ---
    await gotoDashboard('/');
    await assertHealthyShell();
    await settleForDemo(page);
    await evidenceScreenshot(page, '01-mobile-dashboard-welcome', {
      target: page.getByRole('heading', { name: /dashboard/i }).first(),
    });

    // --- navigation-tour: bottom navigation ---
    await focusAndClick(page, page.getByRole('link', { name: /equipment/i }).last());
    await expect(page).toHaveURL(/\/dashboard\/equipment/, { timeout: 60_000 });
    await settleForDemo(page);
    await evidenceScreenshot(page, '02-mobile-nav-equipment');

    await focusAndClick(page, page.getByRole('link', { name: /^orders$|work orders/i }).last());
    await expect(page).toHaveURL(/\/dashboard\/work-orders/, { timeout: 60_000 });
    await settleForDemo(page);
    await evidenceScreenshot(page, '03-mobile-nav-work-orders');

    // --- invite-team-members ---
    await gotoDashboard('/organization/members');
    await assertHealthyShell();
    await settleForDemo(page);

    await focusAndClick(page, page.getByRole('button', { name: /invite member/i }).first());
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: /invite new member/i })).toBeVisible({
      timeout: 30_000,
    });
    await focusAndFill(
      page,
      dialog.getByLabel(/email address/i),
      `docs.demo.invite.m.${Date.now()}@example.com`,
    );
    await settleForDemo(page, 600);
    await evidenceScreenshot(page, '04-mobile-invite-member-dialog', {
      target: dialog.getByRole('heading', { name: /invite new member/i }),
    });
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden({ timeout: 15_000 });

    // --- role-overview ---
    await focusControl(page, page.getByText(/owner|admin|member/i).first());
    await evidenceScreenshot(page, '05-mobile-organization-roles');
  });
});
