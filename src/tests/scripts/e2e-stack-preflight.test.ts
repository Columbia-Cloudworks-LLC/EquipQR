import { describe, it, expect } from 'vitest';
import {
  evaluateLocalStack,
  isProbeHttpSuccess,
  probeHttpOk,
} from '../../../scripts/lib/e2e-stack-preflight.mjs';

describe('e2e-stack-preflight', () => {
  it('isProbeHttpSuccess treats listening HTTP statuses as ready', () => {
    expect(isProbeHttpSuccess(200)).toBe(true);
    expect(isProbeHttpSuccess(304)).toBe(true);
    expect(isProbeHttpSuccess(401)).toBe(true);
    expect(isProbeHttpSuccess(502)).toBe(false);
  });

  it('probeHttpOk returns false for unreachable hosts', async () => {
    const ok = await probeHttpOk('http://127.0.0.1:1', 500);
    expect(ok).toBe(false);
  });

  it('evaluateLocalStack returns booleans', async () => {
    const result = await evaluateLocalStack({
      appUrl: 'http://127.0.0.1:1',
      supabaseUrl: 'http://127.0.0.1:2/rest/v1/',
    });
    expect(result).toEqual({ appReady: false, supabaseReady: false });
  });
});
