import fs from 'fs/promises';
import path from 'path';
import type { APIRequestContext, APIResponse, Locator, Page } from '@playwright/test';
import {
  assertEvidenceFrameReady,
  evidenceScreenshotTarget,
  scrollLocatorIntoEvidenceFrame,
} from './evidence-frame-helpers';

export {
  assertEvidenceFrameReady,
  EVIDENCE_FRAME_PADDING_PX,
  evaluateFrameReadiness,
  evidenceScreenshotTarget,
  scrollLocatorIntoEvidenceFrame,
} from './evidence-frame-helpers';
export type { FrameReadinessResult, ViewportRect, ViewportSize } from './evidence-frame-helpers';

export function prEvidenceFlowSlug(): string {
  return (process.env.PR_EVIDENCE_FLOW || 'change').replace(/[^a-z0-9-]/gi, '-');
}

export function prEvidenceArtifactDir(): string {
  return path.join(process.cwd(), 'tmp', 'pr-evidence', prEvidenceFlowSlug());
}

export async function ensureEvidenceDirs(): Promise<{ screenshotsDir: string; artifactsDir: string }> {
  const artifactsDir = prEvidenceArtifactDir();
  const screenshotsDir = path.join(artifactsDir, 'screenshots');
  await fs.mkdir(screenshotsDir, { recursive: true });
  return { screenshotsDir, artifactsDir };
}

export interface EvidenceScreenshotOptions {
  /** When set, scrolls the control into frame and asserts it is fully visible before capture. */
  target?: Locator;
}

/**
 * Save a labeled PNG under tmp/pr-evidence/{flow}/screenshots/ for upload scripts.
 * Always asserts no horizontal viewport overflow; pass `target` to gate on control framing.
 */
export async function evidenceScreenshot(
  page: Page,
  label: string,
  options?: EvidenceScreenshotOptions,
): Promise<string> {
  if (options?.target) {
    return evidenceScreenshotTarget(page, options.target, label, captureEvidenceScreenshot);
  }

  await assertEvidenceFrameReady(page);
  return captureEvidenceScreenshot(page, label);
}

async function captureEvidenceScreenshot(page: Page, label: string): Promise<string> {
  const { screenshotsDir } = await ensureEvidenceDirs();
  const safeLabel = label.replace(/[^a-z0-9-]/gi, '-').replace(/-+/g, '-');
  const filePath = path.join(screenshotsDir, `${safeLabel}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  return filePath;
}

export async function evidencePause(page: Page, ms: number): Promise<void> {
  await page.waitForTimeout(ms);
}

const DEFAULT_DOCS_BASE = process.env.PR_EVIDENCE_DOCS_URL ?? 'http://localhost:5174';
const OPERATOR_GUIDE_PATH = '/support/administration/operator-daily-check-ins';

/** Fails fast when equipqr.info local docs are not running for discovery evidence. */
export async function assertDocsDevServerReady(
  request: APIRequestContext,
  baseUrl: string = DEFAULT_DOCS_BASE,
): Promise<void> {
  const guideUrl = `${baseUrl.replace(/\/$/, '')}${OPERATOR_GUIDE_PATH}`;

  let response: APIResponse;
  try {
    response = await request.get(guideUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Docs dev server unreachable at ${guideUrl}: ${message}`);
  }

  const body = await response.text();
  if (!response.ok()) {
    throw new Error(
      `Docs dev server required at ${baseUrl} (start via dev-start.bat). GET ${guideUrl} returned ${response.status()} ${response.statusText()}: ${body.slice(0, 200)}`,
    );
  }

  const isVitePressDevShell =
    body.includes('vitepress') || body.includes('/@vite/client') || body.includes('id="app"');
  if (!isVitePressDevShell) {
    throw new Error(
      `Docs dev server probe at ${guideUrl} returned ${response.status()} but response did not look like VitePress: ${body.slice(0, 200)}`,
    );
  }
}
