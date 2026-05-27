import { expect, type Page } from '@playwright/test';
import { expectNoAppErrorBoundary } from './auth-helpers';

export async function assertRouteHealthy(page: Page, route: string): Promise<void> {
  await page.goto(route.startsWith('/') ? route : `/${route}`);
  await expect(page.locator('body')).toBeVisible({ timeout: 30_000 });
  await expectNoAppErrorBoundary(page);
}

export async function openSidebarLink(page: Page, linkName: RegExp | string): Promise<void> {
  const link = page.getByRole('link', { name: linkName });
  await expect(link.first()).toBeVisible({ timeout: 30_000 });
  await link.first().click();
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

export function assertNoCriticalConsoleErrors(errors: string[]): void {
  const critical = errors.filter(
    (e) => !/Failed to load resource.*404/i.test(e),
  );
  expect(critical, `Unexpected console errors: ${critical.join('\n')}`).toEqual([]);
}
