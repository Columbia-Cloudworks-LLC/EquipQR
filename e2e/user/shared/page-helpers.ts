import { expect, type Page } from '@playwright/test';
import { expectNoAppErrorBoundary } from './auth-helpers';
import { loadUserRegressionRunConfig } from './run-config';

const runConfig = loadUserRegressionRunConfig();

type ActionOverlayOptions = {
  pauseAfter?: boolean;
};

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
  const pauseMs = runConfig.watchPauseMs;
  if (!Number.isFinite(pauseMs) || pauseMs <= 0) return;

  await setActionOverlay(page, 'Reviewing final state before closing', { pauseAfter: false });
  await page.waitForTimeout(pauseMs);
}

export async function installActionOverlay(page: Page, title: string): Promise<void> {
  if (!runConfig.actionOverlay) return;

  const mode = runConfig.overlayMode;

  await page.addInitScript(({ initialTitle, overlayMode }) => {
    const overlayId = 'equipqr-e2e-action-overlay';
    const ensureOverlay = () => {
      let overlay = document.getElementById(overlayId);
      if (overlay && overlay.getAttribute('data-mode') !== overlayMode) {
        overlay.remove();
        overlay = null;
      }
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = overlayId;
        overlay.setAttribute('data-mode', overlayMode);
        overlay.setAttribute('aria-hidden', 'true');
        overlay.style.pointerEvents = 'none';
        overlay.style.position = 'fixed';
        overlay.style.zIndex = '2147483647';
        overlay.style.font = '13px/1.45 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

        const icon = document.createElement('img');
        icon.src = '/eqr-logo/icon.svg';
        icon.alt = '';
        icon.decoding = 'async';
        icon.style.flex = '0 0 auto';
        icon.style.width = overlayMode === 'marketing' ? '34px' : '22px';
        icon.style.height = overlayMode === 'marketing' ? '34px' : '22px';

        const copy = document.createElement('div');
        copy.style.minWidth = '0';

        const label = document.createElement('div');
        label.setAttribute('data-eqr-overlay-label', 'true');
        label.textContent = overlayMode === 'marketing' ? 'EquipQR walkthrough' : 'EquipQR E2E';

        const message = document.createElement('div');
        message.setAttribute('data-eqr-overlay-message', 'true');

        if (overlayMode === 'marketing') {
          Object.assign(overlay.style, {
            left: '50%',
            bottom: '24px',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            width: 'min(720px, calc(100vw - 40px))',
            padding: '14px 18px',
            borderRadius: '18px',
            border: '1px solid rgba(123, 62, 231, 0.22)',
            background: 'rgba(255, 255, 255, 0.94)',
            color: '#0f172a',
            boxShadow: '0 20px 60px rgba(15, 23, 42, 0.22)',
            backdropFilter: 'blur(14px)',
          });
          Object.assign(label.style, {
            color: '#7B3EE7',
            fontSize: '11px',
            fontWeight: '700',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          });
          Object.assign(message.style, {
            color: '#111827',
            fontSize: '17px',
            fontWeight: '650',
            letterSpacing: '-0.01em',
            lineHeight: '1.35',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          });
        } else {
          Object.assign(overlay.style, {
            top: '12px',
            right: '12px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            maxWidth: '440px',
            padding: '12px 14px',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            background: 'rgba(15, 23, 42, 0.92)',
            color: 'white',
            boxShadow: '0 18px 45px rgba(15, 23, 42, 0.35)',
          });
          Object.assign(label.style, {
            color: 'rgba(255, 255, 255, 0.68)',
            fontSize: '11px',
            fontWeight: '700',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          });
          Object.assign(message.style, {
            color: 'white',
            fontSize: '13px',
            fontWeight: '500',
            whiteSpace: 'pre-line',
          });
        }

        copy.append(label, message);
        overlay.append(icon, copy);
        document.documentElement.appendChild(overlay);
      }
      return overlay;
    };

    const toTitleCase = (value: string) =>
      value
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

    const friendlyTarget = (rawTarget: string) => {
      const regexLikeTarget = rawTarget.trim().match(/^\/(.+)\/[a-z]*$/i);
      const target = regexLikeTarget?.[1] || rawTarget;
      const cleaned = target
        .replace(/^\/+/, '')
        .replace(/^dashboard\/?/i, '')
        .replace(/[\\^$.*+?()[\]{}|]/g, ' ')
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!cleaned) return 'EquipQR';
      if (/pm\s+templates/i.test(cleaned)) return 'PM Templates';
      if (/work\s+orders?/i.test(cleaned)) return 'Work Orders';
      if (/fleet\s+map/i.test(cleaned)) return 'Fleet Map';
      return toTitleCase(cleaned);
    };

    const marketingMessage = (message: string) => {
      const line =
        message
          .split('\n')
          .map((item) => item.trim())
          .find((item) => item && !/^https?:\/\//i.test(item)) || message;

      const routeMatch = line.match(/^(Opening|Loaded)(?: dashboard route)?\s+(.+)$/i);
      if (routeMatch) {
        const verb = /^loaded$/i.test(routeMatch[1]) ? 'Showing' : 'Opening';
        return `${verb} ${friendlyTarget(routeMatch[2])}`;
      }

      return line.replace(/\s+/g, ' ').trim();
    };

    const setStatus = (message: string) => {
      const overlay = ensureOverlay();
      const messageElement = overlay.querySelector<HTMLElement>('[data-eqr-overlay-message]');
      if (messageElement) {
        messageElement.textContent =
          overlayMode === 'marketing' ? marketingMessage(message) : message;
      }
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
  }, { initialTitle: title, overlayMode: mode });

  await setActionOverlay(page, title);

  page.on('framenavigated', (frame) => {
    if (frame !== page.mainFrame()) return;
    if (mode === 'marketing') return;
    const url = frame.url();
    setTimeout(() => {
      void setActionOverlay(page, `${title}\n${url}`);
    }, 100);
  });
}

export async function setActionOverlay(
  page: Page,
  message: string,
  options: ActionOverlayOptions = {},
): Promise<void> {
  if (!runConfig.actionOverlay) return;
  await page
    .evaluate((status) => {
      const setter = (window as Window & {
        __equipqrE2ESetStatus?: (message: string) => void;
      }).__equipqrE2ESetStatus;
      setter?.(status);
    }, message)
    .catch(() => undefined);

  if (options.pauseAfter === false) return;
  const pauseMs = runConfig.stagePauseMs;
  if (Number.isFinite(pauseMs) && pauseMs > 0) {
    await page.waitForTimeout(pauseMs);
  }
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
