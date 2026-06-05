/** Two-letter initials from a display name; falls back when name is empty. */
export function userDisplayInitials(name?: string | null, fallback = '?'): string {
  if (!name?.trim()) return fallback;
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/** Trimmed avatar storage path or URL; empty string when unset. */
export function trimmedAvatarPath(avatarUrl?: string | null): string {
  return avatarUrl?.trim() ?? '';
}
