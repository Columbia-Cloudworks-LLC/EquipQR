import { describe, it, expect } from 'vitest';
import {
  parseDemoGifArgs,
  normalizeBaseUrl,
  validateOutPath,
  resolveSmokeWebmRelativePath,
  resolveScenarioWebmRelativePath,
  isLocalhostBaseUrl
} from '../../../scripts/lib/demoGifArgs.mjs';

describe('parseDemoGifArgs', () => {
  it('enables videoOnly when --smoke is set', () => {
    const parsed = parseDemoGifArgs(['--smoke']);
    expect(parsed.smoke).toBe(true);
    expect(parsed.videoOnly).toBe(true);
  });

  it('parses --base-url and strips trailing slashes', () => {
    const parsed = parseDemoGifArgs(['--smoke', '--base-url=https://equipqr.app/']);
    expect(parsed.baseUrl).toBe('https://equipqr.app');
  });

  it('parses --out under tmp/demos when basename only', () => {
    const parsed = parseDemoGifArgs(['--smoke', '--out=my-run.webm']);
    expect(parsed.out).toBe('my-run.webm');
    expect(resolveSmokeWebmRelativePath({ out: parsed.out })).toBe('tmp/demos/my-run.webm');
  });

  it('rejects smoke plus scenario name', () => {
    expect(() => parseDemoGifArgs(['--smoke', 'Some Scenario'])).toThrow(/not both/);
  });

  it('parses persona override', () => {
    const parsed = parseDemoGifArgs(['--smoke', '--persona=Pat Owner']);
    expect(parsed.persona).toBe('Pat Owner');
  });
});

describe('normalizeBaseUrl', () => {
  it('trims and removes trailing slash', () => {
    expect(normalizeBaseUrl('  http://localhost:8080/  ')).toBe('http://localhost:8080');
  });
});

describe('validateOutPath', () => {
  it('rejects traversal', () => {
    expect(() => validateOutPath('tmp/demos/../../../secret.webm')).toThrow(/\.\./);
  });

  it('requires .webm suffix', () => {
    expect(() => validateOutPath('tmp/demos/foo.mp4')).toThrow(/\.webm/);
  });
});

describe('resolveSmokeWebmRelativePath', () => {
  it('uses default basename when out is null', () => {
    expect(resolveSmokeWebmRelativePath({ out: null })).toBe('tmp/demos/demo-smoke.webm');
  });

  it('preserves tmp/ path when fully qualified under tmp', () => {
    expect(resolveSmokeWebmRelativePath({ out: 'tmp/demos/custom.webm' })).toBe('tmp/demos/custom.webm');
  });
});

describe('resolveScenarioWebmRelativePath', () => {
  it('sanitizes slashes in scenario name', () => {
    expect(resolveScenarioWebmRelativePath('a/b')).toBe('tmp/demos/a_b.webm');
  });
});

describe('isLocalhostBaseUrl', () => {
  it('detects localhost', () => {
    expect(isLocalhostBaseUrl('http://localhost:8080')).toBe(true);
    expect(isLocalhostBaseUrl('http://127.0.0.1:3000')).toBe(true);
    expect(isLocalhostBaseUrl('https://equipqr.app')).toBe(false);
  });
});
