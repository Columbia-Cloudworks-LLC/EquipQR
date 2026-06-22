/**
 * Resolve an organization id for tenant-scoped reads/writes only when it is
 * present in the caller's allowed organization set (session or hydrated list).
 */

export function resolveValidatedOrganizationId(options: {
  currentOrganizationId?: string | null;
  sessionOrganizationId?: string | null;
  persistedOrganizationId?: string | null;
  allowedOrganizationIds: readonly string[];
}): string | undefined {
  const allowed = new Set(options.allowedOrganizationIds.filter(Boolean));
  if (allowed.size === 0) {
    return undefined;
  }

  const candidate =
    options.currentOrganizationId ??
    options.sessionOrganizationId ??
    options.persistedOrganizationId ??
    undefined;

  return candidate && allowed.has(candidate) ? candidate : undefined;
}

export function mergeAllowedOrganizationIds(
  ...lists: ReadonlyArray<readonly string[]>
): string[] {
  const merged = new Set<string>();
  for (const list of lists) {
    for (const id of list) {
      if (id) merged.add(id);
    }
  }
  return [...merged];
}
