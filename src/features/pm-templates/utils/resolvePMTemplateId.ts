/**
 * Resolves the PM checklist template for work-order / QR creation.
 * v1 hierarchy: explicit override, then equipment default template.
 */
export function resolvePMTemplateId(input: {
  explicitTemplateId?: string | null;
  equipmentDefaultTemplateId?: string | null;
}): string | null {
  const explicit =
    typeof input.explicitTemplateId === 'string' ? input.explicitTemplateId.trim() : '';
  if (explicit.length > 0) {
    return explicit;
  }
  return input.equipmentDefaultTemplateId ?? null;
}
