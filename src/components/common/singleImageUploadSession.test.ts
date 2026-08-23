import { describe, expect, it } from 'vitest';
import {
  formatAcceptedTypesLabel,
  resolveImageUploadSession,
  sessionImageSrc,
  validateImageFile,
} from '@/components/common/singleImageUploadSession';

const jpeg = (name = 'photo.jpg', size = 100) =>
  new File([new Uint8Array(size)], name, { type: 'image/jpeg' });

describe('singleImageUploadSession', () => {
  it('formats accepted MIME types as an uppercase list', () => {
    expect(formatAcceptedTypesLabel(['image/jpeg', 'image/png'])).toBe('JPEG, PNG');
  });

  it('prefers a pending file over the current image', () => {
    const file = jpeg();
    expect(
      resolveImageUploadSession('https://cdn.example/current.jpg', false, file, 'blob:preview'),
    ).toEqual({ kind: 'pending', file, src: 'blob:preview' });
  });

  it('treats a current URL as current until the image fails to load', () => {
    expect(resolveImageUploadSession('https://cdn.example/current.jpg', false, null, null)).toEqual({
      kind: 'current',
      src: 'https://cdn.example/current.jpg',
    });
    expect(resolveImageUploadSession('https://cdn.example/current.jpg', true, null, null)).toEqual({
      kind: 'empty',
    });
  });

  it('rejects unsupported types and oversized files with the live toast copy', () => {
    const types = ['image/jpeg', 'image/png'];
    expect(validateImageFile(new File(['x'], 'notes.pdf', { type: 'application/pdf' }), types, 5)).toEqual({
      ok: false,
      description: 'Unsupported format: notes.pdf. Use JPEG, PNG.',
    });
    expect(validateImageFile(jpeg('photo.jpg', 6 * 1024 * 1024), types, 5)).toEqual({
      ok: false,
      description: 'File too large: photo.jpg. Maximum size is 5 MB.',
    });
    expect(validateImageFile(jpeg(), types, 5)).toEqual({ ok: true });
  });

  it('returns a display src for current and pending sessions only', () => {
    const file = jpeg();
    expect(sessionImageSrc({ kind: 'empty' })).toBeNull();
    expect(sessionImageSrc({ kind: 'current', src: 'https://cdn.example/a.png' })).toBe(
      'https://cdn.example/a.png',
    );
    expect(sessionImageSrc({ kind: 'pending', file, src: 'blob:preview' })).toBe('blob:preview');
  });
});
