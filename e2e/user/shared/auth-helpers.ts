import path from 'path';
import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import {
  apexOrgId,
  authStatePath,
  devPassword,
  personas,
  type PersonaKey,
} from './seed-data';

export async function quickLogin(page: Page, persona: PersonaKey): Promise<void> {
  const { displayName } = personas[persona];
  await quickLoginByDisplayName(page, displayName);
}

export async function quickLoginByDisplayName(page: Page, displayName: string): Promise<void> {
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

export async function signInWithEmailPassword(
  page: Page,
  email: string,
  password: string = devPassword,
): Promise<void> {
  await page.goto('/auth?tab=signin');
  await expect(page).toHaveURL(/\/auth/i, { timeout: 30_000 });

  const emailField = page.getByLabel(/email/i).or(page.locator('input[type="email"]')).first();
  const passwordField = page
    .getByLabel(/password/i)
    .or(page.locator('input[type="password"]'))
    .first();

  await emailField.fill(email);
  await passwordField.fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();

  await page.waitForURL(/\/dashboard/i, { timeout: 60_000 });
}

export async function logoutFromApp(page: Page): Promise<void> {
  const userMenu = page.getByRole('button', { name: /user menu/i }).first();
  await expect(userMenu).toBeVisible({ timeout: 30_000 });
  await userMenu.click();
  await page.getByRole('menuitem', { name: /^sign out$/i }).click();
  await expect(page).toHaveURL(/\/auth|\/$/i, { timeout: 60_000 });
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

export async function pinContextToOrg(
  context: BrowserContext,
  organizationId: string,
): Promise<void> {
  await context.addInitScript((orgId) => {
    if (sessionStorage.getItem('equipqr_e2e_org_pin_applied') === 'true') {
      return;
    }
    sessionStorage.setItem('equipqr_e2e_org_pin_applied', 'true');

    const selectionTimestamp = new Date().toISOString();
    localStorage.setItem('equipqr_current_organization', orgId);
    localStorage.setItem(
      'equipqr_current_org',
      JSON.stringify({
        selectedOrgId: orgId,
        selectionTimestamp,
      }),
    );

    const sessionKey = 'equipqr_session_data';
    const rawSession = localStorage.getItem(sessionKey);
    if (rawSession) {
      try {
        const session = JSON.parse(rawSession) as {
          currentOrganizationId?: string | null;
          userPreference?: { selectedOrgId?: string | null; selectionTimestamp?: string };
        };
        session.currentOrganizationId = orgId;
        session.userPreference = {
          ...session.userPreference,
          selectedOrgId: orgId,
          selectionTimestamp,
        };
        localStorage.setItem(sessionKey, JSON.stringify(session));
      } catch {
        // Ignore corrupt session cache; org preference keys above still apply.
      }
    }
  }, organizationId);
}

export async function pinContextToApex(context: BrowserContext): Promise<void> {
  await pinContextToOrg(context, apexOrgId);
}

export async function newPersonaPage(
  browser: Browser,
  persona: PersonaKey,
  options?: { pinOrgId?: string },
): Promise<{ context: BrowserContext; page: Page }> {
  const statePath = path.resolve(authStatePath(persona));
  const context = await browser.newContext({ storageState: statePath });
  const pinOrg = options?.pinOrgId ?? personas[persona].defaultOrgId;
  if (pinOrg) {
    await pinContextToOrg(context, pinOrg);
  }
  const page = await context.newPage();
  return { context, page };
}

export async function gotoDashboardRoute(page: Page, route: string): Promise<void> {
  const normalized = route.startsWith('/') ? route : `/${route}`;
  const pathName = normalized.startsWith('/dashboard')
    ? normalized
    : `/dashboard${normalized}`;
  await page.goto(pathName);
  await expect(page.locator('#main-content, main#main-content, main').first()).toBeVisible({
    timeout: 60_000,
  });
}

export async function expectNoAppErrorBoundary(page: Page): Promise<void> {
  await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
  await expect(page.getByText(/application error/i)).toHaveCount(0);
}
