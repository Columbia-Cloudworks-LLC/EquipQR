/**
 * PM checklist JSON parsing shared by export and Google Docs modules.
 */

export interface PMChecklistItem {
  section: string;
  title: string;
  condition: number | null;
  required: boolean;
  notes?: string;
}

export interface PMChecklistParseResult {
  items: PMChecklistItem[];
  error: Error | null;
}

export interface PMChecklistParseLogContext {
  workOrderId: string;
  workOrderTitle?: string;
}

export function parsePMChecklistData(
  rawData: unknown,
  logContext?: PMChecklistParseLogContext,
): PMChecklistParseResult {
  let checklistItems: PMChecklistItem[] = [];
  let parseError: Error | null = null;

  try {
    if (typeof rawData === 'string') {
      checklistItems = JSON.parse(rawData);
    } else if (Array.isArray(rawData)) {
      checklistItems = rawData;
    }
  } catch (error) {
    parseError = error instanceof Error ? error : new Error(String(error));
    const rawDataSnippet = typeof rawData === 'string'
      ? rawData.substring(0, 200)
      : String(rawData).substring(0, 200);

    console.error('Error parsing PM checklist data', {
      workOrderId: logContext?.workOrderId,
      workOrderTitle: logContext?.workOrderTitle,
      rawType: typeof rawData,
      rawDataLength: typeof rawData === 'string' ? rawData.length : 'N/A',
      rawDataSnippet,
      errorMessage: parseError.message,
      errorStack: parseError.stack,
    });
  }

  return { items: checklistItems, error: parseError };
}
