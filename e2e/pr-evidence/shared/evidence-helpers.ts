import fs from 'fs/promises';
import path from 'path';
import type { APIRequestContext, Page } from '@playwright/test';

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

/**
 * Save a labeled PNG under tmp/pr-evidence/{flow}/screenshots/ for upload scripts.
 */
export async function evidenceScreenshot(page: Page, label: string): Promise<string> {
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

  let response;
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
