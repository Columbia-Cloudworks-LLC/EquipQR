import type { OperatorCheckinSubmission } from '@/features/operator-check-ins/services/operatorCheckinSubmissionsService';
import type { OperatorCheckinReportExportOptions } from '@/features/operator-check-ins/services/operatorCheckinReportExportOptions';
import { DEFAULT_COMPACT_EXPORT_OPTIONS } from '@/features/operator-check-ins/services/operatorCheckinReportExportOptions';
import {
  buildSubmissionPdfLines,
  generateReportFilename,
  resolveReportDateRangeLabels,
} from '@/features/operator-check-ins/services/operatorCheckinReportExportHelpers';
import type { LedgerDateRange } from '@/features/operator-check-ins/utils/operatorCheckinLedgerScope';
import { downloadBlob } from '@/utils/exportUtils';

export async function downloadOperatorCheckinDailyPdf(
  submissions: OperatorCheckinSubmission[],
  dateRange: LedgerDateRange,
  templateName: string,
  equipmentLabel: string,
  options: OperatorCheckinReportExportOptions = DEFAULT_COMPACT_EXPORT_OPTIONS,
): Promise<void> {
  const { reportDateRangeLabel, dateRangeFilenamePart } = resolveReportDateRangeLabels(dateRange);

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const margin = 48;
  let y = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Daily Operator Check-In Report', margin, y);
  y += 22;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Report period: ${reportDateRangeLabel}`, margin, y);
  y += 14;
  doc.text(`Report template: ${templateName}`, margin, y);
  y += 14;
  doc.text(`Equipment: ${equipmentLabel}`, margin, y, { maxWidth: 520 });
  y += 14;
  doc.text(`Submissions: ${submissions.length}`, margin, y);
  y += 14;

  if (options.detailLevel === 'full') {
    doc.text(
      'This report supports safety and audit documentation. It does not certify legal or regulatory compliance.',
      margin,
      y,
      { maxWidth: 520 },
    );
    y += 28;
  } else {
    y += 8;
  }

  for (const submission of submissions) {
    const lines = buildSubmissionPdfLines(submission, options);

    for (const line of lines) {
      if (y > 720) {
        doc.addPage();
        y = margin;
      }

      const isHeading = line === (submission.equipment?.name ?? submission.equipment_id)
        || (options.detailLevel === 'compact' && line.includes(' — '));

      if (isHeading && options.detailLevel === 'full') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
      }

      doc.text(line, margin, y, { maxWidth: 520 });
      y += options.detailLevel === 'compact' ? 13 : 14;
    }

    y += options.detailLevel === 'compact' ? 6 : 10;
  }

  const filename = generateReportFilename(submissions, dateRangeFilenamePart, 'pdf');
  downloadBlob(doc.output('blob'), filename);
}
