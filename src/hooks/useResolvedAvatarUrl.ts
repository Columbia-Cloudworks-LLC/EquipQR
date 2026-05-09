import { useQuery } from '@tanstack/react-query';
import {
  DEFAULT_SIGNED_URL_TTL_SECONDS,
  resolveImageDisplayUrl,
} from '@/services/imageUploadService';

/** Refresh before default TTL so cached signed URLs do not expire mid-session. */
const AVATAR_SIGNED_URL_REFRESH_MS = Math.max(60_000, (DEFAULT_SIGNED_URL_TTL_SECONDS - 120) * 1000);

/**
 * Resolve a canonical `user-avatars` storage path to a short-lived signed URL,
 * refreshing before the default ~900s TTL so long sessions keep avatars working.
 * Absolute http(s) references are returned as-is (legacy rows).
 */
export function useResolvedAvatarUrl(stored: string | null | undefined) {
  const trimmed = stored?.trim() ?? '';
  const isRemoteHttp = /^https?:\/\//i.test(trimmed);
  const enabled = trimmed.length > 0 && !isRemoteHttp;

  const query = useQuery({
    queryKey: ['resolved-avatar-url', trimmed],
    queryFn: () => resolveImageDisplayUrl('user-avatars', trimmed),
    enabled,
    staleTime: AVATAR_SIGNED_URL_REFRESH_MS,
    gcTime: AVATAR_SIGNED_URL_REFRESH_MS * 2,
    refetchInterval: AVATAR_SIGNED_URL_REFRESH_MS,
  });

  const displayUrl =
    trimmed === '' ? null : isRemoteHttp ? trimmed : query.data ?? null;

  return { ...query, data: displayUrl };
}
