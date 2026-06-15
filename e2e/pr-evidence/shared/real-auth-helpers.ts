import { expect, type Page } from '@playwright/test';

const INTEGRATIONS_PATH = '/dashboard/organization/integrations';

export async function assertRealAuthDashboard(page: Page): Promise<void> {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/dashboard/i, { timeout: 60_000 });
  await expect(page).not.toHaveURL(/\/auth/i);
}

export async function gotoRealAuthIntegrations(page: Page): Promise<void> {
  await page.goto(INTEGRATIONS_PATH);
  await expect(page).toHaveURL(/\/dashboard\/organization\/integrations/i, {
    timeout: 60_000,
  });
  await expect(page.locator('#main-content, main#main-content, main').first()).toBeVisible({
    timeout: 60_000,
  });
}

export function googleWorkspaceCard(page: Page) {
  return page.locator('div.rounded-lg.border').filter({ hasText: 'Google Workspace' });
}

export async function assertGoogleWorkspaceConnected(page: Page): Promise<void> {
  const gwCard = googleWorkspaceCard(page);
  await expect(gwCard.first()).toBeVisible({ timeout: 60_000 });
  await expect(gwCard.getByText('Connected').first()).toBeVisible({ timeout: 60_000 });
}
