/**
 * Merged bulk-edit cell value: dirty delta wins over the original row value.
 */
export function getBulkDisplayValue<T extends { id: string }, K extends keyof T>(
  row: T,
  field: K,
  dirtyRows: Map<string, Partial<T>>
): T[K] {
  const delta = dirtyRows.get(row.id);
  if (delta && field in delta) {
    return delta[field] as T[K];
  }
  return row[field];
}
