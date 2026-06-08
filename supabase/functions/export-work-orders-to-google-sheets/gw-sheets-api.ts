import { googleApiFetch } from "../_shared/google-api-retry.ts";
import { GoogleWorkspaceTokenError } from "../_shared/google-workspace-token.ts";
import {
  WORKSHEET_NAMES,
  WORKSHEET_HEADERS,
  summaryRowToArray,
  laborRowToArray,
  costRowToArray,
  pmRowToArray,
  timelineRowToArray,
  equipmentRowToArray,
  type AllExportRows,
} from "../_shared/work-orders-export-data.ts";

export const SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

const LOG_PREFIX = "[EXPORT-TO-GOOGLE-SHEETS]";

export const logStep = (step: string, details?: Record<string, unknown>) => {
  const safeDetails = details ? { ...details } : undefined;
  if (safeDetails) {
    delete safeDetails.access_token;
  }
  const detailsStr = safeDetails ? ` - ${JSON.stringify(safeDetails)}` : "";
  console.log(`${LOG_PREFIX} ${step}${detailsStr}`);
};

export interface CreateSpreadsheetResponse {
  spreadsheetId: string;
  spreadsheetUrl: string;
}

export async function createSpreadsheet(
  accessToken: string,
  title: string,
  sheetNames: string[],
): Promise<CreateSpreadsheetResponse> {
  const body = {
    properties: {
      title,
    },
    sheets: sheetNames.map((name, index) => ({
      properties: {
        sheetId: index,
        title: name,
        index,
      },
    })),
  };

  const response = await googleApiFetch(SHEETS_API_BASE, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  }, { label: "sheets-create" });

  if (!response.ok) {
    const errorBody = await response.text();
    logStep("Failed to create spreadsheet", { status: response.status, error: errorBody });

    if (response.status === 403) {
      throw new GoogleWorkspaceTokenError(
        "Insufficient permissions. Please reconnect Google Workspace to grant Sheets access.",
        "insufficient_scopes",
      );
    }

    throw new Error(`Failed to create Google Sheets spreadsheet: ${response.status}`);
  }

  const data = await response.json();
  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl,
  };
}

export async function writeSheetData(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  headers: readonly string[],
  rows: (string | number | boolean | null)[][],
): Promise<void> {
  const values = [
    headers,
    ...rows,
  ];

  const range = `'${sheetName}'!A1`;
  const url = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`;

  const response = await googleApiFetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values }),
  }, { label: "sheets-write" });

  if (!response.ok) {
    const errorBody = await response.text();
    logStep("Failed to write sheet data", { sheetName, status: response.status, error: errorBody });

    if (response.status === 403) {
      throw new GoogleWorkspaceTokenError(
        "Insufficient permissions. Please reconnect Google Workspace to grant Sheets access.",
        "insufficient_scopes",
      );
    }

    throw new Error(`Failed to write data to sheet ${sheetName}: ${response.status}`);
  }
}

export async function formatSpreadsheet(
  accessToken: string,
  spreadsheetId: string,
  sheetCount: number,
): Promise<void> {
  const requests = [];

  for (let i = 0; i < sheetCount; i++) {
    requests.push({
      updateSheetProperties: {
        properties: {
          sheetId: i,
          gridProperties: {
            frozenRowCount: 1,
          },
        },
        fields: "gridProperties.frozenRowCount",
      },
    });

    requests.push({
      repeatCell: {
        range: {
          sheetId: i,
          startRowIndex: 0,
          endRowIndex: 1,
        },
        cell: {
          userEnteredFormat: {
            textFormat: {
              bold: true,
            },
          },
        },
        fields: "userEnteredFormat.textFormat.bold",
      },
    });
  }

  if (requests.length === 0) return;

  const url = `${SHEETS_API_BASE}/${spreadsheetId}:batchUpdate`;
  const response = await googleApiFetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ requests }),
  }, { label: "sheets-format" });

  if (!response.ok) {
    const errorBody = await response.text();
    logStep("Warning: Failed to format spreadsheet", { status: response.status, error: errorBody });
  }
}

export async function populateSpreadsheet(
  accessToken: string,
  spreadsheetId: string,
  allRows: AllExportRows,
): Promise<void> {
  await writeSheetData(
    accessToken,
    spreadsheetId,
    WORKSHEET_NAMES.SUMMARY,
    WORKSHEET_HEADERS.SUMMARY,
    allRows.summaryRows.map(summaryRowToArray),
  );

  await writeSheetData(
    accessToken,
    spreadsheetId,
    WORKSHEET_NAMES.LABOR,
    WORKSHEET_HEADERS.LABOR,
    allRows.laborRows.map(laborRowToArray),
  );

  const costData = allRows.costRows.map(costRowToArray);
  if (costData.length > 0) {
    const totalQty = allRows.costRows.reduce((sum, r) => sum + r.quantity, 0);
    const totalCost = allRows.costRows.reduce((sum, r) => sum + r.totalPrice, 0);
    costData.push(["", "", "", "TOTAL", totalQty, "", totalCost, "", "", ""]);
  }
  await writeSheetData(
    accessToken,
    spreadsheetId,
    WORKSHEET_NAMES.COSTS,
    WORKSHEET_HEADERS.COSTS,
    costData,
  );

  if (allRows.pmRows.length > 0) {
    await writeSheetData(
      accessToken,
      spreadsheetId,
      WORKSHEET_NAMES.PM_CHECKLISTS,
      WORKSHEET_HEADERS.PM_CHECKLISTS,
      allRows.pmRows.map(pmRowToArray),
    );
  }

  await writeSheetData(
    accessToken,
    spreadsheetId,
    WORKSHEET_NAMES.TIMELINE,
    WORKSHEET_HEADERS.TIMELINE,
    allRows.timelineRows.map(timelineRowToArray),
  );

  await writeSheetData(
    accessToken,
    spreadsheetId,
    WORKSHEET_NAMES.EQUIPMENT,
    WORKSHEET_HEADERS.EQUIPMENT,
    allRows.equipmentRows.map(equipmentRowToArray),
  );
}
