import {
  WORKSHEET_HEADERS,
  type AllExportRows,
  summaryRowToArray,
  laborRowToArray,
  costRowToArray,
  pmRowToArray,
  timelineRowToArray,
  equipmentRowToArray,
} from "./work-orders-export-data.ts";

const escapeHtml = (value: unknown): string => {
  const text = value === null || value === undefined ? "" : String(value);
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
};

const toCell = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
};

const renderTable = (
  title: string,
  headers: readonly string[],
  rows: (string | number | boolean | null)[][],
): string => {
  const head = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  const body = rows.length > 0
    ? rows.map((row) => {
      const cells = row.map((cell) => `<td>${escapeHtml(toCell(cell))}</td>`).join("");
      return `<tr>${cells}</tr>`;
    }).join("")
    : `<tr><td colspan="${headers.length}">No rows in this section.</td></tr>`;

  return `
    <h2>${escapeHtml(title)}</h2>
    <table>
      <thead><tr>${head}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  `;
};

export interface InternalPacketHtmlInput {
  allRows: AllExportRows;
  organizationName: string;
  workOrderCount: number;
}

export function buildInternalPacketHtml(input: InternalPacketHtmlInput): string {
  const { allRows, organizationName, workOrderCount } = input;
  const now = new Date().toISOString();

  const sections = [
    renderTable(
      "Summary",
      WORKSHEET_HEADERS.SUMMARY,
      allRows.summaryRows.map(summaryRowToArray),
    ),
    renderTable(
      "Labor Detail",
      WORKSHEET_HEADERS.LABOR,
      allRows.laborRows.map(laborRowToArray),
    ),
    renderTable(
      "Materials & Costs",
      WORKSHEET_HEADERS.COSTS,
      allRows.costRows.map(costRowToArray),
    ),
    ...(allRows.pmRows.length > 0
      ? [
        renderTable(
          "PM Checklists",
          WORKSHEET_HEADERS.PM_CHECKLISTS,
          allRows.pmRows.map(pmRowToArray),
        ),
      ]
      : []),
    renderTable(
      "Timeline",
      WORKSHEET_HEADERS.TIMELINE,
      allRows.timelineRows.map(timelineRowToArray),
    ),
    renderTable(
      "Equipment",
      WORKSHEET_HEADERS.EQUIPMENT,
      allRows.equipmentRows.map(equipmentRowToArray),
    ),
  ].join("\n");

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Internal Work Order Packet</title>
    <style>
      body { font-family: Arial, sans-serif; color: #1f2937; line-height: 1.4; }
      h1 { margin-bottom: 0.2rem; }
      h2 { margin-top: 2rem; margin-bottom: 0.5rem; }
      p.meta { color: #4b5563; margin-top: 0; }
      table { border-collapse: collapse; width: 100%; margin-bottom: 1.25rem; font-size: 11px; }
      th, td { border: 1px solid #d1d5db; padding: 6px; text-align: left; vertical-align: top; }
      th { background-color: #f3f4f6; }
    </style>
  </head>
  <body>
    <h1>Internal Work Order Packet</h1>
    <p class="meta">Organization: ${escapeHtml(organizationName || "Unknown")}<br />Generated: ${escapeHtml(now)}<br />Work Orders: ${escapeHtml(workOrderCount)}</p>
    ${sections}
  </body>
</html>`;
}
