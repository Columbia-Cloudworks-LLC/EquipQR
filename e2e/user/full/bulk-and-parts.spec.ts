import { test, expect } from '../fixtures/equipqr-test';

test.describe('bulk and parts @full', () => {
  test('bulk equipment grid route loads', async ({ page, assertHealthyShell }) => {
    await page.goto('/dashboard/equipment/bulk');
    await assertHealthyShell();
    await expect(page.locator('#main-content, main').first()).toBeVisible();
  });

  test('bulk inventory route loads', async ({ page, assertHealthyShell }) => {
    await page.goto('/dashboard/inventory/bulk');
    await assertHealthyShell();
    await expect(page.locator('#main-content, main').first()).toBeVisible();
  });

  test('part lookup page loads', async ({ gotoDashboard, page, assertHealthyShell }) => {
    await gotoDashboard('/part-lookup');
    await assertHealthyShell();
    await expect(page.getByRole('heading', { level: 1, name: 'Part Lookup' })).toBeVisible({
      timeout: 60_000,
    });
  });

  test('part lookup finds seeded CAT alternate group', async ({ gotoDashboard, page, assertHealthyShell }) => {
    await gotoDashboard('/part-lookup');
    await assertHealthyShell();
    const search = page.getByPlaceholder(/part number|search/i).first();
    await search.fill('CAT-1R-0750');
    await search.press('Enter');
    // Seeded group (supabase/seeds/25_part_alternate_groups.sql) and one of its aftermarket members.
    await expect(
      page.getByRole('heading', { name: /oil filter - cat\/komatsu heavy equipment/i }),
    ).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText('BF7679-D').first()).toBeVisible();
  });

  test('alternate groups list loads', async ({ gotoDashboard, page, assertHealthyShell }) => {
    await gotoDashboard('/alternate-groups');
    await assertHealthyShell();
    await expect(page.getByRole('heading', { level: 1, name: 'Alternate Part Groups' })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByRole('heading', { name: 'Air Filter - CAT 320 Series' })).toBeVisible();
  });
});
