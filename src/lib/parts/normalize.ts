const NON_ALNUM = /[\s_-]+/g;

export function normalizePartNumber(value: string): string {
  const lower = value.toLowerCase().trim();
  const stripped = lower.replace(NON_ALNUM, '');
  // collapse leading zeros but preserve all-zero case
  const collapsed = stripped.replace(/^0+(?!$)/, '');
  return collapsed;
}

export function tokenizePartNumber(value: string): string[] {
  const lower = value.toLowerCase();
  const parts = lower.split(/[^a-z0-9]+/g).filter(Boolean);
  const tokens = new Set<string>();
  for (const p of parts) {
    tokens.add(p);
    tokens.add(normalizePartNumber(p));
  }
  const joined = normalizePartNumber(value);
  if (joined) tokens.add(joined);
  return Array.from(tokens);
}

export function canonicalizeBrand(value: string): string {
  const trimmed = value.trim();
  return trimmed.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
}
