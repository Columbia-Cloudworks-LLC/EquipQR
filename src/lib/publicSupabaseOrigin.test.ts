import { describe, expect, it } from 'vitest';
import { resolvePublicSupabaseOrigin } from '@/lib/publicSupabaseOrigin';

const PUBLIC_ORIGIN = 'https://supabase.equipqr.app';

describe('resolvePublicSupabaseOrigin', () => {
  it('uses VITE_SUPABASE_URL when it is already the production origin', () => {
    expect(resolvePublicSupabaseOrigin('https://supabase.equipqr.app/')).toBe(PUBLIC_ORIGIN);
  });

  it('pins local Force-reset stacks to the production origin', () => {
    expect(resolvePublicSupabaseOrigin('http://127.0.0.1:54321')).toBe(PUBLIC_ORIGIN);
    expect(resolvePublicSupabaseOrigin('http://localhost:54321')).toBe(PUBLIC_ORIGIN);
  });

  it('ignores lookalike hosts and extra path segments', () => {
    expect(
      resolvePublicSupabaseOrigin('https://supabase.equipqr.app.evil.com/storage/v1'),
    ).toBe(PUBLIC_ORIGIN);
  });

  it('falls back when the env is missing or not a URL', () => {
    expect(resolvePublicSupabaseOrigin(undefined)).toBe(PUBLIC_ORIGIN);
    expect(resolvePublicSupabaseOrigin('')).toBe(PUBLIC_ORIGIN);
    expect(resolvePublicSupabaseOrigin('not-a-url')).toBe(PUBLIC_ORIGIN);
  });
});
