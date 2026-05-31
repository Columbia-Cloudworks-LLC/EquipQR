import { describe, it, expect, afterEach, vi } from 'vitest';
import { landingVideo } from './landingVideo';

const CUSTOM_SUPABASE_URL = 'https://custom-supabase.example.test';
const DIRECT_SUPABASE_URL = 'https://abcdefghijklmnopqrst.supabase.co';

describe('landingVideo', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('builds a URL using VITE_SUPABASE_URL and the landing-page-videos bucket path', () => {
    vi.stubEnv('VITE_SUPABASE_URL', CUSTOM_SUPABASE_URL);

    expect(landingVideo('mobile_create_pm.mp4')).toBe(
      `${CUSTOM_SUPABASE_URL}/storage/v1/object/public/landing-page-videos/mobile_create_pm.mp4`
    );
  });

  it('uses the direct *.supabase.co URL when VITE_SUPABASE_URL points there', () => {
    vi.stubEnv('VITE_SUPABASE_URL', DIRECT_SUPABASE_URL);

    expect(landingVideo('demo.webm')).toBe(
      `${DIRECT_SUPABASE_URL}/storage/v1/object/public/landing-page-videos/demo.webm`
    );
  });

  it('handles filenames with subdirectories', () => {
    vi.stubEnv('VITE_SUPABASE_URL', CUSTOM_SUPABASE_URL);

    expect(landingVideo('mobile/create-pm.mp4')).toBe(
      `${CUSTOM_SUPABASE_URL}/storage/v1/object/public/landing-page-videos/mobile/create-pm.mp4`
    );
  });

  it('handles poster JPEG filenames alongside video files', () => {
    vi.stubEnv('VITE_SUPABASE_URL', CUSTOM_SUPABASE_URL);

    expect(landingVideo('mobile_export_to_quickbooks.jpg')).toBe(
      `${CUSTOM_SUPABASE_URL}/storage/v1/object/public/landing-page-videos/mobile_export_to_quickbooks.jpg`
    );
  });

  it('throws a descriptive error when VITE_SUPABASE_URL is missing', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');

    expect(() => landingVideo('demo.mp4')).toThrowError(/VITE_SUPABASE_URL/);
  });

  it('throws when VITE_SUPABASE_URL is whitespace only', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '   ');

    expect(() => landingVideo('demo.mp4')).toThrowError(/VITE_SUPABASE_URL/);
  });

  it('strips a trailing slash on the base URL so the result has exactly one separator', () => {
    vi.stubEnv('VITE_SUPABASE_URL', `${CUSTOM_SUPABASE_URL}/`);

    expect(landingVideo('demo.mp4')).toBe(
      `${CUSTOM_SUPABASE_URL}/storage/v1/object/public/landing-page-videos/demo.mp4`
    );
  });

  it('strips multiple trailing slashes on the base URL', () => {
    vi.stubEnv('VITE_SUPABASE_URL', `${CUSTOM_SUPABASE_URL}///`);

    expect(landingVideo('demo.mp4')).toBe(
      `${CUSTOM_SUPABASE_URL}/storage/v1/object/public/landing-page-videos/demo.mp4`
    );
  });

  it('strips a leading slash on the filename', () => {
    vi.stubEnv('VITE_SUPABASE_URL', CUSTOM_SUPABASE_URL);

    expect(landingVideo('/demo.mp4')).toBe(
      `${CUSTOM_SUPABASE_URL}/storage/v1/object/public/landing-page-videos/demo.mp4`
    );
  });
});
