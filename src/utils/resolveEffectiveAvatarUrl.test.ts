import { describe, expect, it } from 'vitest';
import {
  googleAvatarUrlFromMetadata,
  resolveEffectiveAvatarUrl,
} from './resolveEffectiveAvatarUrl';

describe('googleAvatarUrlFromMetadata', () => {
  it('prefers avatar_url over picture when both are http(s)', () => {
    expect(
      googleAvatarUrlFromMetadata({
        avatar_url: 'https://lh3.googleusercontent.com/a/avatar',
        picture: 'https://lh3.googleusercontent.com/a/other',
      }),
    ).toBe('https://lh3.googleusercontent.com/a/avatar');
  });

  it('falls back to picture when avatar_url is missing', () => {
    expect(
      googleAvatarUrlFromMetadata({
        picture: 'https://lh3.googleusercontent.com/a/picture',
      }),
    ).toBe('https://lh3.googleusercontent.com/a/picture');
  });

  it('ignores non-http values and empty metadata', () => {
    expect(googleAvatarUrlFromMetadata({ avatar_url: 'user-id/avatar.jpg' })).toBeNull();
    expect(googleAvatarUrlFromMetadata({ picture: '  ' })).toBeNull();
    expect(googleAvatarUrlFromMetadata(null)).toBeNull();
    expect(googleAvatarUrlFromMetadata(undefined)).toBeNull();
  });
});

describe('resolveEffectiveAvatarUrl', () => {
  it('prefers EquipQR profile avatar over Google metadata', () => {
    expect(
      resolveEffectiveAvatarUrl('user-1/avatar.webp', {
        avatar_url: 'https://lh3.googleusercontent.com/a/google',
      }),
    ).toBe('user-1/avatar.webp');
  });

  it('uses Google metadata when profile avatar is unset', () => {
    expect(
      resolveEffectiveAvatarUrl(null, {
        picture: 'https://lh3.googleusercontent.com/a/google',
      }),
    ).toBe('https://lh3.googleusercontent.com/a/google');

    expect(resolveEffectiveAvatarUrl('   ', { avatar_url: 'https://example.com/a.png' })).toBe(
      'https://example.com/a.png',
    );
  });

  it('returns null when neither profile nor Google photo is available', () => {
    expect(resolveEffectiveAvatarUrl(null, {})).toBeNull();
    expect(resolveEffectiveAvatarUrl(undefined, undefined)).toBeNull();
  });
});
