import { expect, type Page } from '@playwright/test';
import { authStatePath, personas, type PersonaKey } from './seed-data';

export async function quickLogin(page: Page, persona: PersonaKey): Promise<void> {
  const { displayName } = personas[persona];

  await page.goto('/auth');
  await expect(page).toHaveURL(/\/auth/i, { timeout: 30_000 });

  const personaTrigger = page
    .getByRole('combobox')
    .or(page.getByRole('button', { name: /select a test account|persona/i }));
  await expect(personaTrigger.first()).toBeVisible({ timeout: 30_000 });
  await personaTrigger.first().click();

  await page.getByRole('option', { name: new RegExp(displayName, 'i') }).click();
  await page.getByRole('button', { name: /quick login/i }).click();

  await page.waitForURL(/\/dashboard/i, { timeout: 60_000 });
  await expect(page).toHaveURL(/\/dashboard/i);
}

export async function savePersonaStorageState(
  page: Page,
  persona: PersonaKey,
): Promise<void> {
  await page.context().storageState({ path: authStatePath(persona) });
}

export async function loginAndPersistStorageState(
  page: Page,
  persona: PersonaKey,
): Promise<void> {
  await quickLogin(page, persona);
  await savePersonaStorageState(page, persona);
}

export async function gotoDashboardRoute(page: Page, route: string): Promise<void> {
  const normalized = route.startsWith('/') ? route : `/${route}`;
  const path = normalized.startsWith('/dashboard')
    ? normalized
    : `/dashboard${normalized}`;
  await page.goto(path);
  await expect(page.locator('#main-content, main#main-content, main').first()).toBeVisible({
    timeout: 60_000,
  });
}

export async function expectNoAppErrorBoundary(page: Page): Promise<void> {
  await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
  await expect(page.getByText(/application error/i)).toHaveCount(0);
}
