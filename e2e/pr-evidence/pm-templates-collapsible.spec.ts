import { test, expect } from '../user/fixtures/equipqr-test';
import { pinContextToOrg } from '../user/shared/auth-helpers';
import { apexOrgId, authStatePath } from '../user/shared/seed-data';
import { evidencePause, evidenceScreenshot } from './shared/evidence-helpers';

test.use({ storageState: authStatePath('owner') });

test.describe('PM template collapsible sections @pr-evidence', () => {
  test.beforeEach(async ({ context }) => {
    await pinContextToOrg(context, apexOrgId);
  });

  test('EquipQR and organization template sections toggle, with org-aware defaults', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard('/pm-templates');
    await assertHealthyShell();

    await expect(page.getByRole('heading', { name: /^pm templates$/i })).toBeVisible({
      timeout: 60_000,
    });

    const equipQrTrigger = page.getByRole('button', { name: /equipqr templates/i });
    await expect(equipQrTrigger).toBeVisible({ timeout: 30_000 });

    const orgTrigger = page.getByRole('button', { name: /organization templates/i });
    const hasOrgTemplates = await orgTrigger.isVisible();

    if (hasOrgTemplates) {
      await expect(equipQrTrigger).toHaveAttribute('aria-expanded', 'false');
      await expect(orgTrigger).toHaveAttribute('aria-expanded', 'true');
      await expect(page.getByText(/custom templates created by your organization/i)).toBeVisible();
    } else {
      await expect(equipQrTrigger).toHaveAttribute('aria-expanded', 'true');
      await expect(
        page.getByText(/ready to use — assign directly, no clone needed/i).first(),
      ).toBeVisible();
    }

    await evidencePause(page, 500);
    await evidenceScreenshot(page, '01-pm-templates-default-sections', { target: equipQrTrigger });

    const startingExpanded = (await equipQrTrigger.getAttribute('aria-expanded')) === 'true';
    await equipQrTrigger.click();
    await expect(equipQrTrigger).toHaveAttribute(
      'aria-expanded',
      startingExpanded ? 'false' : 'true',
    );

    if (startingExpanded) {
      await expect(
        page.getByText(/ready to use — assign directly, no clone needed/i),
      ).toHaveCount(0);
    } else {
      await expect(
        page.getByText(/ready to use — assign directly, no clone needed/i).first(),
      ).toBeVisible();
    }

    await evidencePause(page, 400);
    await evidenceScreenshot(page, '02-equipqr-templates-toggled', { target: equipQrTrigger });

    await equipQrTrigger.click();
    await expect(equipQrTrigger).toHaveAttribute(
      'aria-expanded',
      startingExpanded ? 'true' : 'false',
    );

    if (hasOrgTemplates) {
      await orgTrigger.click();
      await expect(orgTrigger).toHaveAttribute('aria-expanded', 'false');
      await evidencePause(page, 400);
      await evidenceScreenshot(page, '03-organization-templates-collapsed', { target: orgTrigger });
      await orgTrigger.click();
      await expect(orgTrigger).toHaveAttribute('aria-expanded', 'true');
    }
  });

  test('desktop work order list toolbar no longer shows a result count', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard('/dashboard/work-orders');
    await assertHealthyShell();

    const search = page.getByRole('textbox', { name: /search work orders/i });
    await expect(search).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: /filter work orders/i })).toBeVisible();
    await expect(page.locator('span[aria-live="polite"]').filter({ hasText: '/' })).toHaveCount(0);

    await evidencePause(page, 500);
    await evidenceScreenshot(page, '04-work-order-list-toolbar', { target: search });
  });
});
