import fs from 'fs';
import path from 'path';

const TRUTHY = new Set(['1', 'true', 'yes', 'on']);

/** Default captured storage file for Google sign-in + Workspace flows on local dev. */
export const DEFAULT_GOOGLE_WORKSPACE_LOCAL_AUTH_PATH = 'tmp/playwright/auth/google-workspace-local.json';

/** Default EquipQR session replay file after local QuickBooks Connect capture. */
export const DEFAULT_QUICKBOOKS_LOCAL_AUTH_PATH = 'tmp/playwright/auth/quickbooks-local.json';

/** Default Intuit Developer Portal session for agent browser replay. */
export const DEFAULT_QUICKBOOKS_DEVELOPER_AUTH_PATH = 'tmp/playwright/auth/quickbooks-developer-local.json';

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

/** Path where local QuickBooks Connect capture writes EquipQR session storage state. */
export function resolveQuickBooksLocalAuthStoragePath(): string {
  const raw = process.env.E2E_QB_LOCAL_AUTH_STORAGE_STATE?.trim();
  const relative = raw || DEFAULT_QUICKBOOKS_LOCAL_AUTH_PATH;
  return path.resolve(relative);
}

/** Path where Intuit Developer Portal capture writes browser storage state. */
export function resolveQuickBooksDeveloperAuthStoragePath(): string {
  const raw = process.env.E2E_QB_DEVELOPER_AUTH_STORAGE_STATE?.trim();
  const relative = raw || DEFAULT_QUICKBOOKS_DEVELOPER_AUTH_PATH;
  return path.resolve(relative);
}

/** Resolved QuickBooks local session file, or null if missing. */
export function resolveQuickBooksLocalAuthStorageState(): string | null {
  const resolved = resolveQuickBooksLocalAuthStoragePath();
  return fs.existsSync(resolved) ? resolved : null;
}

export function hasQuickBooksLocalAuthStorageState(): boolean {
  return Boolean(resolveQuickBooksLocalAuthStorageState());
}

/** Resolved Intuit Developer Portal session file, or null if missing. */
export function resolveQuickBooksDeveloperAuthStorageState(): string | null {
  const resolved = resolveQuickBooksDeveloperAuthStoragePath();
  return fs.existsSync(resolved) ? resolved : null;
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

export type QuickBooksEnvironmentLabel = 'sandbox' | 'production';

export function isQboProductionDraftsAllowed(): boolean {
  return isTruthyEnv(process.env.E2E_ALLOW_QBO_PRODUCTION_DRAFTS);
}

/** Opt-in gate for any QuickBooks draft invoice create/update in real-auth E2E. */
export function isQboDraftExportAllowed(): boolean {
  return (
    isTruthyEnv(process.env.E2E_ALLOW_QBO_DRAFTS) ||
    isQboProductionDraftsAllowed()
  );
}

/** Preview real-auth runs target sandbox QBO; production export tests opt in explicitly. */
export function resolveExpectedQboEnvironment(): QuickBooksEnvironmentLabel {
  if (isQboProductionDraftsAllowed()) {
    return 'production';
  }
  return 'sandbox';
}

export function hasRealAuthStorageState(): boolean {
  return Boolean(resolveRealAuthStorageState());
}

export function hasRealAuthExportPrerequisites(): boolean {
  return Boolean(
    resolveRealAuthStorageState() &&
      resolveQboWorkOrderId() &&
      isQboDraftExportAllowed(),
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

export function getQuickBooksInvoiceUrl(
  invoiceId: string,
  environment: QuickBooksEnvironmentLabel,
): string {
  const baseUrl =
    environment === 'production'
      ? 'https://app.qbo.intuit.com'
      : 'https://app.sandbox.qbo.intuit.com';
  return `${baseUrl}/app/invoice?txnId=${invoiceId}`;
}

/** @deprecated Prefer {@link getQuickBooksInvoiceUrl} with an explicit environment. */
export function getProductionQuickBooksInvoiceUrl(invoiceId: string): string {
  return getQuickBooksInvoiceUrl(invoiceId, 'production');
}

export function missingRealAuthExportMessage(): string {
  const parts: string[] = [];
  if (!resolveRealAuthStorageState()) {
    parts.push(missingRealAuthStorageMessage());
  }
  if (!resolveQboWorkOrderId()) {
    parts.push('Set E2E_QBO_WORK_ORDER_ID to a known-safe completed preview work order.');
  }
  if (!isQboDraftExportAllowed()) {
    parts.push(
      'Set E2E_ALLOW_QBO_DRAFTS=true to opt in to sandbox draft invoice create/update on preview (or E2E_ALLOW_QBO_PRODUCTION_DRAFTS=true for production QBO).',
    );
  }
  return parts.join(' ');
}

export function missingQuickBooksLocalAuthMessage(): string {
  const raw = process.env.E2E_QB_LOCAL_AUTH_STORAGE_STATE?.trim();
  if (!raw) {
    return (
      `Capture local QuickBooks integration with npm run e2e:quickbooks-auth:capture ` +
      `(writes ${DEFAULT_QUICKBOOKS_LOCAL_AUTH_PATH}). See docs/ops/playwright-real-auth-integrations.md.`
    );
  }
  return `E2E_QB_LOCAL_AUTH_STORAGE_STATE points to a missing file: ${path.resolve(raw)}. Re-capture with npm run e2e:quickbooks-auth:capture.`;
}

export function missingQuickBooksDeveloperAuthMessage(): string {
  const raw = process.env.E2E_QB_DEVELOPER_AUTH_STORAGE_STATE?.trim();
  if (!raw) {
    return (
      `Capture Intuit Developer Portal session with npm run e2e:quickbooks-developer-auth:capture ` +
      `(writes ${DEFAULT_QUICKBOOKS_DEVELOPER_AUTH_PATH}). See docs/ops/playwright-real-auth-integrations.md.`
    );
  }
  return `E2E_QB_DEVELOPER_AUTH_STORAGE_STATE points to a missing file: ${path.resolve(raw)}. Re-capture with npm run e2e:quickbooks-developer-auth:capture.`;
}
