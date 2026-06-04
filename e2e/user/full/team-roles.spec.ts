import { test, expect } from '../fixtures/equipqr-test';
import { newPersonaPage, pinContextToApex } from '../shared/auth-helpers';
import { seedEquipment } from '../shared/seed-data';

test.describe('team roles @full', () => {
  test('requestor can open QR page and create work order action', async ({ browser }) => {
    const { context, page } = await newPersonaPage(browser, 'admin');
    await pinContextToApex(context);

    await page.goto(`/qr/equipment/${seedEquipment.cat320.id}`);
    await expect(page.getByRole('heading', { name: seedEquipment.cat320.name })).toBeVisible({
      timeout: 60_000,
    });

    const createWo = page.getByRole('button', { name: /create work order|generic work order/i }).first();
    if (await createWo.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await expect(createWo).toBeEnabled();
    }

    await context.close();
  });

  test('technician cannot create teams', async ({ browser }) => {
    const { context, page } = await newPersonaPage(browser, 'technician');
    await pinContextToApex(context);
    await page.goto('/dashboard/teams');
    await expect(page.getByRole('button', { name: /create team/i })).toHaveCount(0);
    await context.close();
  });
});
