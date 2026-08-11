import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import path from 'path';
import {
  DEFAULT_GOOGLE_WORKSPACE_LOCAL_AUTH_PATH,
  getProductionQuickBooksInvoiceUrl,
  getQuickBooksInvoiceUrl,
  hasRealAuthExportPrerequisites,
  isQboDraftExportAllowed,
  isQboProductionDraftsAllowed,
  isTruthyEnv,
  resolveExpectedQboEnvironment,
  resolveGoogleDocsWorkOrderId,
  resolveGoogleWorkspaceAuthStoragePath,
  resolveRealAuthBaseUrl,
  resolveVercelAutomationBypassHeaders,
} from './real-auth-config';

describe('real-auth-config', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('parses truthy env values', () => {
    expect(isTruthyEnv('true')).toBe(true);
    expect(isTruthyEnv('YES')).toBe(true);
    expect(isTruthyEnv('false')).toBe(false);
    expect(isTruthyEnv(undefined)).toBe(false);
  });

  it('defaults real-auth base URL to preview', () => {
    delete process.env.E2E_REAL_AUTH_BASE_URL;
    expect(resolveRealAuthBaseUrl()).toBe('https://preview.equipqr.app');
  });

  it('defaults Google Workspace capture path when env is unset', () => {
    delete process.env.E2E_REAL_AUTH_STORAGE_STATE;
    expect(resolveGoogleWorkspaceAuthStoragePath()).toBe(
      path.resolve(DEFAULT_GOOGLE_WORKSPACE_LOCAL_AUTH_PATH),
    );
  });

  it('honors E2E_REAL_AUTH_STORAGE_STATE for capture path', () => {
    process.env.E2E_REAL_AUTH_STORAGE_STATE = 'tmp/playwright/auth/custom-google.json';
    expect(resolveGoogleWorkspaceAuthStoragePath()).toBe(
      path.resolve('tmp/playwright/auth/custom-google.json'),
    );
  });

  it('strips trailing slashes from base URL', () => {
    process.env.E2E_REAL_AUTH_BASE_URL = 'https://preview.equipqr.app/';
    expect(resolveRealAuthBaseUrl()).toBe('https://preview.equipqr.app');
  });

  it('builds production QuickBooks invoice URLs', () => {
    expect(getProductionQuickBooksInvoiceUrl('12345')).toBe(
      'https://app.qbo.intuit.com/app/invoice?txnId=12345',
    );
  });

  it('builds sandbox QuickBooks invoice URLs', () => {
    expect(getQuickBooksInvoiceUrl('12345', 'sandbox')).toBe(
      'https://app.sandbox.qbo.intuit.com/app/invoice?txnId=12345',
    );
  });

  it('defaults preview real-auth export to sandbox unless production drafts are opted in', () => {
    delete process.env.E2E_ALLOW_QBO_DRAFTS;
    delete process.env.E2E_ALLOW_QBO_PRODUCTION_DRAFTS;
    expect(resolveExpectedQboEnvironment()).toBe('sandbox');

    process.env.E2E_ALLOW_QBO_DRAFTS = 'true';
    expect(resolveExpectedQboEnvironment()).toBe('sandbox');

    process.env.E2E_ALLOW_QBO_PRODUCTION_DRAFTS = 'true';
    expect(resolveExpectedQboEnvironment()).toBe('production');
  });

  it('builds Vercel protection bypass headers when the secret is present', () => {
    process.env.VERCEL_AUTOMATION_BYPASS_SECRET = 'bypass-secret';

    expect(resolveVercelAutomationBypassHeaders()).toEqual({
      'x-vercel-protection-bypass': 'bypass-secret',
      'x-vercel-set-bypass-cookie': 'true',
    });
  });

  it('omits Vercel protection bypass headers when the secret is absent', () => {
    delete process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

    expect(resolveVercelAutomationBypassHeaders()).toBeUndefined();
  });

  it('resolves optional Google Docs work order id', () => {
    delete process.env.E2E_GOOGLE_DOCS_WORK_ORDER_ID;
    expect(resolveGoogleDocsWorkOrderId()).toBeNull();

    process.env.E2E_GOOGLE_DOCS_WORK_ORDER_ID = 'a00e8400-e29b-41d4-a716-446655440004';
    expect(resolveGoogleDocsWorkOrderId()).toBe('a00e8400-e29b-41d4-a716-446655440004');
  });

  it('requires all export prerequisites', () => {
    delete process.env.E2E_REAL_AUTH_STORAGE_STATE;
    delete process.env.E2E_QBO_WORK_ORDER_ID;
    delete process.env.E2E_ALLOW_QBO_DRAFTS;
    delete process.env.E2E_ALLOW_QBO_PRODUCTION_DRAFTS;
    expect(hasRealAuthExportPrerequisites()).toBe(false);
    expect(isQboDraftExportAllowed()).toBe(false);
    expect(isQboProductionDraftsAllowed()).toBe(false);
  });
});
