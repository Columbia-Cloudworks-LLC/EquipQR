import { afterEach, describe, expect, it, vi } from 'vitest';
import { landingVideo } from '@/lib/landingVideo';
import { resolvePublicSupabaseOrigin } from '@/lib/publicSupabaseOrigin';

function expectedVideoUrl(filename: string, configuredUrl?: string): string {
  const origin = resolvePublicSupabaseOrigin(
    configuredUrl ?? import.meta.env.VITE_SUPABASE_URL,
  );
  return `${origin}/storage/v1/object/public/landing-page-videos/${filename}`;
}

describe('landingVideo', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('pins demo videos to the public landing-page-videos bucket', () => {
    expect(landingVideo('mobile_create_pm.mp4')).toBe(
      expectedVideoUrl('mobile_create_pm.mp4'),
    );
  });

  it('handles webm filenames', () => {
    expect(landingVideo('demo.webm')).toBe(expectedVideoUrl('demo.webm'));
  });

  it('handles filenames with subdirectories', () => {
    expect(landingVideo('mobile/create-pm.mp4')).toBe(
      expectedVideoUrl('mobile/create-pm.mp4'),
    );
  });

  it('handles poster JPEG filenames alongside video files', () => {
    expect(landingVideo('mobile_export_to_quickbooks.jpg')).toBe(
      expectedVideoUrl('mobile_export_to_quickbooks.jpg'),
    );
  });

  it('strips a leading slash on the filename', () => {
    expect(landingVideo('/demo.mp4')).toBe(expectedVideoUrl('demo.mp4'));
  });

  it('throws for parent-directory segments', () => {
    expect(() => landingVideo('../demo.mp4')).toThrow(/\.\./);
  });

  it('throws for pr-evidence paths', () => {
    expect(() => landingVideo('pr-evidence/branch/demo.mp4')).toThrow(/pr-evidence/);
  });

  it('keeps production videos when VITE_SUPABASE_URL is the local stack', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:54321');
    expect(landingVideo('demo.mp4')).toBe(
      expectedVideoUrl('demo.mp4', 'http://127.0.0.1:54321'),
    );
  });

  it('uses VITE_SUPABASE_URL when it is already the production host', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://supabase.equipqr.app/');
    expect(landingVideo('demo.mp4')).toBe(
      expectedVideoUrl('demo.mp4', 'https://supabase.equipqr.app/'),
    );
  });

  it('ignores lookalike hosts and extra path segments on VITE_SUPABASE_URL', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://supabase.equipqr.app.evil.com/storage/v1');
    expect(landingVideo('demo.mp4')).toBe(
      expectedVideoUrl('demo.mp4', 'https://supabase.equipqr.app.evil.com/storage/v1'),
    );
  });
});
