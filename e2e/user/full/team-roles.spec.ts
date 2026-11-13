import { test, expect } from '../fixtures/equipqr-test';
import { newPersonaPage, pinContextToApex } from '../shared/auth-helpers';

test.describe('team roles @full', () => {
  test('technician cannot create teams', async ({ browser }) => {
    const { context, page } = await newPersonaPage(browser, 'technician');
    await pinContextToApex(context);
    await page.goto('/dashboard/teams');
    await expect(page.getByRole('button', { name: /create team/i })).toHaveCount(0);
    await context.close();
  });
});
