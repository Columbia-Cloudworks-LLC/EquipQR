import type { AlternatePartResult } from '@/features/inventory/types/inventory';

export function groupAlternatePartsByGroupId(
  alternates: AlternatePartResult[],
): Array<[string, AlternatePartResult[]]> {
  const groups = new Map<string, AlternatePartResult[]>();
  for (const alt of alternates) {
    const existing = groups.get(alt.group_id) ?? [];
    existing.push(alt);
    groups.set(alt.group_id, existing);
  }
  return Array.from(groups.entries());
}
