// jsPDF is loaded dynamically to reduce initial bundle size (~150KB)
// It's only needed when a user explicitly triggers a PDF preview

import type { UserSettings } from '@/types/settings';
import { defaultUserSettings } from '@/types/settings';
import { formatDateTime } from '@/utils/dateFormatter';

export async function generateTemplatePreviewPDF(params: {
  name: string;
  description?: string;
  sections: { name: string; items: { id: string; title: string; description?: string; required: boolean }[] }[];
  createdAt: string;
  updatedAt: string;
  /** When omitted, uses default personalization (#768). */
  exportDateSettings?: Pick<UserSettings, 'timezone' | 'dateFormat'>;
  options?: {
    includeHandwritingLines?: boolean;
    linesPerItem?: number;
  };
}): Promise<void> {
  // Dynamically load jsPDF only when PDF preview is triggered
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  let y = 20;
  const dateCtx = (params.exportDateSettings ?? defaultUserSettings) as UserSettings;

  const addLine = (text: string, size = 10, bold = false) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y > pageHeight - 15) {
      doc.addPage();
      y = 20;
    }
    const lines = doc.splitTextToSize(text, 175);
    lines.forEach((line) => {
      doc.text(line, 20, y);
      y += 6;
    });
  };

  // Header
  addLine('PM Template Preview', 16, true);
  addLine(params.name, 14, true);
  if (params.description) addLine(params.description, 10);
  addLine(`Created: ${formatDateTime(params.createdAt, dateCtx)}`, 9);
  addLine(`Updated: ${formatDateTime(params.updatedAt, dateCtx)}`, 9);

  // Sections
  const includeLines = params.options?.includeHandwritingLines === true;
  const linesPerItem = Math.max(0, Math.min(20, params.options?.linesPerItem ?? 5));

  params.sections.forEach((section) => {
    y += 4;
    addLine(section.name.toUpperCase(), 12, true);
    section.items.forEach((item, idx) => {
      addLine(`${idx + 1}. ${item.title} ${item.required ? '(Required)' : '(Optional)'}`, 10, true);
      if (item.description) addLine(item.description, 10, false);

      if (includeLines && linesPerItem > 0) {
        // Draw handwriting lines beneath each item for manual notes
        const pageWidth = doc.internal.pageSize.getWidth();
        const left = 20;
        const right = pageWidth - 20;
        const spacing = 6;
        for (let i = 0; i < linesPerItem; i++) {
          const pageHeight = doc.internal.pageSize.getHeight();
          if (y > pageHeight - 15) {
            doc.addPage();
            y = 20;
          }
          doc.setLineWidth(0.3);
          doc.line(left, y, right, y);
          y += spacing;
        }
      }
    });
  });

  const filename = `PM-Template-${params.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}



