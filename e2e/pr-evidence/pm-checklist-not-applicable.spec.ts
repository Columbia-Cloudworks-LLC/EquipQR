import { test, expect } from '../user/fixtures/equipqr-test';
import { newPersonaPage } from '../user/shared/auth-helpers';
import { seedWorkOrders } from '../user/shared/seed-data';
import { selectRadixOption } from '../user/shared/ui-form-helpers';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

test.describe('PM checklist Not Applicable @pr-evidence', () => {
  test('technician can mark a PM item as Not Applicable with grey styling', async ({ browser }) => {
    const { context, page } = await newPersonaPage(browser, 'metroTech');
    const workOrder = seedWorkOrders.bobcatPm;

    await page.goto(`/dashboard/work-orders/${workOrder.id}`);
    await expect(page.getByText(/pm checklist|preventative maintenance|checklist/i).first()).toBeVisible({
      timeout: 60_000,
    });

    await page.getByRole('button', { name: /hydraulic/i }).click();

    const firstAssessment = page.getByRole('combobox').filter({ hasText: /select assessment/i }).first();
    await expect(firstAssessment).toBeVisible({ timeout: 30_000 });
    await selectRadixOption(page, firstAssessment, /not applicable/i);

    await expect(page.getByText('Not Applicable').first()).toBeVisible();
    await evidenceScreenshot(page, '01-pm-item-not-applicable-selected');
    await evidencePause(page, 800);

    const progressSegment = page.locator('[class*="bg-muted-foreground"]').first();
    await expect(progressSegment).toBeVisible();

    await evidenceScreenshot(page, '02-pm-progress-grey-segment');
    await evidencePause(page, 800);

    await context.close();
  });
});
