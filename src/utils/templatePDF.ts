import jsPDF from 'jspdf';

type Section = { name: string; items: { title: string; description?: string; required: boolean }[] };

export function generateTemplatePreviewPDF(params: {
  name: string;
  description?: string;
  sections: { name: string; items: { id: string; title: string; description?: string; required: boolean }[] }[];
  createdAt: string;
  updatedAt: string;
  options?: {
    includeHandwritingLines?: boolean;
    linesPerItem?: number;
  };
}): void {
  const doc = new jsPDF();
  let y = 20;

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
  addLine(`Created: ${new Date(params.createdAt).toLocaleString()}`, 9);
  addLine(`Updated: ${new Date(params.updatedAt).toLocaleString()}`, 9);

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



