import { test, expect } from '../user/fixtures/equipqr-test';
import { pinContextToOrg } from '../user/shared/auth-helpers';
import { apexOrgId, authStatePath } from '../user/shared/seed-data';
import { evidencePause, evidenceScreenshot } from './shared/evidence-helpers';

test.use({ storageState: authStatePath('owner') });

test.describe('Work order list server pagination @pr-evidence', () => {
  test.beforeEach(async ({ context }) => {
    await pinContextToOrg(context, apexOrgId);
  });

  test('pages the card list, then search resets to page 1', async ({
    gotoDashboard,
    assertHealthyShell,
    page,
  }) => {
    await gotoDashboard('/dashboard/work-orders');
    await assertHealthyShell();

    await expect(page.getByRole('heading', { name: /^work orders$/i })).toBeVisible({
      timeout: 30_000,
    });

    const footer = page.getByTestId('list-pagination-footer');
    await expect(footer).toBeVisible({ timeout: 30_000 });
    await expect(footer.getByText(/Showing 1 to 12 of \d+ work orders/)).toBeVisible();
    await expect(footer.getByText(/Page 1 of \d+/).filter({ visible: true })).toBeVisible();

    const visibleNext = footer.getByRole('button', { name: /next/i }).filter({ visible: true });
    await expect(visibleNext).toBeEnabled();

    await evidencePause(page, 700);
    await evidenceScreenshot(page, '01-list-page-1', { target: footer });

    const pageOneLead = await page.locator('h3').first().innerText();
    await visibleNext.click();

    await expect(footer.getByText(/Showing 13 to \d+ of \d+ work orders/)).toBeVisible({
      timeout: 15_000,
    });
    await expect(footer.getByText(/Page 2 of \d+/).filter({ visible: true })).toBeVisible();
    await expect(page.locator('h3').first()).not.toHaveText(pageOneLead);

    await evidencePause(page, 700);
    await evidenceScreenshot(page, '02-list-page-2', { target: footer });

    const search = page.getByRole('textbox', { name: /search work orders/i });
    await search.fill('Hydraulic');

    await expect(page.getByRole('heading', { name: /Replace Hydraulic Filter/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(footer.getByText(/Showing 1 to \d+ of \d+ work order/)).toBeVisible();
    await expect(
      footer.getByRole('button', { name: /previous/i }).filter({ visible: true }),
    ).toBeDisabled();

    await evidencePause(page, 700);
    await evidenceScreenshot(page, '03-search-resets-to-page-1', { target: footer });
  });
});
