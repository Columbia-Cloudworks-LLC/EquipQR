import type { OperatorChecklistTemplate } from '@/features/operator-check-ins/services/operatorChecklistTemplatesService';
import type { OperatorCheckinSubmission } from '@/features/operator-check-ins/services/operatorCheckinSubmissionsService';
import {
  createEmptyTemplateData,
  formatCapturedFieldValue,
  parseTemplateData,
  type OperatorChecklistDataField,
  type OperatorChecklistTemplateData,
} from '@/features/operator-check-ins/types/operatorChecklist';
import { flattenCapturedFields } from '@/features/operator-check-ins/utils/capturedFieldHelpers';

export type LedgerTableRow = Record<string, unknown> & {
  id: string;
  equipmentName: string;
  submittedAt: string;
  /** Raw ISO timestamp used for chronological sorting. */
  submittedAtIso: string;
  status: 'complete' | 'incomplete';
};

export type LedgerSortOrder = 'asc' | 'desc';

export const DEFAULT_LEDGER_SORT_BY = 'submittedAtIso';
export const DEFAULT_LEDGER_SORT_ORDER: LedgerSortOrder = 'desc';
export const DEFAULT_LEDGER_PAGE_SIZE = 25;

export function paginateLedgerRows<T>(rows: T[], page: number, pageSize: number): T[] {
  const safePage = Math.max(1, page);
  const start = (safePage - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}

export function getLedgerPageCount(totalRows: number, pageSize: number): number {
  if (totalRows <= 0) return 1;
  return Math.ceil(totalRows / pageSize);
}

/** Client-context fields that duplicate fixed ledger columns. */
export function getLedgerDisplayDataFields(
  templateData: OperatorChecklistTemplateData,
): OperatorChecklistDataField[] {
  return templateData.dataFields.filter(
    (field) =>
      !(field.source === 'client_context' && field.clientKey === 'submitted_timestamp'),
  );
}

export function resolveLedgerTableTemplateData(
  selectedTemplate: Pick<OperatorChecklistTemplate, 'template_data'> | null,
  submissions: OperatorCheckinSubmission[],
): OperatorChecklistTemplateData {
  const fromTemplate = selectedTemplate?.template_data;
  if (fromTemplate && (fromTemplate.dataFields.length > 0 || fromTemplate.checklistItems.length > 0)) {
    return fromTemplate;
  }

  const firstSubmission = submissions[0];
  if (firstSubmission) {
    return parseTemplateData(firstSubmission.template_snapshot);
  }

  return createEmptyTemplateData();
}

export function buildLedgerTableRows(
  submissions: OperatorCheckinSubmission[],
  templateData: OperatorChecklistTemplateData,
  formatDateTime: (value: string) => string,
): LedgerTableRow[] {
  return submissions.map((submission) => {
    const capturedByFieldId = new Map(
      flattenCapturedFields(
        submission.operator_field_values,
        submission.client_field_values,
        submission.equipment_field_values,
      ).map((field) => [field.field_id, formatCapturedFieldValue(field.value)]),
    );

    const answersByItemId = new Map(
      (Array.isArray(submission.checklist_answers) ? submission.checklist_answers : []).map(
        (answer) => [answer.item_id, answer],
      ),
    );

    const row: LedgerTableRow = {
      id: submission.id,
      equipmentName: submission.equipment?.name ?? submission.equipment_id,
      submittedAt: formatDateTime(submission.submitted_at),
      submittedAtIso: submission.submitted_at,
      status: submission.is_complete ? 'complete' : 'incomplete',
    };

    for (const field of getLedgerDisplayDataFields(templateData)) {
      row[`field_${field.id}`] = capturedByFieldId.get(field.id) ?? '—';
    }

    for (const item of templateData.checklistItems) {
      const answer = answersByItemId.get(item.id);
      if (answer === undefined) {
        row[`checklist_${item.id}`] = '—';
      } else {
        row[`checklist_${item.id}`] = answer.passed ? 'pass' : 'fail';
        if (answer.notes?.trim()) {
          row[`checklist_${item.id}_notes`] = answer.notes.trim();
        }
      }
    }

    return row;
  });
}

const CHECKLIST_SORT_ORDER: Record<string, number> = {
  pass: 0,
  fail: 1,
  '—': 2,
};

const STATUS_SORT_ORDER: Record<LedgerTableRow['status'], number> = {
  complete: 0,
  incomplete: 1,
};

function isNumericLedgerField(
  sortBy: string,
  templateData: OperatorChecklistTemplateData,
): boolean {
  if (!sortBy.startsWith('field_')) return false;
  const fieldId = sortBy.slice('field_'.length);
  const field = getLedgerDisplayDataFields(templateData).find((item) => item.id === fieldId);
  return field?.inputType === 'number';
}

function compareLedgerCellValues(
  left: unknown,
  right: unknown,
  sortBy: string,
  templateData: OperatorChecklistTemplateData,
): number {
  if (left === right) return 0;

  if (sortBy.startsWith('checklist_')) {
    const leftRank = CHECKLIST_SORT_ORDER[String(left)] ?? 3;
    const rightRank = CHECKLIST_SORT_ORDER[String(right)] ?? 3;
    return leftRank - rightRank;
  }

  if (sortBy === 'status') {
    const leftRank = STATUS_SORT_ORDER[left as LedgerTableRow['status']] ?? 2;
    const rightRank = STATUS_SORT_ORDER[right as LedgerTableRow['status']] ?? 2;
    return leftRank - rightRank;
  }

  if (sortBy === 'submittedAtIso') {
    return String(left).localeCompare(String(right));
  }

  if (isNumericLedgerField(sortBy, templateData)) {
    const leftEmpty = left === '—' || left === '' || left == null;
    const rightEmpty = right === '—' || right === '' || right == null;
    if (leftEmpty && rightEmpty) return 0;
    if (leftEmpty) return 1;
    if (rightEmpty) return -1;

    const leftNumber = Number(left);
    const rightNumber = Number(right);
    if (!Number.isNaN(leftNumber) && !Number.isNaN(rightNumber)) {
      return leftNumber - rightNumber;
    }
  }

  return String(left ?? '').localeCompare(String(right ?? ''), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

export function sortLedgerTableRows(
  rows: LedgerTableRow[],
  sortBy: string,
  sortOrder: LedgerSortOrder,
  templateData: OperatorChecklistTemplateData,
): LedgerTableRow[] {
  const sorted = [...rows].sort((left, right) => {
    const comparison = compareLedgerCellValues(
      left[sortBy],
      right[sortBy],
      sortBy,
      templateData,
    );
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  return sorted;
}
