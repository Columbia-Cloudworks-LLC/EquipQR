/**
 * Help Center docs media — "Start Here" collection, desktop (#1161).
 *
 * One continuous demo capturing the four Start Here articles:
 *   welcome-to-equipqr, navigation-tour, invite-team-members, role-overview.
 *
 * Capture:
 *   .\scripts\pr-evidence\Invoke-PrEvidence.ps1 -Flow "docs-start-here-desktop" `
 *     -Spec "e2e/pr-evidence/docs-start-here-desktop.spec.ts"
 * Publish:
 *   .\scripts\docs-media\Publish-DocsMedia.ps1 `
 *     -ManifestPath tmp\pr-evidence\docs-start-here-desktop\manifest.json `
 *     -Collection start-here -Variant desktop
 */

import { test, expect } from '../user/fixtures/equipqr-test';
import { evidenceScreenshot } from './shared/evidence-helpers';
import { focusAndClick, focusAndFill, focusControl, settleForDemo } from './shared/docs-demo-helpers';

test.describe('Docs media: Start Here desktop @pr-evidence', () => {
  test('dashboard welcome, navigation tour, invite member, and role overview', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    // --- welcome-to-equipqr: the signed-in home base ---
    await gotoDashboard('/');
    await assertHealthyShell();
    await expect(page.getByRole('navigation').first()).toBeVisible({ timeout: 60_000 });
    await settleForDemo(page);
    await evidenceScreenshot(page, '01-dashboard-welcome');

    // --- navigation-tour: sidebar destinations ---
    const sidebar = page.getByRole('navigation').first();
    await focusControl(page, sidebar);

    await focusAndClick(page, page.getByRole('link', { name: /^equipment$/i }).first());
    await settleForDemo(page);
    await evidenceScreenshot(page, '02-navigation-equipment');

    await focusAndClick(page, page.getByRole('link', { name: /work orders/i }).first());
    await settleForDemo(page);
    await evidenceScreenshot(page, '03-navigation-work-orders');

    await focusAndClick(page, page.getByRole('link', { name: /fleet map/i }).first());
    await settleForDemo(page);
    await evidenceScreenshot(page, '04-navigation-fleet-map');

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
      `docs.demo.invite.${Date.now()}@example.com`,
    );
    await settleForDemo(page, 600);
    await evidenceScreenshot(page, '05-invite-member-dialog');

    await focusAndClick(page, dialog.getByRole('button', { name: /send invitation|invite/i }).last());
    await expect(dialog).toBeHidden({ timeout: 30_000 });
    await settleForDemo(page);
    await evidenceScreenshot(page, '06-invite-sent-members-list');

    // --- role-overview: organization roles and team roles ---
    await focusControl(page, page.getByRole('row').nth(1));
    await evidenceScreenshot(page, '07-organization-member-roles');

    await gotoDashboard('/teams');
    await assertHealthyShell();
    await settleForDemo(page);
    await evidenceScreenshot(page, '08-teams-role-overview');
  });
});
