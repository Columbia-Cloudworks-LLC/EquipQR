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

  const emailField = page.getByLabel(/^email$/i).or(page.locator('#signin-email')).first();
  const emailPath = page.getByRole('button', { name: /login with email & password/i });
  await expect(emailPath.or(emailField)).toBeVisible({ timeout: 30_000 });
  if (!(await emailField.isVisible().catch(() => false))) {
    await emailPath.click();
  }
  await expect(emailField).toBeVisible({ timeout: 15_000 });

  const passwordField = page
    .getByLabel(/^password$/i)
    .or(page.locator('#signin-password'))
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

/**
 * Persist Accept so the fixed cookie banner does not intercept clicks in E2E.
 * Prefer storing the decision (and dismissing a visible banner) before saving
 * Playwright storageState so later tests reuse the consent key.
 */
export async function ensureCookieConsentAccepted(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.setItem('equipqr:cookie-consent', 'accepted');
  });

  // Same-tab localStorage writes do not re-sync CookieConsentProvider; if the
  // banner mounts after the seed, click Accept when it appears briefly.
  const acceptButton = page
    .locator('section[aria-label="Cookie consent"]')
    .getByRole('button', { name: /^accept$/i });
  try {
    await acceptButton.click({ timeout: 5_000 });
    await expect(page.locator('section[aria-label="Cookie consent"]')).toBeHidden({
      timeout: 10_000,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/Timeout/i.test(message)) {
      throw error;
    }
  }
}

export async function loginAndPersistStorageState(
  page: Page,
  persona: PersonaKey,
): Promise<void> {
  // Seed consent before auth navigation so CookieConsentProvider mounts accepted.
  await page.addInitScript(() => {
    localStorage.setItem('equipqr:cookie-consent', 'accepted');
  });
  await quickLogin(page, persona);
  await ensureCookieConsentAccepted(page);
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

    // Drop cached session payload. Preferring a pinned org while leaving
    // stale teamMemberships (often []) causes equipment list RBAC to
    // short-circuit empty for non-admin personas. Cleared session forces a
    // fresh fetchSessionData for the preferred org.
    localStorage.removeItem('equipqr_session_data');
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
  await ensureCookieConsentAccepted(page);
}

export async function expectNoAppErrorBoundary(page: Page): Promise<void> {
  await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
  await expect(page.getByText(/application error/i)).toHaveCount(0);
}

/** Open /dashboard using a persisted persona storage state file. */
export async function openDashboardWithStorageState(
  browser: Browser,
  storageStatePath: string,
  options?: { assertMainContent?: boolean },
): Promise<{ context: BrowserContext; page: Page }> {
  const resolvedPath = path.resolve(storageStatePath);
  const context = await browser.newContext({ storageState: resolvedPath });
  const page = await context.newPage();
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/dashboard/i, { timeout: 60_000 });
  if (options?.assertMainContent !== false) {
    await expect(page.locator('#main-content, main').first()).toBeVisible();
  }
  return { context, page };
}

export async function openDashboardAsPersona(
  browser: Browser,
  persona: PersonaKey,
  options?: { assertMainContent?: boolean },
): Promise<{ context: BrowserContext; page: Page }> {
  return openDashboardWithStorageState(browser, authStatePath(persona), options);
}

/** Assert a public QR route renders without the app error boundary. */
export async function expectPublicQrRouteHealthy(page: Page, qrPath: string): Promise<void> {
  await page.goto(qrPath);
  await expect(page.locator('body')).toBeVisible({ timeout: 60_000 });
  await expectNoAppErrorBoundary(page);
}
