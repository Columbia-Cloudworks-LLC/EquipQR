import { useQuery } from '@tanstack/react-query';
import {
  DEFAULT_SIGNED_URL_TTL_SECONDS,
  normalizeStoredObjectPath,
  resolveImageDisplayUrl,
} from '@/services/imageUploadService';
import { userAvatars } from '@/lib/queryKeys';

/** Refresh before default TTL so cached signed URLs do not expire mid-session. */
const AVATAR_SIGNED_URL_REFRESH_MS = Math.max(60_000, (DEFAULT_SIGNED_URL_TTL_SECONDS - 120) * 1000);

/**
 * Resolve a `user-avatars` storage path (or legacy Supabase URL form) to a
 * short-lived signed URL, refreshing before the default ~900s TTL.
 * External http(s) URLs that are not EquipQR storage refs (e.g. Google photos)
 * are returned as-is.
 */
export function useResolvedAvatarUrl(stored: string | null | undefined) {
  const trimmed = stored?.trim() ?? '';
  const normalizedPath =
    trimmed.length > 0 ? normalizeStoredObjectPath(trimmed, 'user-avatars') : null;
  const isExternalHttp = /^https?:\/\//i.test(trimmed) && normalizedPath == null;
  const resolveKey = normalizedPath ?? trimmed;
  const enabled = resolveKey.length > 0 && !isExternalHttp;

  const query = useQuery({
    queryKey: userAvatars.resolvedUrl(resolveKey),
    queryFn: () => resolveImageDisplayUrl('user-avatars', resolveKey),
    enabled,
    staleTime: AVATAR_SIGNED_URL_REFRESH_MS,
    gcTime: AVATAR_SIGNED_URL_REFRESH_MS * 2,
    refetchInterval: AVATAR_SIGNED_URL_REFRESH_MS,
  });

  const displayUrl =
    trimmed === '' ? null : isExternalHttp ? trimmed : query.data ?? null;

  return { ...query, data: displayUrl };
}
