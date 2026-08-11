import { describe, it, expect } from 'vitest';
import {
  evaluateLocalStack,
  isProbeHttpAppReady,
  isProbeHttpListening,
  isProbeHttpSuccess,
  probeHttpListening,
  probeHttpOk,
} from './e2e-stack-preflight.mjs';

describe('e2e-stack-preflight', () => {
  it('isProbeHttpListening treats sub-500 HTTP statuses as listening', () => {
    expect(isProbeHttpListening(200)).toBe(true);
    expect(isProbeHttpListening(304)).toBe(true);
    expect(isProbeHttpListening(401)).toBe(true);
    expect(isProbeHttpListening(404)).toBe(true);
    expect(isProbeHttpListening(502)).toBe(false);
  });

  it('isProbeHttpSuccess aliases isProbeHttpListening', () => {
    expect(isProbeHttpSuccess(401)).toBe(true);
    expect(isProbeHttpSuccess(404)).toBe(true);
  });

  it('isProbeHttpAppReady accepts 2xx and 304 but rejects 4xx', () => {
    expect(isProbeHttpAppReady(200)).toBe(true);
    expect(isProbeHttpAppReady(304)).toBe(true);
    expect(isProbeHttpAppReady(401)).toBe(false);
    expect(isProbeHttpAppReady(404)).toBe(false);
    expect(isProbeHttpAppReady(502)).toBe(false);
  });

  it('probeHttpOk returns false for unreachable hosts', async () => {
    const ok = await probeHttpOk('http://127.0.0.1:1', 500);
    expect(ok).toBe(false);
  });

  it('probeHttpListening returns false for unreachable hosts', async () => {
    const ok = await probeHttpListening('http://127.0.0.1:1', 500);
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
