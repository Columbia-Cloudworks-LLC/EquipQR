import { describe, expect, it } from 'vitest';
import { applyHoursDelta } from './hoursDelta';

describe('applyHoursDelta', () => {
  it('adds to the typed value', () => {
    expect(applyHoursDelta('1200', 1000, 8)).toBe('1208');
    expect(applyHoursDelta('1200.5', 1000, 4)).toBe('1204.5');
  });

  it('falls back to the current reading when nothing valid is typed', () => {
    expect(applyHoursDelta('', 1000, 10)).toBe('1010');
    expect(applyHoursDelta('abc', 1000.4, 4)).toBe('1004.4');
  });

  it('starts from zero when there is no current reading', () => {
    expect(applyHoursDelta('', null, 8)).toBe('8');
    expect(applyHoursDelta('', undefined, 8)).toBe('8');
  });

  it('keeps one decimal place without floating point noise', () => {
    expect(applyHoursDelta('0.1', null, 0.2)).toBe('0.3');
  });
});
