import { afterEach, describe, expect, it, vi } from 'vitest';
import { landingVideo } from './landingVideo';

const PRODUCTION_VIDEO_ORIGIN =
  'https://supabase.equipqr.app/storage/v1/object/public/landing-page-videos';

describe('landingVideo', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('pins demo videos to the production landing-page-videos bucket', () => {
    expect(landingVideo('mobile_create_pm.mp4')).toBe(
      `${PRODUCTION_VIDEO_ORIGIN}/mobile_create_pm.mp4`,
    );
  });

  it('handles webm filenames', () => {
    expect(landingVideo('demo.webm')).toBe(`${PRODUCTION_VIDEO_ORIGIN}/demo.webm`);
  });

  it('handles filenames with subdirectories', () => {
    expect(landingVideo('mobile/create-pm.mp4')).toBe(
      `${PRODUCTION_VIDEO_ORIGIN}/mobile/create-pm.mp4`,
    );
  });

  it('handles poster JPEG filenames alongside video files', () => {
    expect(landingVideo('mobile_export_to_quickbooks.jpg')).toBe(
      `${PRODUCTION_VIDEO_ORIGIN}/mobile_export_to_quickbooks.jpg`,
    );
  });

  it('strips a leading slash on the filename', () => {
    expect(landingVideo('/demo.mp4')).toBe(`${PRODUCTION_VIDEO_ORIGIN}/demo.mp4`);
  });

  it('throws for parent-directory segments', () => {
    expect(() => landingVideo('../demo.mp4')).toThrow(/\.\./);
  });

  it('throws for pr-evidence paths', () => {
    expect(() => landingVideo('pr-evidence/branch/demo.mp4')).toThrow(/pr-evidence/);
  });

  it('keeps production videos when VITE_SUPABASE_URL is the local stack', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:54321');
    expect(landingVideo('demo.mp4')).toBe(`${PRODUCTION_VIDEO_ORIGIN}/demo.mp4`);
  });

  it('uses VITE_SUPABASE_URL when it is already the production host', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://supabase.equipqr.app/');
    expect(landingVideo('demo.mp4')).toBe(`${PRODUCTION_VIDEO_ORIGIN}/demo.mp4`);
  });
});
