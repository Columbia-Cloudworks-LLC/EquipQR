import { describe, expect, it } from 'vitest';
import { HERO_SLIDES } from './heroSlides';

describe('HERO_SLIDES', () => {
  it('registers fleet observability and scan one machine as independent stories', () => {
    expect(HERO_SLIDES.map((slide) => slide.id)).toEqual([
      'fleet-observability',
      'scan-machine',
    ]);
  });

  it('gives every story a label, description, preload, stage, still, and fallback', () => {
    for (const slide of HERO_SLIDES) {
      expect(slide.label.length).toBeGreaterThan(3);
      expect(slide.description.length).toBeGreaterThan(20);
      expect(slide.preload).toEqual(expect.any(Function));
      expect(slide.Stage).toBeTruthy();
      expect(slide.StaticFrame).toBeTypeOf('function');
      expect(slide.Fallback).toBeTypeOf('function');
    }
  });
});
