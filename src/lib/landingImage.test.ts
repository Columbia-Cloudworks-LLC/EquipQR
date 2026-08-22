import { describe, expect, it } from 'vitest';
import { landingImage } from './landingImage';

describe('landingImage', () => {
  it('returns a same-origin path under /images/landing/', () => {
    expect(landingImage('work-orders-list-2026-04.png')).toBe(
      '/images/landing/work-orders-list-2026-04.png',
    );
  });

  it('resolves collage strip keys', () => {
    expect(landingImage('homepage-collage/col-0.webp')).toBe(
      '/images/landing/homepage-collage/col-0.webp',
    );
  });

  it('strips a leading slash before resolving', () => {
    expect(landingImage('/homepage-collage/col-0.webp')).toBe(
      '/images/landing/homepage-collage/col-0.webp',
    );
  });

  it('normalizes backslashes', () => {
    expect(landingImage('homepage-collage\\col-0.webp')).toBe(
      '/images/landing/homepage-collage/col-0.webp',
    );
  });

  it('throws for an unknown key', () => {
    expect(() => landingImage('hero.png')).toThrow(/unknown/i);
  });

  it('throws for pr-evidence paths', () => {
    expect(() => landingImage('pr-evidence/branch/shot.png')).toThrow(/pr-evidence/);
  });

  it('throws for parent-directory segments', () => {
    expect(() => landingImage('../work-orders-list-2026-04.png')).toThrow(/\.\./);
  });
});
