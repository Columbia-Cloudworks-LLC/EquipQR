import { test, expect } from '../user/fixtures/equipqr-test';
import { newPersonaPage, gotoDashboardRoute } from '../user/shared/auth-helpers';
import { metroOrgId, seedWorkOrders } from '../user/shared/seed-data';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

const bobcatEquipmentId = 'aa0e8400-e29b-41d4-a716-44665544f109';

test.describe('Limited role cost obliviousness @pr-evidence', () => {
  test('team viewer sees status only — no costs, labor, parts, or cost widgets', async ({ browser }) => {
    // Alex Apex is a team *viewer* on Metro's Customer Service Team.
    const { context, page } = await newPersonaPage(browser, 'owner', { pinOrgId: metroOrgId });

    // 1. Work order details: status/pipeline visible, cost + labor data absent
    await gotoDashboardRoute(page, `/work-orders/${seedWorkOrders.viewerBobcatPm.id}`);
    await expect(
      page.getByRole('heading', { name: new RegExp(seedWorkOrders.viewerBobcatPm.title, 'i') }).first(),
    ).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/work order status/i).first()).toBeVisible({ timeout: 30_000 });

    await expect(page.getByText(/itemized costs/i)).toHaveCount(0);
    await expect(page.getByText(/estimated: [\d.]+h/i)).toHaveCount(0);
    await expect(page.getByTitle('Hours worked')).toHaveCount(0);

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '01-viewer-work-order-status-only');

    // 2. Equipment details: no Parts tab for users without inventory access
    await gotoDashboardRoute(page, `/equipment/${bobcatEquipmentId}`);
    await expect(page.getByRole('heading', { name: /bobcat s570/i }).first()).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByRole('tab', { name: /parts/i })).toHaveCount(0);

    await evidencePause(page, 600);
    await evidenceScreenshot(page, '02-viewer-equipment-no-parts-tab');

    // 3. Direct ?tab=parts deep link bounces back — no compatible parts data
    await gotoDashboardRoute(page, `/equipment/${bobcatEquipmentId}?tab=parts`);
    await expect(page.getByRole('heading', { name: /bobcat s570/i }).first()).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText(/compatible parts/i)).toHaveCount(0);

    await evidencePause(page, 600);
    await evidenceScreenshot(page, '03-viewer-parts-deep-link-bounced');

    // 4. Widget catalog: Cost Trend widget is not offered to limited roles
    await gotoDashboardRoute(page, '/');
    await page.getByRole('button', { name: /dashboard settings/i }).click();
    await page.getByRole('menuitem', { name: /customize widgets/i }).click();
    await page.getByRole('button', { name: /add widgets/i }).click();
    await expect(page.getByRole('heading', { name: /widget catalog/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/cost trend/i)).toHaveCount(0);

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '04-viewer-widget-catalog-no-cost-trend');

    await context.close();
  });

  test('org owner keeps full cost visibility on the same work order', async ({ browser }) => {
    const { context, page } = await newPersonaPage(browser, 'metroOwner', {
      pinOrgId: metroOrgId,
    });

    // Costs section still renders for staff (regression guard)
    await gotoDashboardRoute(page, `/work-orders/${seedWorkOrders.viewerBobcatPm.id}`);
    await expect(
      page.getByRole('heading', { name: new RegExp(seedWorkOrders.viewerBobcatPm.title, 'i') }).first(),
    ).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/itemized costs/i).first()).toBeVisible({ timeout: 30_000 });

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '05-owner-itemized-costs-visible');

    // Parts tab still available for inventory-authorized staff
    await gotoDashboardRoute(page, `/equipment/${bobcatEquipmentId}?tab=parts`);
    await expect(page.getByRole('heading', { name: /bobcat s570/i }).first()).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText(/compatible parts/i).first()).toBeVisible({ timeout: 30_000 });

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '06-owner-parts-tab-visible');

    await context.close();
  });
});
