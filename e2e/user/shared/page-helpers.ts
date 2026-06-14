import { expect, type Page } from '@playwright/test';
import { expectNoAppErrorBoundary } from './auth-helpers';
import {
  clickWithDemoCue,
  fillWithDemoCue,
  installActionOverlay,
  labelFromTarget,
  pauseForWatchMode,
  setActionOverlay,
  spotlightLocator,
} from './action-overlay';

export {
  clickWithDemoCue,
  fillWithDemoCue,
  installActionOverlay,
  pauseForWatchMode,
  setActionOverlay,
  spotlightLocator,
};

export async function assertRouteHealthy(
  page: Page,
  route: string,
  expectedText?: RegExp | string,
): Promise<void> {
  await setActionOverlay(page, `Opening ${route}`);
  await page.goto(route.startsWith('/') ? route : `/${route}`);
  await expect(page.locator('body')).toBeVisible({ timeout: 30_000 });
  await expectNoAppErrorBoundary(page);
  if (expectedText) {
    await expect(page.getByText(expectedText).first()).toBeVisible({ timeout: 30_000 });
  }
  await setActionOverlay(page, `Loaded ${route}`);
}

export async function openSidebarLink(page: Page, linkName: RegExp | string): Promise<void> {
  await setActionOverlay(page, `Opening ${String(linkName)}`);
  const link = await getVisibleNavigationLink(page, linkName);
  await clickWithDemoCue(link, `Open ${labelFromTarget(linkName)}`);
  await setActionOverlay(page, `Loaded ${String(linkName)}`);
}

async function openMobileNavigationIfAvailable(page: Page): Promise<void> {
  const sheet = page.locator('[data-mobile="true"][data-sidebar="sidebar"]');
  if (await sheet.isVisible({ timeout: 500 }).catch(() => false)) {
    return;
  }

  const primaryNav = page.getByRole('navigation', { name: 'Primary navigation' });
  if (!(await primaryNav.isVisible({ timeout: 2_000 }).catch(() => false))) {
    return;
  }

  const bottomNavMenu = primaryNav.getByRole('button', { name: /open navigation menu/i });
  await expect(bottomNavMenu).toBeVisible({ timeout: 30_000 });
  await clickWithDemoCue(bottomNavMenu, 'Open mobile navigation');
  await expect(sheet).toBeVisible({ timeout: 10_000 });
}

async function getVisibleNavigationLink(page: Page, linkName: RegExp | string) {
  const sidebarNav = page.getByRole('navigation', { name: 'Main navigation' });
  if (await sidebarNav.isVisible({ timeout: 5_000 }).catch(() => false)) {
    const sidebarLink = sidebarNav.getByRole('link', { name: linkName }).first();
    await sidebarLink.scrollIntoViewIfNeeded().catch(() => undefined);
    await expect(sidebarLink).toBeVisible({ timeout: 30_000 });
    return sidebarLink;
  }

  const globalLink = page.getByRole('link', { name: linkName }).first();
  if (await globalLink.isVisible({ timeout: 10_000 }).catch(() => false)) {
    return globalLink;
  }

  const primaryNav = page.getByRole('navigation', { name: 'Primary navigation' });
  if (await primaryNav.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await openMobileNavigationIfAvailable(page);
    const sheetLink = page
      .locator('[data-mobile="true"][data-sidebar="sidebar"]')
      .getByRole('link', { name: linkName })
      .first();
    await expect(sheetLink).toBeVisible({ timeout: 30_000 });
    return sheetLink;
  }

  await expect(globalLink).toBeVisible({ timeout: 30_000 });
  return globalLink;
}

export async function expectNavigationLinkVisible(
  page: Page,
  linkName: RegExp | string,
): Promise<void> {
  const link = await getVisibleNavigationLink(page, linkName);
  await expect(link).toBeVisible({ timeout: 30_000 });
}

export async function expectNavigationLinkHidden(
  page: Page,
  linkName: RegExp | string,
): Promise<void> {
  const sidebarNav = page.getByRole('navigation', { name: 'Main navigation' });
  if (await sidebarNav.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await expect(sidebarNav.getByRole('link', { name: linkName })).toHaveCount(0);
    return;
  }

  await openMobileNavigationIfAvailable(page);
  const sheet = page.locator('[data-mobile="true"][data-sidebar="sidebar"]');
  await expect(sheet.getByRole('link', { name: linkName })).toHaveCount(0);
}

export function attachConsoleErrorCollector(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (/favicon|hcaptcha|google.*maps|ResizeObserver/i.test(text)) {
        return;
      }
      errors.push(text);
    }
  });
  page.on('pageerror', (err) => {
    errors.push(err.message);
  });
  return errors;
}

export function assertNoCriticalConsoleErrors(
  errors: string[],
  options?: { allowResourceNotFound?: boolean },
): void {
  const allow404 = options?.allowResourceNotFound === true;
  const critical = errors.filter((e) => {
    if (/favicon|hcaptcha|google.*maps|ResizeObserver/i.test(e)) {
      return false;
    }
    if (allow404 && /Failed to load resource.*(404|406)/i.test(e)) {
      return false;
    }
    return true;
  });
  expect(critical, `Unexpected console errors: ${critical.join('\n')}`).toEqual([]);
}
