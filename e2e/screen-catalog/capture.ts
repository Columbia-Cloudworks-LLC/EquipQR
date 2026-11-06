/**
 * Capture engine for the screen catalog: target resolution, step replay,
 * deterministic settling, scroll-container detection and viewport slicing.
 */
import fs from 'fs/promises';
import path from 'path';
import type { Locator, Page } from '@playwright/test';
import type { CaptureMode, CatalogStep, CatalogTarget } from './types';

const SCROLL_MARK = 'data-screen-catalog-scroll';
const MAX_SLICES = 80;
const SETTLE_TIMEOUT_MS = 20_000;

/** Overlays the catalog treats as "the screen" when capture = overlay. */
const OVERLAY_SELECTOR = [
  '[role="dialog"][data-state="open"]',
  '[role="alertdialog"][data-state="open"]',
  '[role="dialog"]:not([data-state])',
  '[vaul-drawer][data-state="open"]',
].join(', ');

/** Loading indicators that must be gone before a capture is considered settled. */
const BUSY_SELECTOR = [
  '[aria-busy="true"]',
  '.animate-pulse',
  '.animate-spin',
  '[data-loading="true"]',
  '[role="progressbar"][data-state="indeterminate"]',
].join(', ');

export function resolveTarget(page: Page, target: CatalogTarget): Locator {
  const scope = target.within === 'dialog' ? page.locator(OVERLAY_SELECTOR).last() : page;
  let locator: Locator;
  if ('role' in target) {
    locator = scope.getByRole(target.role, { name: target.name, exact: target.exact });
  } else if ('label' in target) {
    locator = scope.getByLabel(target.label);
  } else if ('placeholder' in target) {
    locator = scope.getByPlaceholder(target.placeholder);
  } else if ('text' in target) {
    locator = scope.getByText(target.text);
  } else {
    locator = scope.locator(target.css);
  }
  return target.nth === undefined ? locator.first() : locator.nth(target.nth);
}

function describeTarget(target: CatalogTarget): string {
  const fmt = (value: string | RegExp) =>
    typeof value === 'string' ? `"${value}"` : `"${value.source.replace(/\\/g, '')}"`;
  const where = target.within === 'dialog' ? ' in the dialog' : '';
  if ('role' in target) return `${target.role} ${fmt(target.name)}${where}`;
  if ('label' in target) return `field labelled ${fmt(target.label)}${where}`;
  if ('placeholder' in target) return `field with placeholder ${fmt(target.placeholder)}${where}`;
  if ('text' in target) return `text ${fmt(target.text)}${where}`;
  return `element \`${target.css}\`${where}`;
}

export function describeStep(step: CatalogStep): string {
  if (step.note) return step.note;
  switch (step.action) {
    case 'click':
      return `Tap ${describeTarget(step.target)}`;
    case 'fill':
      return `Type "${step.value}" into ${describeTarget(step.target)}`;
    case 'press':
      return `Press ${step.key}`;
    case 'waitFor':
      return `Wait for ${describeTarget(step.target)}`;
    case 'scrollIntoView':
      return `Scroll to ${describeTarget(step.target)}`;
  }
}

export async function runSteps(page: Page, steps: CatalogStep[]): Promise<void> {
  for (const step of steps) {
    if (step.action === 'press') {
      await page.keyboard.press(step.key);
    } else {
      const locator = resolveTarget(page, step.target);
      await locator.waitFor({ state: 'visible', timeout: SETTLE_TIMEOUT_MS });
      if (step.action === 'click') {
        await locator.scrollIntoViewIfNeeded();
        await locator.click();
      } else if (step.action === 'fill') {
        await locator.fill(step.value);
      } else if (step.action === 'scrollIntoView') {
        await locator.scrollIntoViewIfNeeded();
      }
    }
    await settle(page);
  }
}

/**
 * Wait until the page looks finished: fonts loaded, images decoded, no busy
 * indicators visible and the DOM size unchanged across two consecutive checks.
 * Returns a warning string when the page never fully settled.
 */
export async function settle(page: Page, timeoutMs = SETTLE_TIMEOUT_MS): Promise<string | null> {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);
  const deadline = Date.now() + timeoutMs;
  let previous = '';
  let stableChecks = 0;
  let lastBusy = 0;
  while (Date.now() < deadline) {
    const snapshot = await page.evaluate(async (busySelector) => {
      // Load every Latin font face up front so no text renders in a fallback that swaps later.
      await Promise.all(
        [...document.fonts]
          .filter((face) => face.status !== 'loaded' && /U\+0(000)?-|U\+0-10FFFF/i.test(face.unicodeRange || 'U+0-10FFFF'))
          .map((face) => face.load().catch(() => undefined)),
      );
      await document.fonts.ready;
      const isVisible = (el: Element) => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;
        const style = getComputedStyle(el);
        return style.visibility !== 'hidden' && style.display !== 'none';
      };
      const busy = [...document.querySelectorAll(busySelector)].filter(isVisible).length;
      const pendingImages = [...document.images].filter(
        (img) => isVisible(img) && img.loading !== 'lazy' && !img.complete,
      ).length;
      const scroller = document.scrollingElement ?? document.body;
      return {
        busy,
        pendingImages,
        signature: `${document.body.innerText.length}:${scroller.scrollHeight}:${document.querySelectorAll('*').length}`,
      };
    }, BUSY_SELECTOR);
    lastBusy = snapshot.busy;
    const quiet = snapshot.busy === 0 && snapshot.pendingImages === 0;
    if (quiet && snapshot.signature === previous) {
      stableChecks += 1;
      if (stableChecks >= 2) {
        await nextFrames(page);
        return null;
      }
    } else {
      stableChecks = 0;
    }
    previous = snapshot.signature;
    await page.waitForTimeout(250);
  }
  await nextFrames(page);
  return lastBusy > 0
    ? `Page still showed ${lastBusy} loading indicator(s) after ${timeoutMs}ms`
    : `DOM kept changing for ${timeoutMs}ms`;
}

async function nextFrames(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

export interface ScrollPlan {
  /** Human description of the scroll container, e.g. `document` or `div.overflow-y-auto`. */
  container: string;
  isDocument: boolean;
  scrollHeight: number;
  clientHeight: number;
  /** Height covered by fixed/sticky chrome at the top / bottom of the container. */
  topInset: number;
  bottomInset: number;
  offsets: number[];
  truncated: boolean;
}

/**
 * Pick the element whose scrolling reveals the screen's content, mark it, and
 * plan viewport-sized slices. The step between slices is the container height
 * minus sticky/fixed chrome (top bar, bottom nav, dialog header/footer), so
 * no content is hidden behind chrome between two consecutive slices.
 */
export async function planScroll(page: Page, mode: CaptureMode): Promise<ScrollPlan> {
  if (mode === 'viewport') {
    const size = page.viewportSize();
    const height = size?.height ?? 0;
    return {
      container: 'viewport (no scrolling)',
      isDocument: true,
      scrollHeight: height,
      clientHeight: height,
      topInset: 0,
      bottomInset: 0,
      offsets: [-1],
      truncated: false,
    };
  }
  const plan = await page.evaluate(
    ({ mode, overlaySelector, mark }) => {
      document.querySelectorAll(`[${mark}]`).forEach((el) => el.removeAttribute(mark));
      const isScrollable = (el: Element) => {
        const style = getComputedStyle(el);
        return (
          /(auto|scroll|overlay)/.test(style.overflowY) && el.scrollHeight > el.clientHeight + 1
        );
      };
      const describe = (el: Element) => {
        const cls = [...el.classList].slice(0, 3).join('.');
        // Generated ids (React useId / Radix) change between runs; keep only authored ones.
        const stableId = el.id && !/radix|^_?r_|:/.test(el.id) ? `#${el.id}` : '';
        return `${el.tagName.toLowerCase()}${stableId}${el.getAttribute('role') ? `[role=${el.getAttribute('role')}]` : ''}${cls ? `.${cls}` : ''}`;
      };

      let root: Element;
      if (mode === 'overlay') {
        const overlays = [...document.querySelectorAll(overlaySelector)];
        const overlay = overlays[overlays.length - 1];
        if (!overlay) throw new Error('capture=overlay but no open dialog/sheet/drawer was found');
        root = overlay;
      } else {
        root = document.body;
      }

      let container: Element | null = null;
      if (mode === 'page') {
        const docScroller = document.scrollingElement ?? document.documentElement;
        if (docScroller.scrollHeight > window.innerHeight + 1) {
          container = docScroller;
        }
      }
      if (!container) {
        // Largest visible scrollable descendant (inner scroll areas).
        const candidates = [root, ...root.querySelectorAll('*')].filter((el) => {
          if (!isScrollable(el)) return false;
          const rect = el.getBoundingClientRect();
          return rect.width >= window.innerWidth * 0.5 && rect.height >= 120;
        });
        candidates.sort(
          (a, b) =>
            b.clientHeight * b.clientWidth - a.clientHeight * a.clientWidth ||
            b.scrollHeight - a.scrollHeight,
        );
        // A dialog that does not scroll internally is captured as-is, never the page behind it.
        container = candidates[0] ?? (mode === 'overlay' ? root : null);
      }

      const isDocument =
        !container ||
        container === document.scrollingElement ||
        container === document.documentElement ||
        container === document.body;
      const target = container ?? document.scrollingElement ?? document.documentElement;
      if (!isDocument) target.setAttribute(mark, '1');

      const frame = isDocument
        ? { top: 0, bottom: window.innerHeight, left: 0, width: window.innerWidth }
        : (() => {
            const rect = target.getBoundingClientRect();
            return { top: rect.top, bottom: rect.bottom, left: rect.left, width: rect.width };
          })();
      const clientHeight = isDocument ? window.innerHeight : target.clientHeight;

      let topInset = 0;
      let bottomInset = 0;
      const chromeRoot = isDocument ? document.body : target;
      for (const el of chromeRoot.querySelectorAll('*')) {
        const style = getComputedStyle(el);
        if (style.position !== 'fixed' && style.position !== 'sticky') continue;
        if (style.visibility === 'hidden' || style.display === 'none') continue;
        // Empty click-through layers (toast viewports, portals) are not chrome.
        if (style.pointerEvents === 'none') continue;
        const transparent = /rgba\(0, 0, 0, 0\)|transparent/.test(style.backgroundColor);
        if (transparent && !(el as HTMLElement).innerText?.trim()) continue;
        const rect = el.getBoundingClientRect();
        if (rect.height === 0 || rect.width < frame.width * 0.5) continue;
        if (rect.height > clientHeight * 0.4) continue;
        if (Math.abs(rect.top - frame.top) <= 2) {
          topInset = Math.max(topInset, rect.bottom - frame.top);
        } else if (Math.abs(rect.bottom - frame.bottom) <= 2) {
          bottomInset = Math.max(bottomInset, frame.bottom - rect.top);
        }
      }

      return {
        container: isDocument ? 'document' : describe(target),
        isDocument,
        scrollHeight: target.scrollHeight,
        clientHeight,
        topInset: Math.round(topInset),
        bottomInset: Math.round(bottomInset),
      };
    },
    { mode, overlaySelector: OVERLAY_SELECTOR, mark: SCROLL_MARK },
  );

  const maxScroll = Math.max(0, plan.scrollHeight - plan.clientHeight);
  const step = Math.max(200, plan.clientHeight - plan.topInset - plan.bottomInset);
  const offsets: number[] = [0];
  while (offsets[offsets.length - 1] < maxScroll && offsets.length < MAX_SLICES) {
    offsets.push(Math.min(maxScroll, offsets[offsets.length - 1] + step));
  }
  const truncated = offsets[offsets.length - 1] < maxScroll;
  return { ...plan, offsets, truncated };
}

async function scrollTo(page: Page, plan: ScrollPlan, top: number): Promise<number> {
  return page.evaluate(
    ({ isDocument, top, mark }) => {
      const el = isDocument
        ? (document.scrollingElement ?? document.documentElement)
        : document.querySelector(`[${mark}]`);
      if (!el) throw new Error('Scroll container disappeared between slices');
      el.scrollTop = top;
      return el.scrollTop;
    },
    { isDocument: plan.isDocument, top, mark: SCROLL_MARK },
  );
}

export interface SliceResult {
  file: string;
  index: number;
  scrollTop: number;
}

export async function captureSlices(
  page: Page,
  plan: ScrollPlan,
  dir: string,
  mask: string[],
  beforeShot?: () => Promise<unknown>,
): Promise<SliceResult[]> {
  await fs.mkdir(dir, { recursive: true });
  const slices: SliceResult[] = [];
  const scrolls = plan.offsets[0] !== -1;
  for (const [index, offset] of plan.offsets.entries()) {
    let actual = 0;
    if (scrolls) {
      actual = await scrollTo(page, plan, offset);
      // Scrolling can trigger lazy content; let it land before the shot.
      await settle(page, 8_000);
    } else {
      actual = await page.evaluate(() => (document.scrollingElement ?? document.documentElement).scrollTop);
    }
    if (beforeShot) await beforeShot();
    const file = path.join(dir, `slice-${String(index + 1).padStart(2, '0')}.png`);
    await page.screenshot({
      path: file,
      animations: 'disabled',
      caret: 'hide',
      scale: 'device',
      mask: mask.map((selector) => page.locator(selector)),
      maskColor: '#3f3f46',
    });
    slices.push({ file, index: index + 1, scrollTop: actual });
  }
  if (scrolls) await scrollTo(page, plan, 0);
  return slices;
}

export interface ScreenContext {
  pageTitle: string;
  headings: string[];
  visibleText: string;
  ariaSnapshot: string;
}

/** Text context for the gallery / clipboard: headings, rendered text and the accessibility tree. */
export async function collectContext(page: Page, mode: CaptureMode): Promise<ScreenContext> {
  const rootSelector = mode === 'overlay' ? OVERLAY_SELECTOR : 'body';
  const root = page.locator(rootSelector).last();
  const { headings, visibleText } = await root.evaluate((el) => {
    const clean = (value: string) => value.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    return {
      headings: [...el.querySelectorAll('h1, h2, h3, [role="heading"]')]
        .map((heading) => {
          const level = heading.tagName.match(/^H(\d)$/)?.[1] ?? heading.getAttribute('aria-level') ?? '?';
          return `h${level} ${clean((heading as HTMLElement).innerText)}`;
        })
        .filter((line) => line.length > 3),
      visibleText: clean((el as HTMLElement).innerText),
    };
  });
  const ariaSnapshot = await root.ariaSnapshot().catch((error: unknown) => `(aria snapshot failed: ${String(error)})`);
  return { pageTitle: await page.title(), headings, visibleText, ariaSnapshot };
}

const POPUP_SELECTOR = [
  '[role="menu"][data-state="open"]',
  '[role="listbox"]',
  '[data-radix-popper-content-wrapper]',
].join(', ');

/** Pick the capture mode for the current page state when a screen does not set one. */
export async function detectCaptureMode(page: Page, hadSteps: boolean): Promise<CaptureMode> {
  if (!hadSteps) return 'page';
  if ((await page.locator(OVERLAY_SELECTOR).count()) > 0) return 'overlay';
  if ((await page.locator(POPUP_SELECTOR).count()) > 0) return 'viewport';
  return 'page';
}
