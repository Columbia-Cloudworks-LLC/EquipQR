import type jsPDF from 'jspdf';
import type { UserSettings } from '@/types/settings';
import { formatDateTime as formatDateTimeTz } from '@/utils/dateFormatter';
import type { WorkOrderPDFData } from './workOrderReportPDFService';

/** Layout constants shared by work-order PDF generators for page chrome. */
export interface WorkOrderPdfPageLayout {
  margin: number;
  pageWidth: number;
  footerY: number;
  qrSize: number;
}

export type WorkOrderPdfFooterVariant = 'report' | 'fieldWorksheet';

const FIELD_WORKSHEET_DISCLAIMER =
  'Field worksheet only \u2014 all results must be entered into EquipQR as the official record';

/** Format work order UUID for printed PDF identity lines (first4...last4). */
export function formatWorkOrderIdForPdf(id: string): string {
  if (id.length <= 8) return id;
  return `${id.slice(0, 4)}...${id.slice(-4)}`;
}

export function renderWorkOrderPdfPageHeader(
  doc: jsPDF,
  layout: WorkOrderPdfPageLayout,
  data: WorkOrderPDFData,
  pageNum: number,
  totalPages: number,
): void {
  const { pageIdentity } = data;
  const headerY = 8;
  const { margin, pageWidth } = layout;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  const pageText = `Page ${pageNum} of ${totalPages}`;
  const pageTextWidth = doc.getTextWidth(pageText);
  doc.text(pageText, pageWidth - margin - pageTextWidth, headerY);

  if (pageNum > 1 && pageIdentity) {
    const maxLabelWidth = pageWidth - 2 * margin - pageTextWidth - 10;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    const woLabel =
      doc.splitTextToSize(pageIdentity.workOrderLabel, maxLabelWidth)[0] ??
      pageIdentity.workOrderLabel;
    doc.text(woLabel, margin, headerY);

    if (pageIdentity.equipmentLabel) {
      doc.setFont('helvetica', 'normal');
      const eqLabel =
        doc.splitTextToSize(pageIdentity.equipmentLabel, maxLabelWidth)[0] ??
        pageIdentity.equipmentLabel;
      doc.text(eqLabel, margin, headerY + 5);
    }

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    const separatorY = pageIdentity.equipmentLabel ? headerY + 8 : headerY + 4;
    doc.line(margin, separatorY, pageWidth - margin, separatorY);
  }

  doc.setTextColor(0, 0, 0);
}

export function renderWorkOrderPdfFooterQRStrip(
  doc: jsPDF,
  layout: WorkOrderPdfPageLayout,
  data: WorkOrderPDFData,
  footerVariant: WorkOrderPdfFooterVariant,
): void {
  const { qrCodes, exportDateSettings } = data;
  const { margin, pageWidth, footerY, qrSize } = layout;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  const qrY = footerY + 3;
  const labelY = qrY + qrSize + 3;

  if (qrCodes?.workOrder) {
    try {
      doc.addImage(qrCodes.workOrder.dataUrl, 'PNG', margin, qrY, qrSize, qrSize);
    } catch {
      /* QR embed failed */
    }
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text('Work Order', margin, labelY);
  }

  const eqX = pageWidth - margin - qrSize;
  if (qrCodes?.equipment) {
    try {
      doc.addImage(qrCodes.equipment.dataUrl, 'PNG', eqX, qrY, qrSize, qrSize);
    } catch {
      /* QR embed failed */
    }
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text('Equipment', eqX, labelY);
  } else if (qrCodes) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(160, 160, 160);
    doc.text('No equipment assigned', eqX, qrY + qrSize / 2);
  }

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  const genText = `Document generated: ${formatDateTimeTz(
    new Date(),
    exportDateSettings as UserSettings,
  )}`;
  const genWidth = doc.getTextWidth(genText);
  const generatedAtY =
    footerVariant === 'fieldWorksheet' ? qrY + qrSize / 2 - 3 : qrY + qrSize / 2;
  doc.text(genText, (pageWidth - genWidth) / 2, generatedAtY);

  if (footerVariant === 'fieldWorksheet') {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6);
    const disclaimerWidth = doc.getTextWidth(FIELD_WORKSHEET_DISCLAIMER);
    doc.text(FIELD_WORKSHEET_DISCLAIMER, (pageWidth - disclaimerWidth) / 2, qrY + qrSize / 2 + 3);
  }

  doc.setTextColor(0, 0, 0);
}

/** Apply repeated page header + footer QR strip to every page. */
export function applyWorkOrderPdfPageChrome(
  doc: jsPDF,
  layout: WorkOrderPdfPageLayout,
  data: WorkOrderPDFData,
  footerVariant: WorkOrderPdfFooterVariant,
): void {
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    renderWorkOrderPdfPageHeader(doc, layout, data, i, totalPages);
    renderWorkOrderPdfFooterQRStrip(doc, layout, data, footerVariant);
  }
}
