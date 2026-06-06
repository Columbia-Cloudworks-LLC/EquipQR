import { type Locator, type Page } from '@playwright/test';
import { loadUserRegressionRunConfig } from './run-config';

const runConfig = loadUserRegressionRunConfig();

type ActionOverlayOptions = {
  pauseAfter?: boolean;
};

type LocatorClickOptions = Parameters<Locator['click']>[0];
type LocatorFillOptions = Parameters<Locator['fill']>[1];

function shouldShowActionCue(): boolean {
  return runConfig.actionCue || runConfig.runProfile === 'demo';
}

function cuePauseMs(): number {
  if (!shouldShowActionCue()) return 0;
  const configured = Number.isFinite(runConfig.stagePauseMs) ? runConfig.stagePauseMs : 0;
  return Math.min(1400, Math.max(450, Math.floor(configured * 0.55)));
}

function postActionPauseMs(): number {
  if (!shouldShowActionCue()) return 0;
  const configured = Number.isFinite(runConfig.stagePauseMs) ? runConfig.stagePauseMs : 0;
  return Math.min(900, Math.max(300, Math.floor(configured * 0.35)));
}

function labelFromTarget(target: string | RegExp): string {
  return typeof target === 'string'
    ? target
    : target.source.replace(/\\(.)/g, '$1').replace(/[\\^$.*+?()[\]{}|]/g, ' ').trim();
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function spotlightLocator(locator: Locator, label: string): Promise<void> {
  if (!shouldShowActionCue()) return;

  const pauseMs = cuePauseMs();
  await locator.scrollIntoViewIfNeeded().catch(() => undefined);
  await locator
    .evaluate(
      async (element, options) => {
        const ringId = 'equipqr-e2e-action-spotlight';
        const labelId = 'equipqr-e2e-action-spotlight-label';
        document.getElementById(ringId)?.remove();
        document.getElementById(labelId)?.remove();

        const rect = element.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;

        const ring = document.createElement('div');
        ring.id = ringId;
        ring.setAttribute('aria-hidden', 'true');
        Object.assign(ring.style, {
          position: 'fixed',
          pointerEvents: 'none',
          zIndex: '2147483646',
          left: `${Math.max(8, rect.left - 8)}px`,
          top: `${Math.max(8, rect.top - 8)}px`,
          width: `${rect.width + 16}px`,
          height: `${rect.height + 16}px`,
          border: '4px solid #7B3EE7',
          borderRadius: '14px',
          boxShadow: '0 0 0 8px rgba(123, 62, 231, 0.18), 0 16px 45px rgba(15, 23, 42, 0.28)',
          background: 'rgba(123, 62, 231, 0.06)',
          transition: 'opacity 220ms ease',
        });

        const caption = document.createElement('div');
        caption.id = labelId;
        caption.setAttribute('aria-hidden', 'true');
        caption.textContent = options.label;
        Object.assign(caption.style, {
          position: 'fixed',
          pointerEvents: 'none',
          zIndex: '2147483647',
          left: `${Math.max(8, rect.left - 8)}px`,
          top: `${Math.max(8, rect.top - 42)}px`,
          maxWidth: 'min(520px, calc(100vw - 24px))',
          padding: '7px 10px',
          borderRadius: '999px',
          background: '#7B3EE7',
          color: 'white',
          font: '700 12px/1.25 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.26)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        });

        document.documentElement.append(ring, caption);
        window.setTimeout(() => {
          ring.style.opacity = '0';
          caption.style.opacity = '0';
          window.setTimeout(() => {
            ring.remove();
            caption.remove();
          }, 260);
        }, options.pauseMs + 1200);

        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, options.pauseMs);
        });
      },
      { label, pauseMs },
    )
    .catch(() => undefined);
}

export async function clickWithDemoCue(
  locator: Locator,
  label: string,
  options?: LocatorClickOptions,
): Promise<void> {
  await spotlightLocator(locator, label);
  await locator.click(options);
  const pauseMs = postActionPauseMs();
  if (pauseMs > 0) {
    await wait(pauseMs);
  }
}

export async function fillWithDemoCue(
  locator: Locator,
  label: string,
  value: string,
  options?: LocatorFillOptions,
): Promise<void> {
  await spotlightLocator(locator, label);
  await locator.fill(value, options);
  const pauseMs = postActionPauseMs();
  if (pauseMs > 0) {
    await wait(pauseMs);
  }
}

export async function installActionOverlay(page: Page, title: string): Promise<void> {
  if (!runConfig.actionOverlay) return;

  const mode = runConfig.overlayMode;

  await page.addInitScript(({ initialTitle, overlayMode, recordingTitle }) => {
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
        label.textContent = overlayMode === 'marketing' ? 'EquipQR demo' : 'EquipQR E2E';

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
      if (recordingTitle) {
        return recordingTitle;
      }

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
  }, { initialTitle: title, overlayMode: mode, recordingTitle: runConfig.recordingTitle });

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
  if (runConfig.actionOverlay) {
    await page
      .evaluate((status) => {
        const setter = (window as Window & {
          __equipqrE2ESetStatus?: (message: string) => void;
        }).__equipqrE2ESetStatus;
        setter?.(status);
      }, message)
      .catch(() => undefined);
  }

  if (options.pauseAfter === false) return;
  const pauseMs = runConfig.stagePauseMs;
  if (Number.isFinite(pauseMs) && pauseMs > 0) {
    await page.waitForTimeout(pauseMs);
  }
}

export async function pauseForWatchMode(page: Page): Promise<void> {
  const pauseMs = runConfig.watchPauseMs;
  if (!Number.isFinite(pauseMs) || pauseMs <= 0) return;

  await setActionOverlay(page, 'Reviewing final state before closing', { pauseAfter: false });
  const scrolled = await page
    .evaluate(async (durationMs) => {
      const root = document.scrollingElement ?? document.documentElement;
      const maxScroll = Math.max(0, root.scrollHeight - window.innerHeight);
      if (maxScroll < 24) return false;

      root.scrollTop = 0;
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });

      const startedAt = performance.now();
      await new Promise<void>((resolve) => {
        const step = (now: number) => {
          const elapsed = now - startedAt;
          const progress = Math.min(1, elapsed / durationMs);
          const eased = progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;

          root.scrollTo(0, maxScroll * eased);

          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            resolve();
          }
        };

        requestAnimationFrame(step);
      });

      return true;
    }, pauseMs)
    .catch(() => false);

  if (!scrolled) {
    await page.waitForTimeout(pauseMs);
  }
}

export { labelFromTarget };
