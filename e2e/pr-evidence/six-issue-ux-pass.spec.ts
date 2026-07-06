import { test, expect } from '../user/fixtures/equipqr-test';
import { newPersonaPage, pinContextToApex, gotoDashboardRoute } from '../user/shared/auth-helpers';
import { expectNavigationLinkHidden } from '../user/shared/page-helpers';
import { seedEquipment, seedTeams, seedWorkOrders } from '../user/shared/seed-data';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

/**
 * Evidence for the six-issue UX pass:
 *   #1152 Parts Access sheet (managers + consumers from Inventory)
 *   #1144 PM template equipment assignment menu + EquipQR templates
 *   #1122 Audit log buried under org settings, owner/admin only
 *   #1132 Dedicated team views with team default
 *   #1151 Mobile quick access drawers (equipment + work order details)
 * (#1158 docs CSP fix is covered by help-center-branding.spec.ts.)
 */

test.describe('Six-issue UX pass — desktop @pr-evidence', () => {
  test('inventory Parts Access sheet manages both grants (#1152)', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard('/inventory');
    await assertHealthyShell();

    await page.getByRole('button', { name: /parts access/i }).click();

    await expect(page.getByRole('heading', { name: /parts access/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole('region', { name: 'Parts Managers' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Parts Consumers' })).toBeVisible();

    await evidencePause(page, 600);
    await evidenceScreenshot(page, '01-parts-access-sheet');

    // Functional proof: open the consumers picker (search + select all/none/inverse).
    await page
      .getByRole('region', { name: 'Parts Consumers' })
      .getByRole('button', { name: /add/i })
      .click();
    await expect(page.getByText('Add Parts Consumers')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: /select all/i })).toBeVisible();

    await evidencePause(page, 600);
    await evidenceScreenshot(page, '02-parts-consumers-picker');
    await page.keyboard.press('Escape');
  });

  test('PM template bulk assignment uses the team-scoped picker (#1144)', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard('/pm-templates');
    await assertHealthyShell();

    await expect(page.getByRole('heading', { name: /equipqr templates/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByText(/ready to use — assign directly, no clone needed/i).first(),
    ).toBeVisible();

    await evidencePause(page, 600);
    await evidenceScreenshot(page, '03-equipqr-templates-section');

    await page.getByRole('button', { name: /apply to equipment/i }).first().click();
    await expect(page.getByText(/^Apply /).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: /select all/i })).toBeVisible();

    await evidencePause(page, 600);
    await evidenceScreenshot(page, '04-apply-to-equipment-picker');

    // Functional proof: assign the template to the seeded excavator.
    const equipmentRow = page.getByText(seedEquipment.cat320.name).first();
    await expect(equipmentRow).toBeVisible({ timeout: 15_000 });
    const rowCheckbox = page
      .locator('li')
      .filter({ hasText: seedEquipment.cat320.name })
      .getByRole('checkbox')
      .first();
    if (!(await rowCheckbox.isDisabled().catch(() => true))) {
      await rowCheckbox.click();
      await page.getByRole('button', { name: /apply template/i }).click();
      await expect(page.getByText(/template assigned to 1 equipment record/i)).toBeVisible({
        timeout: 20_000,
      });
      await evidencePause(page, 600);
      await evidenceScreenshot(page, '05-template-applied-toast');
    } else {
      // Already the default from a previous run — the locked "Current default" badge is the proof.
      await expect(page.getByText(/current default/i).first()).toBeVisible();
      await evidenceScreenshot(page, '05-template-current-default');
      await page.keyboard.press('Escape');
    }
  });

  test('audit log lives under org settings and is admin-only (#1122)', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
    browser,
  }) => {
    // Main navigation no longer exposes the audit log.
    await gotoDashboard('/');
    await assertHealthyShell();
    await expectNavigationLinkHidden(page, /audit log/i);

    // Owner reaches it via Organization -> Audit Log, with the explorer mounted.
    await gotoDashboard('/organization/audit-log');
    await assertHealthyShell();
    await expect(page.getByRole('heading', { name: /audit log/i })).toBeVisible({
      timeout: 60_000,
    });
    await expect(
      page.getByRole('navigation', { name: /organization sections/i }),
    ).toBeVisible();
    await expect(page.getByTestId('audit-explorer')).toBeVisible({ timeout: 30_000 });

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '06-audit-log-under-org-settings');

    // Legacy bookmarks redirect.
    await gotoDashboard('/audit-log');
    await expect(page).toHaveURL(/\/dashboard\/organization\/audit-log/, { timeout: 30_000 });

    // Non-admin members are denied.
    const tech = await newPersonaPage(browser, 'technician');
    await pinContextToApex(tech.context);
    await gotoDashboardRoute(tech.page, '/organization/audit-log');
    await expect(tech.page.getByText(/access denied/i)).toBeVisible({ timeout: 30_000 });

    await evidencePause(tech.page, 600);
    await evidenceScreenshot(tech.page, '07-audit-log-denied-for-member');
    await tech.context.close();
  });

  test('work order details links managers to the pre-filtered audit log (#1122)', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard(`/work-orders/${seedWorkOrders.oilChange.id}`);
    await assertHealthyShell();

    const auditLink = page.getByRole('link', {
      name: /view field change history in the audit log/i,
    });
    await auditLink.scrollIntoViewIfNeeded();
    await expect(auditLink).toBeVisible({ timeout: 60_000 });

    await evidencePause(page, 600);
    await evidenceScreenshot(page, '08-work-order-audit-deep-link');

    await auditLink.click();
    await expect(page).toHaveURL(/organization\/audit-log\?entityType=work_order/, {
      timeout: 30_000,
    });
    await expect(page.getByTestId('audit-explorer')).toBeVisible({ timeout: 30_000 });

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '09-audit-log-prefiltered-for-work-order');
  });

  test('team details offers dedicated views with a team default (#1132)', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard(`/teams/${seedTeams.apexHeavyEquipment.id}`);
    await assertHealthyShell();

    await expect(page.getByRole('radio', { name: /internal team view/i })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByRole('radio', { name: /department view/i })).toBeVisible();
    await expect(page.getByRole('radio', { name: /customer view/i })).toBeVisible();

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '10-team-view-switcher');

    await page.getByRole('radio', { name: /customer view/i }).click();
    await expect(
      page
        .getByText(/no customer account linked/i)
        .or(page.getByText(/customer account/i))
        .first(),
    ).toBeVisible({ timeout: 15_000 });

    await evidencePause(page, 600);
    await evidenceScreenshot(page, '11-team-customer-view');

    // Persist a team default (button appears when the active view differs).
    await page.getByRole('radio', { name: /department view/i }).click();
    let saveDefault = page.getByRole('button', { name: /set as team default/i });
    if (!(await saveDefault.isVisible().catch(() => false))) {
      await page.getByRole('radio', { name: /internal team view/i }).click();
      saveDefault = page.getByRole('button', { name: /set as team default/i });
    }
    await expect(saveDefault).toBeVisible({ timeout: 15_000 });
    await saveDefault.click();
    await expect(page.getByText(/team default view saved/i)).toBeVisible({ timeout: 20_000 });

    await evidencePause(page, 600);
    await evidenceScreenshot(page, '12-team-default-view-saved');
  });
});

test.describe('Six-issue UX pass — mobile quick access (#1151) @pr-evidence', () => {
  const MOBILE_USER_AGENT =
    'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36';

  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent: MOBILE_USER_AGENT,
  });

  test('equipment details QAB opens the QR-first drawer', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard(`/equipment/${seedEquipment.cat320.id}`);
    await assertHealthyShell();

    const fab = page.getByRole('button', {
      name: new RegExp(`quick actions for ${seedEquipment.cat320.name}`, 'i'),
    });
    await expect(fab).toBeVisible({ timeout: 60_000 });

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '13-equipment-qab-fab');

    await fab.click();
    await expect(page.getByRole('button', { name: /equipment qr code/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('button', { name: /new pm work order/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /add note/i })).toBeVisible();

    await evidencePause(page, 600);
    await evidenceScreenshot(page, '14-equipment-qab-drawer');

    await page.getByRole('button', { name: /equipment qr code/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 30_000 });

    await evidencePause(page, 1000);
    await evidenceScreenshot(page, '15-equipment-qr-dialog');
  });

  test('work order quick actions consolidate status, capture, QR, and exports', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard(`/work-orders/${seedWorkOrders.oilChange.id}`);
    await assertHealthyShell();

    const quickActions = page.getByRole('button', { name: /open quick actions/i });
    await expect(quickActions).toBeVisible({ timeout: 60_000 });

    // The field footer must be viewport-pinned (fixed), not scrolled with
    // content — regression guard for the texture-grain position override.
    const footerBox = await quickActions.boundingBox();
    expect(footerBox).not.toBeNull();
    expect(footerBox!.y).toBeGreaterThan(400);
    expect(footerBox!.y + footerBox!.height).toBeLessThanOrEqual(845);

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '16-work-order-footer-quick-actions');

    await quickActions.click();
    const actionSheet = page.getByLabel('More work order options');
    await expect(actionSheet.getByText(/^Quick actions$/)).toBeVisible({ timeout: 15_000 });
    await expect(
      actionSheet.getByRole('button', { name: /show work order qr code/i }),
    ).toBeVisible();

    await evidencePause(page, 600);
    await evidenceScreenshot(page, '17-work-order-quick-actions-sheet');

    await actionSheet.getByRole('button', { name: /show work order qr code/i }).click();
    await expect(page.getByRole('heading', { name: /work order qr/i })).toBeVisible({
      timeout: 30_000,
    });

    await evidencePause(page, 1000);
    await evidenceScreenshot(page, '18-work-order-qr-dialog');
  });

  test('floating QAB anchors bottom-right when the field footer is hidden', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    // Completed work orders are locked, so the field footer is hidden and
    // the floating quick access button takes over.
    await gotoDashboard(`/work-orders/${seedWorkOrders.completed.id}`);
    await assertHealthyShell();

    const fab = page.getByRole('button', { name: /open work order quick actions/i });
    await expect(fab).toBeVisible({ timeout: 60_000 });

    // Regression guard (#1151 follow-up): .texture-grain > * forced
    // position:relative onto direct children after the Tailwind v4
    // migration, pulling this fixed FAB into the page flow at the left
    // edge. It must sit in the bottom-right corner of the 390x844 viewport.
    const fabBox = await fab.boundingBox();
    expect(fabBox).not.toBeNull();
    expect(fabBox!.x).toBeGreaterThan(300);
    expect(fabBox!.y).toBeGreaterThan(650);
    expect(fabBox!.y + fabBox!.height).toBeLessThanOrEqual(845);

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '19-completed-wo-floating-qab');

    await fab.click();
    const completedSheet = page.getByLabel('More work order options');
    await expect(completedSheet).toBeVisible({ timeout: 15_000 });
    await expect(
      completedSheet.getByRole('button', { name: /show work order qr code/i }),
    ).toBeVisible();

    await evidencePause(page, 600);
    await evidenceScreenshot(page, '20-completed-wo-quick-actions-sheet');
  });
});
