import { describe, expect, it } from 'vitest';
import { HERO_SLIDES } from './heroSlides';

describe('HERO_SLIDES', () => {
  it('registers fleet observability and scan one machine as independent stories', () => {
    expect(HERO_SLIDES.map((slide) => slide.id)).toEqual([
      'fleet-observability',
      'scan-machine',
    ]);
  });
});
