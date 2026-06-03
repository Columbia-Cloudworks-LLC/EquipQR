import { test, expect } from '../fixtures/equipqr-test';
import { newPersonaPage } from '../shared/auth-helpers';
import { switchOrganizationFromSwitcher } from '../shared/org-helpers';
import { seedEquipment } from '../shared/seed-data';

test.describe('organization switching @full', () => {
  test('multi-org user sees org-scoped equipment after switching', async ({ browser }) => {
    const { context, page } = await newPersonaPage(browser, 'multiOrg');
    await page.goto('/dashboard/equipment');
    await expect(page.getByText(seedEquipment.cat320.name).first()).toBeVisible({
      timeout: 60_000,
    });

    await switchOrganizationFromSwitcher(page, /metro equipment/i);
    await page.goto('/dashboard/equipment');
    await expect(page.getByText(seedEquipment.cat320.name)).toHaveCount(0);
    await expect(page.getByText(/bobcat|skid steer/i).first()).toBeVisible({ timeout: 60_000 });

    await context.close();
  });
});
