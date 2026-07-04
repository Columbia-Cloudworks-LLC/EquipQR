import type { OperatorCheckinSubmission } from '@/features/operator-check-ins/services/operatorCheckinSubmissionsService';
import type { OperatorCheckinReportExportOptions } from '@/features/operator-check-ins/services/operatorCheckinReportExportOptions';
import {
  formatCapturedFieldValue,
  parseTemplateData,
  type CapturedFieldValue,
  type OperatorChecklistTemplateItem,
} from '@/features/operator-check-ins/types/operatorChecklist';
import { getSubmissionTemplateName } from '@/features/operator-check-ins/utils/submissionTemplateHelpers';
import {
  formatLedgerDateRangeFilenamePart,
  formatLedgerDateRangeLabel,
  type LedgerDateRange,
} from '@/features/operator-check-ins/utils/operatorCheckinLedgerScope';
import { defaultUserSettings } from '@/types/settings';
import { formatDateTime as formatDateTimeWithSettings } from '@/utils/dateFormatter';

export interface ChecklistExportRow {
  submissionId: string;
  equipmentName: string;
  templateName: string | null;
  section: string;
  itemTitle: string;
  required: boolean;
  passed: boolean | null;
  notes: string | null;
}

export interface CapturedFieldExportRow {
  submissionId: string;
  equipmentName: string;
  label: string;
  source: CapturedFieldValue['source'];
  value: string;
}

export interface SubmissionExportRow {
  submissionId: string;
  equipmentName: string;
  serialNumber: string | null;
  templateName: string | null;
  submittedAt: string;
  isComplete: boolean;
  requiredAnswered: string;
  checklistSummary: string | null;
}

export function sanitizeFilenamePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 80);
}

export function resolveReportDateRangeLabels(dateRange: LedgerDateRange): {
  reportDateRangeLabel: string;
  dateRangeFilenamePart: string;
} {
  return {
    reportDateRangeLabel: formatLedgerDateRangeLabel(dateRange.startDate, dateRange.endDate),
    dateRangeFilenamePart: formatLedgerDateRangeFilenamePart(
      dateRange.startDate,
      dateRange.endDate,
    ),
  };
}

export function generateReportFilename(
  submissions: OperatorCheckinSubmission[],
  dateRangeFilenamePart: string,
  extension: 'pdf' | 'xlsx',
): string {
  const unitPart = submissions.length === 1
    ? sanitizeFilenamePart(submissions[0].equipment?.name ?? 'unit')
    : 'fleet';
  return `${unitPart}_${dateRangeFilenamePart}_operator-checkins.${extension}`;
}

export function getChecklistItemsFromSubmission(
  submission: OperatorCheckinSubmission,
): OperatorChecklistTemplateItem[] {
  const snapshot = submission.template_snapshot;
  if (typeof snapshot !== 'object' || snapshot === null) return [];
  const data = parseTemplateData(snapshot);
  return data.checklistItems;
}

function resolveItemTitle(
  itemId: string,
  items: OperatorChecklistTemplateItem[],
): { title: string; section: string; required: boolean } {
  const item = items.find((i) => i.id === itemId);
  return {
    title: item?.title ?? itemId,
    section: item?.section ?? 'General',
    required: item?.required ?? false,
  };
}

export function buildChecklistExportRows(
  submission: OperatorCheckinSubmission,
  options: OperatorCheckinReportExportOptions,
): ChecklistExportRow[] {
  if (!options.includeChecklist) return [];

  const items = getChecklistItemsFromSubmission(submission);
  const answers = Array.isArray(submission.checklist_answers)
    ? submission.checklist_answers
    : [];
  const equipmentName = submission.equipment?.name ?? submission.equipment_id;
  const templateName = getSubmissionTemplateName(submission);

  const rows: ChecklistExportRow[] = answers.map((answer) => {
    const meta = resolveItemTitle(answer.item_id, items);
    return {
      submissionId: submission.id,
      equipmentName,
      templateName,
      section: meta.section,
      itemTitle: meta.title,
      required: meta.required,
      passed: answer.passed,
      notes: options.includeNotes ? (answer.notes ?? null) : null,
    };
  });

  if (options.checklistMode === 'exceptions') {
    return rows.filter((row) => row.passed === false || Boolean(row.notes?.trim()));
  }

  return rows;
}

export function submissionHasChecklistItems(submission: OperatorCheckinSubmission): boolean {
  if (getChecklistItemsFromSubmission(submission).length > 0) return true;
  const answers = Array.isArray(submission.checklist_answers)
    ? submission.checklist_answers
    : [];
  return answers.length > 0;
}

export function buildChecklistSummaryLine(
  submission: OperatorCheckinSubmission,
): string | null {
  if (!submissionHasChecklistItems(submission)) return null;

  const answers = Array.isArray(submission.checklist_answers)
    ? submission.checklist_answers
    : [];
  const passCount = answers.filter((a) => a.passed).length;
  const failCount = answers.filter((a) => !a.passed).length;
  return `Checklist: ${submission.answered_required_count}/${submission.required_item_count} required answered, ${passCount} pass, ${failCount} fail`;
}

function filterCapturedFieldsByOptions(
  fields: CapturedFieldValue[],
  options: OperatorCheckinReportExportOptions,
): CapturedFieldValue[] {
  return fields.filter((field) => {
    if (field.source === 'operator_input') return options.includeOperatorFields;
    if (field.source === 'equipment_snapshot') return options.includeEquipmentSnapshot;
    if (field.source === 'client_context') return options.includeClientContext;
    return true;
  });
}

export function buildCapturedFieldExportRows(
  submission: OperatorCheckinSubmission,
  options: OperatorCheckinReportExportOptions,
): CapturedFieldExportRow[] {
  const equipmentName = submission.equipment?.name ?? submission.equipment_id;
  const operatorFields = Array.isArray(submission.operator_field_values)
    ? submission.operator_field_values
    : [];
  const clientFields = Array.isArray(submission.client_field_values)
    ? submission.client_field_values
    : [];
  const equipmentFields = Array.isArray(submission.equipment_field_values)
    ? submission.equipment_field_values
    : [];

  const allFields = [...operatorFields, ...clientFields, ...equipmentFields].filter(
    (field): field is CapturedFieldValue =>
      typeof field === 'object' &&
      field !== null &&
      typeof (field as CapturedFieldValue).field_id === 'string' &&
      typeof (field as CapturedFieldValue).label === 'string',
  );

  return filterCapturedFieldsByOptions(allFields, options).map((field) => ({
    submissionId: submission.id,
    equipmentName,
    label: field.label,
    source: field.source,
    value: formatCapturedFieldValue(field.value),
  }));
}

export function buildSubmissionExportRow(
  submission: OperatorCheckinSubmission,
  options: OperatorCheckinReportExportOptions,
): SubmissionExportRow {
  const capturedSummary = buildCapturedFieldExportRows(submission, options)
    .map((row) => `${row.label}: ${row.value}`)
    .join(' | ');

  return {
    submissionId: submission.id,
    equipmentName: submission.equipment?.name ?? submission.equipment_id,
    serialNumber: submission.equipment?.serial_number ?? null,
    templateName: getSubmissionTemplateName(submission),
    submittedAt: formatDateTimeWithSettings(submission.submitted_at, defaultUserSettings),
    isComplete: submission.is_complete,
    requiredAnswered: submissionHasChecklistItems(submission)
      ? `${submission.answered_required_count}/${submission.required_item_count}`
      : '',
    checklistSummary: options.includeChecklist
      ? buildChecklistSummaryLine(submission)
      : capturedSummary || null,
  };
}

/** Compact PDF text lines for one submission (no jsPDF dependency). */
export function buildCompactSubmissionPdfLines(
  submission: OperatorCheckinSubmission,
  options: OperatorCheckinReportExportOptions,
): string[] {
  const lines: string[] = [];
  const equipmentName = submission.equipment?.name ?? submission.equipment_id;
  const status = submission.is_complete ? 'Complete' : 'Incomplete';
  const submitted = formatDateTimeWithSettings(submission.submitted_at, defaultUserSettings);

  lines.push(`${equipmentName} — ${submitted} (${status})`);

  const capturedRows = buildCapturedFieldExportRows(submission, options);
  if (capturedRows.length > 0) {
    const capturedLine = capturedRows.map((row) => `${row.label}: ${row.value}`).join(' · ');
    lines.push(capturedLine);
  }

  if (options.includeChecklist) {
    const summaryLine = buildChecklistSummaryLine(submission);
    if (summaryLine) {
      lines.push(summaryLine);
    }
    const checklistRows = buildChecklistExportRows(submission, options);
    for (const row of checklistRows) {
      const passLabel = row.passed ? 'Pass' : 'Fail';
      const noteSuffix = row.notes?.trim() ? ` — ${row.notes.trim()}` : '';
      lines.push(`  • ${row.section} / ${row.itemTitle}: ${passLabel}${noteSuffix}`);
    }
  }

  return lines;
}

/** Full PDF text lines for one submission. */
export function buildFullSubmissionPdfLines(
  submission: OperatorCheckinSubmission,
  options: OperatorCheckinReportExportOptions,
): string[] {
  const lines: string[] = [];
  const equipmentName = submission.equipment?.name ?? submission.equipment_id;
  lines.push(equipmentName);

  lines.push(`Submitted: ${formatDateTimeWithSettings(submission.submitted_at, defaultUserSettings)}`);
  lines.push(`Complete: ${submission.is_complete ? 'Yes' : 'No'}`);

  for (const row of buildCapturedFieldExportRows(submission, options)) {
    lines.push(`  ${row.label}: ${row.value}`);
  }

  if (options.includeChecklist) {
    const summaryLine = buildChecklistSummaryLine(submission);
    if (summaryLine) {
      lines.push(summaryLine);
    }
    for (const row of buildChecklistExportRows(submission, options)) {
      const passLabel = row.passed ? 'Pass' : 'Fail';
      const noteSuffix = row.notes?.trim() ? ` — Note: ${row.notes.trim()}` : '';
      lines.push(`  • [${row.section}] ${row.itemTitle}: ${passLabel}${noteSuffix}`);
    }
  }

  return lines;
}

export function buildSubmissionPdfLines(
  submission: OperatorCheckinSubmission,
  options: OperatorCheckinReportExportOptions,
): string[] {
  return options.detailLevel === 'full'
    ? buildFullSubmissionPdfLines(submission, options)
    : buildCompactSubmissionPdfLines(submission, options);
}

export function buildSummarySheetRows(
  reportDateRangeLabel: string,
  templateName: string,
  equipmentLabel: string,
  submissions: OperatorCheckinSubmission[],
): string[][] {
  const completeCount = submissions.filter((s) => s.is_complete).length;
  return [
    ['Daily Operator Check-In Report'],
    ['Report period', reportDateRangeLabel],
    ['Report template', templateName],
    ['Equipment', equipmentLabel],
    ['Submissions', String(submissions.length)],
    ['Complete', String(completeCount)],
    ['Incomplete', String(submissions.length - completeCount)],
  ];
}

export const __operatorCheckinReportExportTestables = {
  sanitizeFilenamePart,
  submissionHasChecklistItems,
  buildChecklistExportRows,
  buildChecklistSummaryLine,
  buildCapturedFieldExportRows,
  buildCompactSubmissionPdfLines,
  buildSubmissionPdfLines,
  buildSummarySheetRows,
};
