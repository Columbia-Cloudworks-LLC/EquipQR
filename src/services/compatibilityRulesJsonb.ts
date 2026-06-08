export type CompatibilityRuleJsonbInput = {
  manufacturer: string;
  model?: string | null;
  match_type?: string;
  status?: string;
  notes?: string | null;
};

export function filterValidCompatibilityRules<T extends { manufacturer: string }>(
  rules: T[],
): T[] {
  return rules.filter((rule) => rule.manufacturer.trim().length > 0);
}

export function mapCompatibilityRulesToJsonb<T extends CompatibilityRuleJsonbInput>(
  rules: T[],
): Array<{
  manufacturer: string;
  model: string | null;
  match_type?: string;
  status?: string;
  notes?: string | null;
}> {
  return rules.map((rule) => ({
    manufacturer: rule.manufacturer.trim(),
    model: rule.model?.trim() || null,
    ...(rule.match_type !== undefined ? { match_type: rule.match_type } : {}),
    ...(rule.status !== undefined ? { status: rule.status } : {}),
    ...(rule.notes !== undefined ? { notes: rule.notes } : {}),
  }));
}

export function throwOnCompatibilityRuleDuplicate(
  error: { code?: string } | null,
  message: string,
): void {
  if (error?.code === '23505') {
    throw new Error(message);
  }
}
