/** Case-insensitive trimmed matching aligned with database lower(trim(value)). */
export function normalizeCompatibilityRuleValue(value: string): string {
  return value.trim().toLowerCase();
}
