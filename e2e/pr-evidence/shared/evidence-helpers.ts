import fs from 'fs/promises';
import path from 'path';
import type { Page } from '@playwright/test';

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
