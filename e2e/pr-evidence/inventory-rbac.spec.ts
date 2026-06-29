import { test, expect } from '../user/fixtures/equipqr-test';
import { newPersonaPage, pinContextToApex, gotoDashboardRoute } from '../user/shared/auth-helpers';
import {
  expectNavigationLinkHidden,
  expectNavigationLinkVisible,
} from '../user/shared/page-helpers';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

test.describe('Inventory RBAC @pr-evidence', () => {
  test('owner sees inventory navigation and members Parts Consumer toggle', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard('/organization/members');
    await assertHealthyShell();

    await expect(page.getByRole('switch', { name: /parts consumer/i }).first()).toBeVisible({
      timeout: 30_000,
    });

    await gotoDashboard('/inventory');
    await assertHealthyShell();
    await expect(page.getByRole('heading', { name: /inventory/i })).toBeVisible({ timeout: 30_000 });

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '01-owner-inventory-access');
  });

  test('technician without grant is denied inventory surfaces', async ({ browser }) => {
    const { context, page } = await newPersonaPage(browser, 'technician');
    await pinContextToApex(context);
    await gotoDashboardRoute(page, '/');

    await expectNavigationLinkHidden(page, /^inventory$/i);
    await expectNavigationLinkHidden(page, /part lookup/i);
    await expectNavigationLinkHidden(page, /part alternates/i);

    await gotoDashboardRoute(page, '/inventory');
    await expect(page.getByText(/inventory access required/i)).toBeVisible({ timeout: 30_000 });

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '02-technician-inventory-denied');
    await context.close();
  });

  test('admin can grant parts consumer and technician gets read-only inventory', async ({
    browser,
  }) => {
    const adminContext = await newPersonaPage(browser, 'admin');
    await pinContextToApex(adminContext.context);
    const adminPage = adminContext.page;

    await gotoDashboardRoute(adminPage, '/organization/members');
    const tomRow = adminPage.getByRole('row').filter({ hasText: /Tom Technician/i });
    const consumerSwitch = tomRow.getByRole('switch', { name: /parts consumer/i });
    await expect(consumerSwitch).toBeVisible({ timeout: 30_000 });
    if (!(await consumerSwitch.isChecked())) {
      await consumerSwitch.click();
      await expect(consumerSwitch).toBeChecked({ timeout: 15_000 });
    }

    await evidencePause(adminPage, 800);
    await evidenceScreenshot(adminPage, '03-admin-grants-parts-consumer');
    await adminContext.context.close();

    const techContext = await newPersonaPage(browser, 'technician');
    await pinContextToApex(techContext.context);
    const techPage = techContext.page;

    await gotoDashboardRoute(techPage, '/');
    await expectNavigationLinkVisible(techPage, /^inventory$/i);

    await gotoDashboardRoute(techPage, '/inventory');
    await expect(techPage.getByRole('heading', { name: /inventory/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(techPage.getByRole('button', { name: /add item|create item|new item/i })).toHaveCount(0);

    await evidencePause(techPage, 800);
    await evidenceScreenshot(techPage, '04-technician-read-only-inventory');
    await techContext.context.close();
  });
});
