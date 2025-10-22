import { describe, it, expect } from 'vitest';
import { normalizePartNumber, tokenizePartNumber, canonicalizeBrand } from '@/lib/parts/normalize';

describe('normalizePartNumber', () => {
  it('lowercases and removes separators', () => {
    expect(normalizePartNumber('Denso 234-9005')).toBe('denso2349005');
  });
  it('collapses leading zeros', () => {
    expect(normalizePartNumber('000123')).toBe('123');
    expect(normalizePartNumber('0000')).toBe('0');
  });
});

describe('tokenizePartNumber', () => {
  it('generates useful tokens', () => {
    const tokens = tokenizePartNumber('Denso 234-9005');
    expect(tokens).toContain('denso');
    expect(tokens).toContain('234');
    expect(tokens).toContain('9005');
    expect(tokens).toContain('2349005');
  });
});

describe('canonicalizeBrand', () => {
  it('title-cases brand', () => {
    expect(canonicalizeBrand('john deere')).toBe('John Deere');
  });
});
