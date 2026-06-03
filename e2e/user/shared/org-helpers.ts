import { expect, type Page } from '@playwright/test';

export async function switchOrganizationFromSwitcher(
  page: Page,
  organizationName: RegExp | string,
): Promise<void> {
  const switcher = page
    .getByRole('button', { name: /switch organization/i })
    .or(page.getByRole('button').filter({ hasText: /construction|equipment|landscaping|rentals/i }))
    .first();

  await switcher.click();
  await page.getByRole('menuitem', { name: organizationName }).click();
  await expect(page).toHaveURL(/\/dashboard/i, { timeout: 60_000 });
}
