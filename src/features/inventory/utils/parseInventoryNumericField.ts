export type InventoryNumericField = 'low_stock_threshold' | 'default_unit_cost';

export type InventoryNumericParseResult =
  | { ok: true; formData: { low_stock_threshold: number } | { default_unit_cost: number | null } }
  | { ok: false; error: string };

/** Keeps values well inside Postgres numeric/int ranges and sane for stock data. */
const MAX_INVENTORY_NUMERIC_VALUE = 1_000_000_000;

/**
 * Parse and validate inline-edited numeric inventory fields (#1165).
 * Inputs are validated lexically (plain decimal digits only — no exponent,
 * hex, or sign syntax that Number() would otherwise coerce).
 * - Low stock threshold: required non-negative integer.
 * - Default unit cost: non-negative decimal rounded to cents; empty clears it.
 */
export function parseInventoryNumericField(
  field: InventoryNumericField,
  rawValue: string,
): InventoryNumericParseResult {
  const trimmed = rawValue.trim();

  if (field === 'low_stock_threshold') {
    if (!/^\d+$/.test(trimmed)) {
      return { ok: false, error: 'Low stock threshold must be a whole number of 0 or more.' };
    }
    const parsed = Number.parseInt(trimmed, 10);
    if (parsed > MAX_INVENTORY_NUMERIC_VALUE) {
      return { ok: false, error: 'Low stock threshold is too large.' };
    }
    return { ok: true, formData: { low_stock_threshold: parsed } };
  }

  if (!trimmed) {
    return { ok: true, formData: { default_unit_cost: null } };
  }

  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    return { ok: false, error: 'Default unit cost must be a number of 0 or more.' };
  }
  const parsedCost = Number.parseFloat(trimmed);
  if (parsedCost > MAX_INVENTORY_NUMERIC_VALUE) {
    return { ok: false, error: 'Default unit cost is too large.' };
  }
  return { ok: true, formData: { default_unit_cost: Math.round(parsedCost * 100) / 100 } };
}
