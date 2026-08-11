import { trimmedAvatarPath } from '@/utils/userDisplayInitials';

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

/**
 * Read a Google (or other OAuth) profile photo from Auth `user_metadata`.
 * Supabase commonly maps Google `picture` to `avatar_url`; accept either when it is an absolute URL.
 */
export function googleAvatarUrlFromMetadata(
  metadata?: Record<string, unknown> | null,
): string | null {
  if (!metadata) return null;

  for (const key of ['avatar_url', 'picture'] as const) {
    const raw = metadata[key];
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    if (trimmed.length > 0 && isHttpUrl(trimmed)) {
      return trimmed;
    }
  }

  return null;
}

/**
 * Precedence for the current user's display avatar:
 * 1. EquipQR `profiles.avatar_url` (storage path or legacy absolute URL)
 * 2. Google / Auth metadata photo
 * 3. null → initials / generic fallback in UI
 */
export function resolveEffectiveAvatarUrl(
  profileAvatarUrl?: string | null,
  authMetadata?: Record<string, unknown> | null,
): string | null {
  const profile = trimmedAvatarPath(profileAvatarUrl);
  if (profile.length > 0) {
    return profile;
  }

  return googleAvatarUrlFromMetadata(authMetadata);
}
