import { test, expect } from '../user/fixtures/equipqr-test';
import { assertNoAxeViolations } from '../user/shared/axe-helpers';
import { evidencePause, evidenceScreenshot } from './shared/evidence-helpers';

test('card actions stay independent and status chips match the picker @pr-evidence', async ({
  page, gotoDashboard, assertHealthyShell,
}) => {
  await gotoDashboard('/equipment');
  await assertHealthyShell();
  const details = page.getByRole('button', { name: /^Open equipment / }).first();
  await expect(details).toBeVisible();
  const equipmentName = (await details.getAttribute('aria-label'))!.replace('Open equipment ', '');
  await assertNoAxeViolations(page);
  const qr = page.getByRole('button', { name: /^Show QR code for / }).filter({ visible: true }).first();
  for (const key of ['Enter', 'Space']) {
    await qr.focus();
    await qr.press(key);
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard\/equipment$/);
    if (key === 'Enter') {
      await evidencePause(page, 500);
      await evidenceScreenshot(page, '01-equipment-keyboard-qr');
    }
    await page.keyboard.press('Escape');
  }
  await details.focus();
  await evidenceScreenshot(page, '02-equipment-details-focus', { target: details });
  await details.press('Enter');
  await expect(page).toHaveURL(/\/dashboard\/equipment\/[^/?]+$/);
  await expect(page.getByRole('heading', { name: equipmentName, exact: true })).toBeVisible();

  await gotoDashboard('/equipment?status=out_of_service');
  await expect(page.getByText('Status: Out of Service', { exact: true })).toBeVisible();
  await evidenceScreenshot(page, '03-readable-status-filter');
  await page.getByRole('button', { name: 'Clear status filter' }).click();
  await expect(page.getByText('Status: Out of Service', { exact: true })).toHaveCount(0);
  const create = page.getByRole('button', { name: 'New work order', exact: true }).filter({ visible: true }).first();
  await create.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');

  if ((page.viewportSize()?.width ?? 1920) >= 768) {
    await gotoDashboard('/equipment');
    await page.getByRole('button', { name: 'History', exact: true }).first().press('Enter');
    await expect(page).toHaveURL(/tab=scan-history/);
  }

  await gotoDashboard('/equipment');
  await qr.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await details.click({ position: { x: 20, y: 100 } });
  await expect(page).toHaveURL(/\/dashboard\/equipment\/[^/?]+$/);

  await gotoDashboard('/inventory');
  await assertHealthyShell();
  await assertNoAxeViolations(page);
  if ((page.viewportSize()?.width ?? 1920) < 768) {
    const inventoryQR = page.getByRole('button', { name: /^Show QR code for / }).first();
    for (const key of ['Enter', 'Space']) {
      await inventoryQR.focus();
      await inventoryQR.press(key);
      await expect(page.getByRole('dialog', { name: 'Inventory Item QR Code' })).toBeVisible();
      await expect(page).toHaveURL(/\/dashboard\/inventory$/);
      if (key === 'Enter') {
        await evidencePause(page, 500);
        await evidenceScreenshot(page, '04-inventory-keyboard-qr');
      }
      await page.keyboard.press('Escape');
    }
    await page.getByRole('button', { name: /^More actions for / }).first().press('Enter');
    await expect(page.getByRole('menu')).toBeVisible();
    await evidencePause(page, 500);
    await evidenceScreenshot(page, '05-inventory-keyboard-actions');
    await page.keyboard.press('Escape');
    const inventoryDetails = page.getByRole('button', { name: /^Open inventory item / }).first();
    const itemName = (await inventoryDetails.getAttribute('aria-label'))!.replace('Open inventory item ', '');
    await inventoryDetails.press('Space');
    await expect(page).toHaveURL(/\/dashboard\/inventory\/[^/?]+$/);
    await expect(page.getByRole('heading', { name: itemName, exact: true })).toBeVisible();
    await evidencePause(page, 500);
    await evidenceScreenshot(page, '06-inventory-keyboard-details');
  }
});
