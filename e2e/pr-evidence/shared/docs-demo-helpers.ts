/**
 * Standardized Help Center demo capture methodology (#1161).
 *
 * Every docs-media demo video follows the same choreography on desktop and
 * mobile:
 *
 * 1. `settleForDemo` — after navigation or a major state change, wait for the
 *    page to fully load and hold ~1s so the loaded state is clearly visible.
 * 2. `focusAndClick` / `focusAndFill` — before acting on a control, scroll it
 *    fully into view (visible smooth scroll when the page is long), then play
 *    a focus animation that dims and blurs the rest of the screen while a
 *    spotlight converges on the control, hold ~0.5s, un-dim, then act.
 *
 * The spotlight is a fixed veil (dim + backdrop blur) whose rectangular
 * cutout animates from the full viewport down to the control bounds, plus a
 * brand-purple ring that tracks the cutout.
 */

import { expect, type Locator, type Page } from '@playwright/test';

/** How long the fully-loaded state stays visible before the next step. */
const SETTLE_HOLD_MS = 1000;
/** Converge animation duration. */
const FOCUS_ANIMATE_MS = 650;
/** Hold at full focus before un-dimming. */
const FOCUS_HOLD_MS = 500;
/** Pause after the action so the result is visible before the next step. */
const POST_ACTION_HOLD_MS = 700;

interface FocusOptions {
  /** Extra hold after the action completes (defaults to POST_ACTION_HOLD_MS). */
  postActionHoldMs?: number;
}

/**
 * Wait for the page to be fully loaded and hold it on screen so viewers see
 * the settled state (~1s) before the demo continues.
 */
export async function settleForDemo(page: Page, holdMs: number = SETTLE_HOLD_MS): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  // Give spinners/skeletons a chance to resolve before the visible hold.
  await page
    .locator('[data-loading="true"], [aria-busy="true"]')
    .first()
    .waitFor({ state: 'detached', timeout: 10_000 })
    .catch(() => undefined);
  await page.waitForTimeout(holdMs);
}

/** Smoothly scroll the control fully into view so viewers can follow along. */
async function scrollControlIntoView(locator: Locator): Promise<void> {
  await locator.evaluate(async (element) => {
    element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    await new Promise<void>((resolve) => {
      let lastY = Number.NaN;
      const check = () => {
        const { top } = element.getBoundingClientRect();
        if (top === lastY) {
          resolve();
          return;
        }
        lastY = top;
        window.setTimeout(check, 120);
      };
      window.setTimeout(check, 120);
    });
  });
}

/**
 * Play the converging dim/blur spotlight on a control. The overlay is purely
 * decorative (pointer-events: none) and is removed before the action runs.
 */
async function playFocusAnimation(locator: Locator): Promise<void> {
  await locator.evaluate(
    async (element, timings) => {
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const pad = 10;
      const target = {
        x: Math.max(0, rect.left - pad),
        y: Math.max(0, rect.top - pad),
        w: Math.min(window.innerWidth, rect.width + pad * 2),
        h: Math.min(window.innerHeight, rect.height + pad * 2),
      };
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const containerId = 'equipqr-docs-demo-focus';
      document.getElementById(containerId)?.remove();

      const container = document.createElement('div');
      container.id = containerId;
      container.setAttribute('aria-hidden', 'true');
      Object.assign(container.style, {
        position: 'fixed',
        inset: '0',
        pointerEvents: 'none',
        zIndex: '2147483646',
        opacity: '1',
        transition: 'opacity 200ms ease',
      });

      const veil = document.createElement('div');
      Object.assign(veil.style, {
        position: 'absolute',
        inset: '0',
        background: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(4px)',
      });

      const ring = document.createElement('div');
      Object.assign(ring.style, {
        position: 'absolute',
        border: '3px solid #7B3EE7',
        borderRadius: '12px',
        boxShadow: '0 0 0 6px rgba(123, 62, 231, 0.25)',
      });

      container.append(veil, ring);
      document.documentElement.appendChild(container);

      const setHole = (x: number, y: number, w: number, h: number) => {
        const outer = `M0 0 H${vw} V${vh} H0 Z`;
        const inner = `M${x} ${y} H${x + w} V${y + h} H${x} Z`;
        veil.style.clipPath = `path(evenodd, "${outer} ${inner}")`;
        Object.assign(ring.style, {
          left: `${x}px`,
          top: `${y}px`,
          width: `${w}px`,
          height: `${h}px`,
        });
      };

      const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

      // Converge the cutout from the full viewport to the control bounds.
      await new Promise<void>((resolve) => {
        const startedAt = performance.now();
        const step = (now: number) => {
          const progress = Math.min(1, (now - startedAt) / timings.animateMs);
          const eased = easeInOut(progress);
          setHole(
            target.x * eased,
            target.y * eased,
            vw + (target.w - vw) * eased,
            vh + (target.h - vh) * eased,
          );
          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            resolve();
          }
        };
        requestAnimationFrame(step);
      });

      // Hold fully focused, then un-dim and clean up.
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, timings.holdMs);
      });
      container.style.opacity = '0';
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 220);
      });
      container.remove();
    },
    { animateMs: FOCUS_ANIMATE_MS, holdMs: FOCUS_HOLD_MS },
  );
}

/** Scroll into view, verify fully visible, spotlight, then run the action. */
async function focusThen(
  page: Page,
  locator: Locator,
  action: () => Promise<void>,
  options: FocusOptions = {},
): Promise<void> {
  await expect(locator).toBeVisible({ timeout: 30_000 });
  await scrollControlIntoView(locator);
  await playFocusAnimation(locator);
  await action();
  await page.waitForTimeout(options.postActionHoldMs ?? POST_ACTION_HOLD_MS);
}

/** Spotlight a control per the #1161 methodology, then click it. */
export async function focusAndClick(page: Page, locator: Locator, options: FocusOptions = {}): Promise<void> {
  await focusThen(page, locator, () => locator.click(), options);
}

/** Spotlight an input per the #1161 methodology, then fill it. */
export async function focusAndFill(
  page: Page,
  locator: Locator,
  value: string,
  options: FocusOptions = {},
): Promise<void> {
  await focusThen(
    page,
    locator,
    async () => {
      await locator.click();
      await locator.fill(value);
    },
    options,
  );
}

/**
 * Spotlight a control without acting on it — used to point out read-only
 * surfaces (badges, summaries, status areas) mid-demo.
 */
export async function focusControl(page: Page, locator: Locator, options: FocusOptions = {}): Promise<void> {
  await focusThen(page, locator, async () => undefined, options);
}
