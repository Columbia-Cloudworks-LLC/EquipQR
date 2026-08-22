import { describe, expect, it } from 'vitest';
import { landingVideo } from './landingVideo';

const PRODUCTION_VIDEO_ORIGIN =
  'https://supabase.equipqr.app/storage/v1/object/public/landing-page-videos';

describe('landingVideo', () => {
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
});
