/**
 * Shared CSV helpers for Edge Function report exports.
 */

const CSV_FORMULA_PREFIX_PATTERN = /^[\s]*[=+\-@]/;

function neutralizeCsvFormulaPrefix(value: string): string {
  if (CSV_FORMULA_PREFIX_PATTERN.test(value)) {
    return `'${value}`;
  }

  return value;
}

export function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = neutralizeCsvFormulaPrefix(String(value));

  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

export function buildCsvTable<T>(
  rows: T[],
  columns: string[],
  columnMap: Record<string, (item: T) => string>,
  columnLabels?: Record<string, string>,
): string {
  const validColumns = columns.filter((col) => col in columnMap);
  const headers = validColumns.map((col) => columnLabels?.[col] ?? col);
  const lines: string[] = [headers.join(",")];

  for (const item of rows) {
    const rowValues = validColumns.map((col) => columnMap[col](item));
    lines.push(rowValues.join(","));
  }

  return lines.join("\n");
}
