import { expect, type Page } from '@playwright/test';
import { expectNoAppErrorBoundary } from './auth-helpers';

export async function assertRouteHealthy(page: Page, route: string): Promise<void> {
  await setActionOverlay(page, `Opening ${route}`);
  await page.goto(route.startsWith('/') ? route : `/${route}`);
  await expect(page.locator('body')).toBeVisible({ timeout: 30_000 });
  await expectNoAppErrorBoundary(page);
  await setActionOverlay(page, `Loaded ${route}`);
}

export async function openSidebarLink(page: Page, linkName: RegExp | string): Promise<void> {
  await setActionOverlay(page, `Opening ${String(linkName)}`);
  const link = page.getByRole('link', { name: linkName });
  await expect(link.first()).toBeVisible({ timeout: 30_000 });
  await link.first().click();
  await setActionOverlay(page, `Loaded ${String(linkName)}`);
}

export async function pauseForWatchMode(page: Page): Promise<void> {
  const pauseMs = Number.parseInt(process.env.E2E_WATCH_PAUSE_MS || '0', 10);
  if (!Number.isFinite(pauseMs) || pauseMs <= 0) return;

  await setActionOverlay(page, 'Reviewing final state before closing');
  await page.waitForTimeout(pauseMs);
}

export async function installActionOverlay(page: Page, title: string): Promise<void> {
  if (process.env.E2E_ACTION_OVERLAY !== '1') return;

  await page.addInitScript((initialTitle) => {
    const overlayId = 'equipqr-e2e-action-overlay';
    const ensureOverlay = () => {
      let overlay = document.getElementById(overlayId);
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = overlayId;
        overlay.setAttribute('aria-hidden', 'true');
        overlay.style.position = 'fixed';
        overlay.style.top = '12px';
        overlay.style.right = '12px';
        overlay.style.zIndex = '2147483647';
        overlay.style.maxWidth = '420px';
        overlay.style.padding = '12px 14px';
        overlay.style.borderRadius = '12px';
        overlay.style.background = 'rgba(15, 23, 42, 0.92)';
        overlay.style.color = 'white';
        overlay.style.font = '13px/1.45 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        overlay.style.boxShadow = '0 18px 45px rgba(15, 23, 42, 0.35)';
        overlay.style.pointerEvents = 'none';
        overlay.style.whiteSpace = 'pre-line';
        document.documentElement.appendChild(overlay);
      }
      return overlay;
    };

    const setStatus = (message: string) => {
      const overlay = ensureOverlay();
      overlay.textContent = `EquipQR E2E\n${message}`;
    };

    (window as Window & { __equipqrE2ESetStatus?: (message: string) => void })
      .__equipqrE2ESetStatus = setStatus;

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => setStatus(initialTitle), {
        once: true,
      });
    } else {
      setStatus(initialTitle);
    }
  }, title);

  await setActionOverlay(page, title);

  page.on('framenavigated', (frame) => {
    if (frame !== page.mainFrame()) return;
    const url = frame.url();
    setTimeout(() => {
      void setActionOverlay(page, `${title}\n${url}`);
    }, 100);
  });
}

export async function setActionOverlay(page: Page, message: string): Promise<void> {
  if (process.env.E2E_ACTION_OVERLAY !== '1') return;
  await page
    .evaluate((status) => {
      const setter = (window as Window & {
        __equipqrE2ESetStatus?: (message: string) => void;
      }).__equipqrE2ESetStatus;
      setter?.(status);
    }, message)
    .catch(() => undefined);
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
    (e) => !/Failed to load resource.*(404|406)/i.test(e),
  );
  expect(critical, `Unexpected console errors: ${critical.join('\n')}`).toEqual([]);
}
