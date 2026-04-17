import { test, expect } from '@playwright/test';
import fs from 'fs';

const personaName = process.env.DEMO_PERSONA_NAME || 'Alex Apex';
const postLoginActionWindowMs = Number.parseInt(process.env.DEMO_ACTION_WINDOW_MS || '6500', 10);
const storageStatePath = process.env.DEMO_STORAGE_STATE?.trim();
const hasStorageState = Boolean(storageStatePath && fs.existsSync(storageStatePath));

/**
 * Keep actions resilient: try useful interactions, but don't fail if one selector is absent.
 * @param {import('@playwright/test').Page} page
 */
async function performVisibleDashboardActions(page) {
  await expect(page.locator('body')).toBeVisible({ timeout: 20_000 });
  const startedAt = Date.now();

  await page.waitForTimeout(900);
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(700);
  await page.mouse.wheel(0, -500);
  await page.waitForTimeout(700);

  const interactionCandidates = [
    page.getByRole('button', { name: /notifications|alerts|menu|profile|account|settings/i }).first(),
    page.getByRole('link', { name: /inventory|equipment|work orders|dashboard/i }).first()
  ];

  for (const locator of interactionCandidates) {
    try {
      if (await locator.isVisible({ timeout: 1500 })) {
        await locator.click({ timeout: 3000 });
        await page.waitForTimeout(900);
        await page.keyboard.press('Escape').catch(() => undefined);
        break;
      }
    } catch {
      // Keep the demo resilient; not all deployments expose the same visible controls.
    }
  }

  const elapsed = Date.now() - startedAt;
  if (elapsed < postLoginActionWindowMs) {
    await page.waitForTimeout(postLoginActionWindowMs - elapsed);
  }
}

test.describe('demo-smoke', () => {
  test('reaches dashboard (localhost quick login or storage state)', async ({ page, baseURL }) => {
    if (hasStorageState) {
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/dashboard/i, { timeout: 60_000 });
      await performVisibleDashboardActions(page);
      return;
    }

    const url = new URL(baseURL);
    test.skip(
      url.hostname !== 'localhost' && url.hostname !== '127.0.0.1',
      'Set DEMO_STORAGE_STATE for non-localhost runs, or use localhost with dev quick login.'
    );

    await page.goto('/auth');

    const personaTrigger = page
      .getByRole('combobox')
      .or(page.getByRole('button', { name: /select a test account|persona/i }));
    await expect(personaTrigger.first()).toBeVisible({ timeout: 30_000 });
    await personaTrigger.first().click();

    await page.getByRole('option', { name: new RegExp(personaName, 'i') }).click();
    await page.getByRole('button', { name: /quick login/i }).click();

    await page.waitForURL(/dashboard/i, { timeout: 60_000 });
    await expect(page).toHaveURL(/dashboard/i);
    await performVisibleDashboardActions(page);
  });
});
