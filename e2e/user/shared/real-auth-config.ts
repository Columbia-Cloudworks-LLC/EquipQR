import fs from 'fs';
import path from 'path';

const TRUTHY = new Set(['1', 'true', 'yes', 'on']);

/** Default captured storage file for Google sign-in + Workspace flows on local dev. */
export const DEFAULT_GOOGLE_WORKSPACE_LOCAL_AUTH_PATH = 'tmp/playwright/auth/google-workspace-local.json';

export function isTruthyEnv(value: string | undefined): boolean {
  if (!value?.trim()) return false;
  return TRUTHY.has(value.trim().toLowerCase());
}

/** Path where Google real-auth capture writes storage state (env override or default). */
export function resolveGoogleWorkspaceAuthStoragePath(): string {
  const raw = process.env.E2E_REAL_AUTH_STORAGE_STATE?.trim();
  const relative = raw || DEFAULT_GOOGLE_WORKSPACE_LOCAL_AUTH_PATH;
  return path.resolve(relative);
}

/** Resolved path to the captured Playwright storage state, or null if unset/missing. */
export function resolveRealAuthStorageState(): string | null {
  const resolved = resolveGoogleWorkspaceAuthStoragePath();
  return fs.existsSync(resolved) ? resolved : null;
}

/** Base URL for real-auth runs (defaults to preview). */
export function resolveRealAuthBaseUrl(): string {
  const raw = process.env.E2E_REAL_AUTH_BASE_URL?.trim();
  return raw ? raw.replace(/\/+$/, '') : 'https://preview.equipqr.app';
}

export function resolveVercelAutomationBypassHeaders(): Record<string, string> | undefined {
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
  if (!secret) return undefined;

  return {
    'x-vercel-protection-bypass': secret,
    'x-vercel-set-bypass-cookie': 'true',
  };
}

/** Known-safe completed work order ID for QuickBooks export smoke. */
export function resolveQboWorkOrderId(): string | null {
  const raw = process.env.E2E_QBO_WORK_ORDER_ID?.trim();
  return raw || null;
}

/** Optional completed work order UUID for local Google Docs export proof. */
export function resolveGoogleDocsWorkOrderId(): string | null {
  const raw = process.env.E2E_GOOGLE_DOCS_WORK_ORDER_ID?.trim();
  return raw || null;
}

export function isQboProductionDraftsAllowed(): boolean {
  return isTruthyEnv(process.env.E2E_ALLOW_QBO_PRODUCTION_DRAFTS);
}

export function hasRealAuthStorageState(): boolean {
  return Boolean(resolveRealAuthStorageState());
}

export function hasRealAuthExportPrerequisites(): boolean {
  return Boolean(
    resolveRealAuthStorageState() &&
      resolveQboWorkOrderId() &&
      isQboProductionDraftsAllowed(),
  );
}

export function missingRealAuthStorageMessage(): string {
  const raw = process.env.E2E_REAL_AUTH_STORAGE_STATE?.trim();
  if (!raw) {
    return (
      `Capture Google sign-in storage with npm run e2e:google-auth:capture ` +
      `(writes ${DEFAULT_GOOGLE_WORKSPACE_LOCAL_AUTH_PATH}) or set E2E_REAL_AUTH_STORAGE_STATE. ` +
      'See docs/ops/playwright-real-auth-integrations.md.'
    );
  }
  return `E2E_REAL_AUTH_STORAGE_STATE points to a missing file: ${path.resolve(raw)}. Re-capture with npm run e2e:google-auth:capture.`;
}

export function getProductionQuickBooksInvoiceUrl(invoiceId: string): string {
  return `https://app.qbo.intuit.com/app/invoice?txnId=${invoiceId}`;
}

export function missingRealAuthExportMessage(): string {
  const parts: string[] = [];
  if (!resolveRealAuthStorageState()) {
    parts.push(missingRealAuthStorageMessage());
  }
  if (!resolveQboWorkOrderId()) {
    parts.push('Set E2E_QBO_WORK_ORDER_ID to a known-safe completed preview work order.');
  }
  if (!isQboProductionDraftsAllowed()) {
    parts.push('Set E2E_ALLOW_QBO_PRODUCTION_DRAFTS=true to opt in to production QBO draft invoice create/update.');
  }
  return parts.join(' ');
}
