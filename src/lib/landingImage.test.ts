import { describe, it, expect, afterEach, vi } from 'vitest';
import { landingImage } from './landingImage';

describe('landingImage', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('builds a URL using VITE_SUPABASE_URL and the landing-page-images bucket path', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://supabase.equipqr.app');

    expect(landingImage('work-orders-list.png')).toBe(
      'https://supabase.equipqr.app/storage/v1/object/public/landing-page-images/work-orders-list.png'
    );
  });

  it('uses the direct *.supabase.co URL when VITE_SUPABASE_URL points there', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://abcdefghijklmnopqrst.supabase.co');

    expect(landingImage('hero.png')).toBe(
      'https://abcdefghijklmnopqrst.supabase.co/storage/v1/object/public/landing-page-images/hero.png'
    );
  });

  it('handles filenames with subdirectories', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://supabase.equipqr.app');

    expect(landingImage('subfolder/image.png')).toBe(
      'https://supabase.equipqr.app/storage/v1/object/public/landing-page-images/subfolder/image.png'
    );
  });

  it('handles filenames with hyphens and underscores', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://supabase.equipqr.app');

    expect(landingImage('mobile-work-order-PM-checklist-input.png')).toBe(
      'https://supabase.equipqr.app/storage/v1/object/public/landing-page-images/mobile-work-order-PM-checklist-input.png'
    );
  });
});
