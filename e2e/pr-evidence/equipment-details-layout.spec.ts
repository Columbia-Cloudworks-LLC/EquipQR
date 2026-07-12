import { test, expect } from '../user/fixtures/equipqr-test';
import { seedEquipment } from '../user/shared/seed-data';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

test.describe('Equipment details desktop layout @pr-evidence', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('details, work orders, and check-ins tabs show relocated controls', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard(`/dashboard/equipment/${seedEquipment.cat320.id}?tab=details`);
    await assertHealthyShell();

    await expect(page.getByRole('heading', { name: /CAT 320 Excavator/i }).first()).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByRole('heading', { name: /basic information/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /lifecycle & warranty/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /preventative maintenance/i })).toHaveCount(0);
    await expect(page.getByText(/daily operator check-in/i)).toHaveCount(0);

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '01-details-basic-and-lifecycle-columns');

    await page.getByRole('tab', { name: /work orders/i }).click();
    await expect(page.getByRole('heading', { name: /preventative maintenance/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/pm template/i).first()).toBeVisible();

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '02-work-orders-pm-section');

    await page.getByRole('tab', { name: /check-ins/i }).click();
    await expect(page.getByText(/daily operator check-in/i).first()).toBeVisible({
      timeout: 30_000,
    });

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '03-check-ins-assignment-config');
  });
});
