import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  getProductionQuickBooksInvoiceUrl,
  hasRealAuthExportPrerequisites,
  isQboProductionDraftsAllowed,
  isTruthyEnv,
  resolveRealAuthBaseUrl,
  resolveVercelAutomationBypassHeaders,
} from '../../../e2e/user/shared/real-auth-config';

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

  it('strips trailing slashes from base URL', () => {
    process.env.E2E_REAL_AUTH_BASE_URL = 'https://preview.equipqr.app/';
    expect(resolveRealAuthBaseUrl()).toBe('https://preview.equipqr.app');
  });

  it('builds production QuickBooks invoice URLs', () => {
    expect(getProductionQuickBooksInvoiceUrl('12345')).toBe(
      'https://app.qbo.intuit.com/app/invoice?txnId=12345',
    );
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

  it('requires all export prerequisites', () => {
    delete process.env.E2E_REAL_AUTH_STORAGE_STATE;
    delete process.env.E2E_QBO_WORK_ORDER_ID;
    delete process.env.E2E_ALLOW_QBO_PRODUCTION_DRAFTS;
    expect(hasRealAuthExportPrerequisites()).toBe(false);
    expect(isQboProductionDraftsAllowed()).toBe(false);
  });
});
