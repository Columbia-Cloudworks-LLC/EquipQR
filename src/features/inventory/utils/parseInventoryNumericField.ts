export type InventoryNumericField = 'low_stock_threshold' | 'default_unit_cost';

export type InventoryNumericParseResult =
  | { ok: true; formData: { low_stock_threshold: number } | { default_unit_cost: number | null } }
  | { ok: false; error: string };

/**
 * Parse and validate inline-edited numeric inventory fields (#1165).
 * - Low stock threshold: required non-negative integer.
 * - Default unit cost: non-negative number rounded to cents; empty clears it.
 */
export function parseInventoryNumericField(
  field: InventoryNumericField,
  rawValue: string,
): InventoryNumericParseResult {
  const trimmed = rawValue.trim();

  if (field === 'low_stock_threshold') {
    const parsed = Number(trimmed);
    if (!trimmed || !Number.isInteger(parsed) || parsed < 0) {
      return { ok: false, error: 'Low stock threshold must be a whole number of 0 or more.' };
    }
    return { ok: true, formData: { low_stock_threshold: parsed } };
  }

  if (!trimmed) {
    return { ok: true, formData: { default_unit_cost: null } };
  }

  const parsedCost = Number(trimmed);
  if (!Number.isFinite(parsedCost) || parsedCost < 0) {
    return { ok: false, error: 'Default unit cost must be a number of 0 or more.' };
  }
  return { ok: true, formData: { default_unit_cost: Math.round(parsedCost * 100) / 100 } };
}
