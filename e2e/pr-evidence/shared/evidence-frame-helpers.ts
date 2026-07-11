import { expect, type Locator, type Page } from '@playwright/test';

/** Default inset so controls are not flush against viewport edges in evidence PNGs. */
export const EVIDENCE_FRAME_PADDING_PX = 8;

export interface ViewportRect {
  top: number;
  left: number;
  bottom: number;
  right: number;
  width: number;
  height: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

export interface FrameReadinessResult {
  ok: boolean;
  violations: string[];
}

type ViewportEdge = 'top' | 'left' | 'bottom' | 'right';

/** App chrome that intentionally hugs a viewport edge (bottom nav, sidebar, top bar). */
export function isFullBleedChromeEdge(
  rect: ViewportRect,
  viewport: ViewportSize,
  edge: ViewportEdge,
): boolean {
  const widthRatio = rect.width / viewport.width;
  const heightRatio = rect.height / viewport.height;

  switch (edge) {
    case 'top':
      return rect.top <= 2 && widthRatio >= 0.7;
    case 'bottom':
      return rect.bottom >= viewport.height - 2 && widthRatio >= 0.7;
    case 'left':
      return rect.left <= 2 && heightRatio >= 0.35;
    case 'right':
      return rect.right >= viewport.width - 2 && heightRatio >= 0.35;
    default: {
      const _exhaustive: never = edge;
      return _exhaustive;
    }
  }
}

/** Bottom tab bar or fixed footer band (wide, short, pinned to viewport bottom). */
export function isBottomChromeBand(rect: ViewportRect, viewport: ViewportSize): boolean {
  const bandPx = 88;
  const inBand = rect.bottom >= viewport.height - 2 && rect.top >= viewport.height - bandPx;
  if (!inBand) {
    return false;
  }
  const fullWidthChrome = rect.width / viewport.width >= 0.5;
  const tabItem = rect.height <= bandPx;
  return fullWidthChrome || tabItem;
}

/** Top app bar band (wide, short, pinned to viewport top). */
export function isTopChromeBand(rect: ViewportRect, viewport: ViewportSize): boolean {
  const bandPx = 72;
  return rect.top <= 2 && rect.bottom <= bandPx && rect.width / viewport.width >= 0.5;
}

function isEdgeViolationAllowed(
  rect: ViewportRect,
  viewport: ViewportSize,
  edge: ViewportEdge,
): boolean {
  if (isFullBleedChromeEdge(rect, viewport, edge)) {
    return true;
  }
  if (edge === 'bottom' || edge === 'left' || edge === 'right') {
    return isBottomChromeBand(rect, viewport);
  }
  if (edge === 'top') {
    return isTopChromeBand(rect, viewport);
  }
  return false;
}

/**
 * Pure viewport math for unit tests and Playwright frame gates.
 */
export function evaluateFrameReadiness(
  viewport: ViewportSize,
  scrollWidth: number,
  targetRect?: ViewportRect | null,
  padding = EVIDENCE_FRAME_PADDING_PX,
): FrameReadinessResult {
  const violations: string[] = [];

  if (scrollWidth > viewport.width + 1) {
    violations.push(
      `horizontal overflow (${scrollWidth}px document width vs ${viewport.width}px viewport)`,
    );
  }

  if (targetRect) {
    if (targetRect.width <= 0 || targetRect.height <= 0) {
      violations.push('target control has zero rendered size');
    }
    if (targetRect.top < padding && !isEdgeViolationAllowed(targetRect, viewport, 'top')) {
      violations.push(`target clipped at top (${Math.round(targetRect.top)}px < ${padding}px padding)`);
    }
    if (targetRect.left < padding && !isEdgeViolationAllowed(targetRect, viewport, 'left')) {
      violations.push(`target clipped at left (${Math.round(targetRect.left)}px < ${padding}px padding)`);
    }
    if (
      targetRect.bottom > viewport.height - padding &&
      !isEdgeViolationAllowed(targetRect, viewport, 'bottom')
    ) {
      violations.push(
        `target clipped at bottom (${Math.round(targetRect.bottom)}px > ${viewport.height - padding}px)`,
      );
    }
    if (
      targetRect.right > viewport.width - padding &&
      !isEdgeViolationAllowed(targetRect, viewport, 'right')
    ) {
      violations.push(
        `target clipped at right (${Math.round(targetRect.right)}px > ${viewport.width - padding}px)`,
      );
    }
  }

  return { ok: violations.length === 0, violations };
}

/** Smoothly scroll a control into the evidence frame before capture. */
export async function scrollLocatorIntoEvidenceFrame(locator: Locator): Promise<void> {
  await locator.evaluate(async (element) => {
    element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    await new Promise<void>((resolve) => {
      let lastY = Number.NaN;
      const startedAt = performance.now();
      const maxWaitMs = 10_000;
      const check = () => {
        const { top } = element.getBoundingClientRect();
        if (top === lastY || performance.now() - startedAt >= maxWaitMs) {
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

async function readViewportMetrics(page: Page): Promise<{ viewport: ViewportSize; scrollWidth: number }> {
  return page.evaluate(() => ({
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    scrollWidth: document.documentElement.scrollWidth,
  }));
}

async function readLocatorRect(locator: Locator): Promise<ViewportRect> {
  const box = await locator.boundingBox();
  if (!box) {
    return { top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 };
  }

  return {
    top: box.y,
    left: box.x,
    bottom: box.y + box.height,
    right: box.x + box.width,
    width: box.width,
    height: box.height,
  };
}

/**
 * Fail fast when the page would produce misleading evidence (overflow, clipped targets).
 */
export async function assertEvidenceFrameReady(
  page: Page,
  target?: Locator,
  padding = EVIDENCE_FRAME_PADDING_PX,
): Promise<void> {
  const { viewport, scrollWidth } = await readViewportMetrics(page);
  const targetRect = target ? await readLocatorRect(target) : null;
  const result = evaluateFrameReadiness(viewport, scrollWidth, targetRect, padding);

  expect(
    result.ok,
    result.violations.length > 0
      ? `Evidence frame not ready:\n- ${result.violations.join('\n- ')}`
      : 'Evidence frame not ready',
  ).toBe(true);

  if (target) {
    await expect(target).toBeVisible();
  }
}

/**
 * Scroll a target into frame, assert layout quality, then capture a labeled PNG.
 */
export async function evidenceScreenshotTarget(
  page: Page,
  target: Locator,
  label: string,
  capture: (page: Page, label: string) => Promise<string>,
): Promise<string> {
  await scrollLocatorIntoEvidenceFrame(target);
  await assertEvidenceFrameReady(page, target);
  return capture(page, label);
}
