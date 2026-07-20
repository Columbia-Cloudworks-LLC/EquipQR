import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createQueryClientWrapper } from '@vitest-harness/utils/query-client-wrapper';

const resolveImageDisplayUrl = vi.fn();

vi.mock('@/services/imageUploadService', async () => {
  const actual = await vi.importActual<typeof import('@/services/imageUploadService')>(
    '@/services/imageUploadService',
  );
  return {
    ...actual,
    resolveImageDisplayUrl: (...args: unknown[]) => resolveImageDisplayUrl(...args),
  };
});

import { useResolvedAvatarUrl } from './useResolvedAvatarUrl';

describe('useResolvedAvatarUrl', () => {
  beforeEach(() => {
    resolveImageDisplayUrl.mockReset();
    resolveImageDisplayUrl.mockResolvedValue('https://signed.example/avatar.webp');
  });

  it('returns external Google CDN URLs without signing', () => {
    const { result } = renderHook(
      () => useResolvedAvatarUrl('https://lh3.googleusercontent.com/a/photo'),
      { wrapper: createQueryClientWrapper() },
    );

    expect(result.current.data).toBe('https://lh3.googleusercontent.com/a/photo');
    expect(resolveImageDisplayUrl).not.toHaveBeenCalled();
  });

  it('signs bare storage paths', async () => {
    const { result } = renderHook(() => useResolvedAvatarUrl('user-1/avatar.webp'), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toBe('https://signed.example/avatar.webp');
    });
    expect(resolveImageDisplayUrl).toHaveBeenCalledWith('user-avatars', 'user-1/avatar.webp');
  });

  it('normalizes legacy Supabase user-avatars URLs before signing', async () => {
    const legacy =
      'https://example.supabase.co/storage/v1/object/public/user-avatars/user-1/avatar.webp';
    const { result } = renderHook(() => useResolvedAvatarUrl(legacy), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toBe('https://signed.example/avatar.webp');
    });
    expect(resolveImageDisplayUrl).toHaveBeenCalledWith('user-avatars', 'user-1/avatar.webp');
  });

  it('normalizes relative /object/sign user-avatars URLs before signing', async () => {
    const relative = '/object/sign/user-avatars/user-1/avatar.webp?token=abc';
    const { result } = renderHook(() => useResolvedAvatarUrl(relative), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toBe('https://signed.example/avatar.webp');
    });
    expect(resolveImageDisplayUrl).toHaveBeenCalledWith('user-avatars', 'user-1/avatar.webp');
  });
});
