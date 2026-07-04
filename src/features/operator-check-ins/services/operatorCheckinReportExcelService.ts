import type { OperatorCheckinSubmission } from '@/features/operator-check-ins/services/operatorCheckinSubmissionsService';
import type { OperatorCheckinReportExportOptions } from '@/features/operator-check-ins/services/operatorCheckinReportExportOptions';
import { DEFAULT_COMPACT_EXPORT_OPTIONS } from '@/features/operator-check-ins/services/operatorCheckinReportExportOptions';
import {
  buildCapturedFieldExportRows,
  buildChecklistExportRows,
  buildSubmissionExportRow,
  buildSummarySheetRows,
  generateReportFilename,
  resolveReportDateRangeLabels,
} from '@/features/operator-check-ins/services/operatorCheckinReportExportHelpers';
import type { LedgerDateRange } from '@/features/operator-check-ins/utils/operatorCheckinLedgerScope';
import { downloadBlob } from '@/utils/exportUtils';

const SUBMISSION_HEADERS = [
  'Equipment',
  'Serial number',
  'Template',
  'Submitted at',
  'Complete',
  'Required answered',
  'Summary',
] as const;

const CAPTURED_FIELD_HEADERS = ['Equipment', 'Label', 'Source', 'Value'] as const;

const CHECKLIST_HEADERS = [
  'Equipment',
  'Template',
  'Section',
  'Item',
  'Required',
  'Result',
  'Notes',
] as const;

export async function downloadOperatorCheckinDailyExcel(
  submissions: OperatorCheckinSubmission[],
  dateRange: LedgerDateRange,
  templateName: string,
  equipmentLabel: string,
  options: OperatorCheckinReportExportOptions = DEFAULT_COMPACT_EXPORT_OPTIONS,
): Promise<void> {
  const { reportDateRangeLabel, dateRangeFilenamePart } = resolveReportDateRangeLabels(dateRange);

  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();

  const summarySheet = XLSX.utils.aoa_to_sheet(
    buildSummarySheetRows(reportDateRangeLabel, templateName, equipmentLabel, submissions),
  );
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  const submissionRows = submissions.map((submission) => {
    const row = buildSubmissionExportRow(submission, options);
    return [
      row.equipmentName,
      row.serialNumber ?? '',
      row.templateName ?? '',
      row.submittedAt,
      row.isComplete ? 'Yes' : 'No',
      row.requiredAnswered,
      row.checklistSummary ?? '',
    ];
  });
  const submissionsSheet = XLSX.utils.aoa_to_sheet([
    [...SUBMISSION_HEADERS],
    ...submissionRows,
  ]);
  XLSX.utils.book_append_sheet(workbook, submissionsSheet, 'Submissions');

  const capturedRows = submissions.flatMap((submission) =>
    buildCapturedFieldExportRows(submission, options).map((row) => [
      row.equipmentName,
      row.label,
      row.source,
      row.value,
    ]),
  );
  if (capturedRows.length > 0) {
    const capturedSheet = XLSX.utils.aoa_to_sheet([
      [...CAPTURED_FIELD_HEADERS],
      ...capturedRows,
    ]);
    XLSX.utils.book_append_sheet(workbook, capturedSheet, 'Captured Fields');
  }

  if (options.includeChecklist) {
    const checklistRows = submissions.flatMap((submission) =>
      buildChecklistExportRows(submission, options).map((row) => [
        row.equipmentName,
        row.templateName ?? '',
        row.section,
        row.itemTitle,
        row.required ? 'Yes' : 'No',
        row.passed === null ? '' : row.passed ? 'Pass' : 'Fail',
        row.notes ?? '',
      ]),
    );
    if (checklistRows.length > 0) {
      const checklistSheet = XLSX.utils.aoa_to_sheet([
        [...CHECKLIST_HEADERS],
        ...checklistRows,
      ]);
      XLSX.utils.book_append_sheet(workbook, checklistSheet, 'Checklist');
    }
  }

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const filename = generateReportFilename(submissions, dateRangeFilenamePart, 'xlsx');
  downloadBlob(blob, filename);
}

export async function downloadOperatorCheckinDailyReport(
  submissions: OperatorCheckinSubmission[],
  dateRange: LedgerDateRange,
  templateName: string,
  equipmentLabel: string,
  options: OperatorCheckinReportExportOptions,
): Promise<void> {
  if (options.format === 'xlsx') {
    await downloadOperatorCheckinDailyExcel(
      submissions,
      dateRange,
      templateName,
      equipmentLabel,
      options,
    );
    return;
  }
  const { downloadOperatorCheckinDailyPdf } = await import(
    '@/features/operator-check-ins/services/operatorCheckinReportPdfService'
  );
  await downloadOperatorCheckinDailyPdf(
    submissions,
    dateRange,
    templateName,
    equipmentLabel,
    options,
  );
}
