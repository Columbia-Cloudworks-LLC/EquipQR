import { test, expect } from '../user/fixtures/equipqr-test';
import { pinContextToApex } from '../user/shared/auth-helpers';
import { authStatePath, seedEquipment } from '../user/shared/seed-data';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

const MOBILE_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36';

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  userAgent: MOBILE_USER_AGENT,
});

test.describe('Stable display image and workspace order @pr-evidence', () => {
  test('equipment Images tab marks the display image even though URLs are re-signed', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard(`/equipment/${seedEquipment.cat320.id}`);
    await assertHealthyShell();
    await page.getByRole('tab', { name: 'Images', exact: true }).click();

    await expect(page.getByText('Display', { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: /^remove .* as display image$/i })).toHaveCount(1);
    await expect(page.getByRole('button', { name: /^set .* as display image$/i })).toHaveCount(0);

    await page.getByText('Display', { exact: true }).scrollIntoViewIfNeeded();
    await evidencePause(page, 800);
    await evidenceScreenshot(page, '01-display-image-badge');
  });

  test.describe('multi-organization technician', () => {
    test.use({ storageState: authStatePath('technician') });

    test('workspace switcher lists organizations in name order', async ({ page, assertHealthyShell }) => {
      await pinContextToApex(page.context());
      await page.goto('/dashboard');
      await assertHealthyShell();

      await page.getByRole('button', { name: /^workspace:/i }).click();
      const sheet = page.getByRole('dialog');
      const apex = sheet.getByText('Apex Construction Company', { exact: true });
      const toms = sheet.getByText("Tom's Field Services", { exact: true });
      await expect(apex).toBeVisible({ timeout: 30_000 });
      await expect(toms).toBeVisible();

      const apexTop = (await apex.boundingBox())?.y ?? Infinity;
      const tomsTop = (await toms.boundingBox())?.y ?? -Infinity;
      expect(apexTop).toBeLessThan(tomsTop);

      await evidencePause(page, 800);
      await evidenceScreenshot(page, '02-workspace-switcher-order');
    });
  });
});
