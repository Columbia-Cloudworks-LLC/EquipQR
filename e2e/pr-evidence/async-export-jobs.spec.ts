import { test, expect } from '../user/fixtures/equipqr-test';
import {
  newPersonaPage,
  gotoDashboardRoute,
} from '../user/shared/auth-helpers';
import { metroOrgId } from '../user/shared/seed-data';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

/**
 * PR evidence for #1193 — async export jobs + loading toast on Reports.
 */
test.describe('Async export jobs @pr-evidence', () => {
  test('fleet export console shows export flow with loading feedback', async ({ browser }) => {
    const { context, page } = await newPersonaPage(browser, 'owner', { pinOrgId: metroOrgId });

    await gotoDashboardRoute(page, '/reports');
    await expect(page.getByRole('heading', { name: /fleet export console|reports/i }).first()).toBeVisible({
      timeout: 60_000,
    });

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '01-reports-console');

    const equipmentCard = page.getByRole('button', { name: /equipment/i }).first()
      .or(page.getByText(/equipment inventory|equipment report/i).first());
    await expect(equipmentCard).toBeVisible({ timeout: 30_000 });
    await equipmentCard.click();

    await evidencePause(page, 600);
    await evidenceScreenshot(page, '02-export-dialog-open');

    const exportButton = page.getByRole('button', { name: /^export$/i }).last();
    await expect(exportButton).toBeVisible({ timeout: 15_000 });
    await exportButton.click();

    // Loading toast should appear while the export (sync or async) runs.
    await expect(page.getByText(/export in progress|export complete|exporting/i).first()).toBeVisible({
      timeout: 30_000,
    });

    await evidencePause(page, 1000);
    await evidenceScreenshot(page, '03-export-loading-or-complete');

    await context.close();
  });
});
