import type jsPDF from 'jspdf';

export interface WorkOrderPdfTextLayoutOptions {
  margin: number;
  pageHeight: number;
  lineHeight: number;
  pageWidth?: number;
  contentWidth?: number;
  /** Default wrap width when addMultilineText omits maxWidth. */
  defaultMultilineMaxWidth?: number;
  pageTopY?: number;
}

/**
 * Shared jsPDF text flow helpers for work-order PDF generators (page breaks, lines, wrapping).
 */
export class WorkOrderPdfTextLayout {
  public yPosition: number;
  private readonly pageTopY: number;

  constructor(
    public readonly doc: jsPDF,
    private readonly options: WorkOrderPdfTextLayoutOptions
  ) {
    this.pageTopY = options.pageTopY ?? 20;
    this.yPosition = this.pageTopY;
  }

  checkPageBreak(requiredSpace: number = 20): void {
    if (this.yPosition + requiredSpace > this.options.pageHeight) {
      this.doc.addPage();
      this.yPosition = this.pageTopY;
    }
  }

  addText(
    text: string,
    x: number = this.options.margin,
    fontSize: number = 10,
    style: 'normal' | 'bold' = 'normal'
  ): void {
    this.checkPageBreak();
    this.doc.setFontSize(fontSize);
    this.doc.setFont('helvetica', style);
    this.doc.text(text, x, this.yPosition);
    this.yPosition += this.options.lineHeight;
  }

  addMultilineText(
    text: string,
    x: number = this.options.margin,
    maxWidth?: number,
    fontSize: number = 10
  ): void {
    const width =
      maxWidth ??
      this.options.contentWidth ??
      this.options.defaultMultilineMaxWidth ??
      (this.options.pageWidth != null
        ? this.options.pageWidth - 2 * this.options.margin
        : 170);
    this.doc.setFontSize(fontSize);
    this.doc.setFont('helvetica', 'normal');
    const lines = this.doc.splitTextToSize(text, width);
    for (const line of lines) {
      this.checkPageBreak();
      this.doc.text(line, x, this.yPosition);
      this.yPosition += this.options.lineHeight;
    }
  }
}
