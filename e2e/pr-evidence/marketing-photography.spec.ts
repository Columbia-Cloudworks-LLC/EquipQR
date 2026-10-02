import { test, expect, type Locator } from '@playwright/test';
import { evidencePause, evidenceScreenshot } from './shared/evidence-helpers';

test.use({ storageState: { cookies: [], origins: [] }, reducedMotion: 'no-preference' });

async function expectLoadedPhoto(photo: Locator) {
  await photo.scrollIntoViewIfNeeded();
  await expect(photo).toBeVisible();
  await expect.poll(() => photo.evaluate((element: HTMLImageElement) => (
    element.complete && element.naturalWidth > 0
  ))).toBe(true);
  await expect(photo).toHaveAttribute('src', /^\/images\/landing\/stock\//);
}

test('stock photography connects marketing discovery to signup @pr-evidence', async ({ page }) => {
  const failures: string[] = [];
  page.on('response', (response) => {
    if (response.url().includes('/images/landing/stock/') && response.status() >= 400) {
      failures.push(`${response.status()} ${response.url()}`);
    }
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const accept = page.getByRole('button', { name: /^accept$/i });
  if (await accept.isVisible()) await accept.click();

  const hero = page.getByRole('region', { name: 'EquipQR workflow gallery' });
  await expect(hero).toBeVisible();
  await expect(page.getByTestId('static-hero-composite')).toHaveCount(0);
  await evidencePause(page, 3200);
  await evidenceScreenshot(page, '01-existing-animation', { target: hero });

  const yard = page.getByRole('img', { name: /tracked excavators and loaders/i });
  await expectLoadedPhoto(yard);
  await evidenceScreenshot(page, '02-homepage-audience-photo', { target: yard });
  const repairLink = page.getByRole('link', { name: 'Explore repair-shop workflows' });
  await evidenceScreenshot(page, '03-homepage-repair-link', { target: repairLink });
  await repairLink.click();
  await expect(page).toHaveURL(/\/solutions\/repair-shops$/);
  await expect(page.getByRole('heading', { name: 'Built for Repair Shops', exact: true })).toBeVisible();
  await expectLoadedPhoto(yard);
  await evidenceScreenshot(page, '04-repair-shop-photo', { target: yard });

  const signup = page.getByRole('link', { name: /get started free/i }).first();
  await evidenceScreenshot(page, '05-repair-shop-signup', { target: signup });
  await signup.click();
  await expect(page).toHaveURL(/\/auth\?tab=signup/);
  await expect(page.getByRole('button', { name: 'Sign up with email', exact: true })).toBeVisible();

  await page.goto('/features/inventory');
  const workbench = page.getByRole('img', { name: /sockets, a ratchet/i });
  await expectLoadedPhoto(workbench);
  await evidenceScreenshot(page, '06-inventory-workshop-photo', { target: workbench });
  const workshopTitle = page.getByRole('heading', { name: 'Keep the workbench working' });
  await evidenceScreenshot(page, '07-inventory-workflow-copy', { target: workshopTitle });
  // Product screenshots remain the feature proof below the contextual photograph.
  const productImage = page.locator('img[src*="inventory-list-2026-04.webp"]').first();
  await productImage.scrollIntoViewIfNeeded();
  await expect(productImage).toBeVisible();
  await evidenceScreenshot(page, '08-inventory-product-proof', { target: productImage });

  await page.getByRole('link', { name: 'Add the first parts', exact: true }).last().click();
  await expect(page).toHaveURL(/\/auth\?tab=signup/);
  expect(failures).toEqual([]);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByTestId('static-hero-composite')).toBeVisible();
});
