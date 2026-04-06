import type jsPDF from 'jspdf';
import { logger } from '@/utils/logger';
import { formatStatus, formatPriority, formatDate } from '@/features/work-orders/utils/workOrderHelpers';
import type { PMChecklistItem, PreventativeMaintenance } from '@/features/pm-templates/services/preventativeMaintenanceService';
import type { WorkOrderForPDF, EquipmentForPDF, WorkOrderPDFData } from './workOrderReportPDFService';

const CONDITION_LEGEND = [
  { value: 1, label: 'OK' },
  { value: 2, label: 'Adjusted' },
  { value: 3, label: 'Recommend Repairs' },
  { value: 4, label: 'Immediate Repairs' },
  { value: 5, label: 'Unsafe' },
] as const;

interface PreloadedImage {
  data: string;
  format: 'JPEG' | 'PNG';
  width: number;
  height: number;
}

/**
 * Generates a handwriting-friendly PDF worksheet for field technicians.
 *
 * Layout:
 *   Page 1      — Header (with org logo / team image), WO details, equipment, description
 *   PM Summary  — Compact one-page reference list of all checklist items
 *   PM Detail   — Each item gets a checkbox, condition boxes, and 5 blank writing lines
 *   Labor       — Full page of labor entry rows (Tech / Hours / Date / Task)
 *   Parts       — Full page of parts/materials rows (Part / Qty / Part#)
 *   Notes Page  — Full page of blank ruled lines with signature block at the bottom
 */
export class WorkOrderFieldWorksheetPDFGenerator {
  private doc!: jsPDF;
  private yPosition: number = 20;
  private readonly lineHeight = 6;
  private readonly writeLineHeight = 8;
  private readonly pageHeight = 252;
  private readonly margin = 15;
  private readonly pageWidth = 210;
  private readonly contentWidth: number;
  private readonly footerY = 255;
  private readonly qrSize = 20;

  private constructor() {
    this.contentWidth = this.pageWidth - 2 * this.margin;
  }

  private async init(): Promise<void> {
    const { default: jsPDF } = await import('jspdf');
    this.doc = new jsPDF();
  }

  static async create(): Promise<WorkOrderFieldWorksheetPDFGenerator> {
    const instance = new WorkOrderFieldWorksheetPDFGenerator();
    await instance.init();
    return instance;
  }

  // ===================== UTILITY METHODS =====================

  private checkPageBreak(requiredSpace: number = 20): void {
    if (this.yPosition + requiredSpace > this.pageHeight) {
      this.doc.addPage();
      this.yPosition = 20;
    }
  }

  private addText(
    text: string,
    x: number = this.margin,
    fontSize: number = 10,
    style: 'normal' | 'bold' = 'normal'
  ): void {
    this.checkPageBreak();
    this.doc.setFontSize(fontSize);
    this.doc.setFont('helvetica', style);
    this.doc.text(text, x, this.yPosition);
    this.yPosition += this.lineHeight;
  }

  private addMultilineText(
    text: string,
    x: number = this.margin,
    maxWidth?: number,
    fontSize: number = 10
  ): void {
    const width = maxWidth ?? this.contentWidth;
    this.doc.setFontSize(fontSize);
    this.doc.setFont('helvetica', 'normal');
    const lines = this.doc.splitTextToSize(text, width);
    for (const line of lines) {
      this.checkPageBreak();
      this.doc.text(line, x, this.yPosition);
      this.yPosition += this.lineHeight;
    }
  }

  private addSectionHeader(title: string): void {
    this.checkPageBreak(15);
    this.yPosition += 3;
    this.doc.setFillColor(240, 240, 240);
    this.doc.rect(this.margin, this.yPosition - 4.5, this.contentWidth, 7, 'F');
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(0, 0, 0);
    this.doc.text(title.toUpperCase(), this.margin + 2, this.yPosition);
    this.yPosition += 6;
  }

  private addSeparator(): void {
    this.yPosition += 2;
    this.checkPageBreak(6);
    this.doc.setDrawColor(180, 180, 180);
    this.doc.setLineWidth(0.3);
    this.doc.line(this.margin, this.yPosition, this.pageWidth - this.margin, this.yPosition);
    this.yPosition += 4;
  }

  private addWriteLines(count: number, x: number = this.margin, width?: number): void {
    const lineWidth = width ?? this.contentWidth;
    this.doc.setDrawColor(200, 200, 200);
    this.doc.setLineWidth(0.2);
    for (let i = 0; i < count; i++) {
      this.checkPageBreak(this.writeLineHeight);
      this.doc.line(x, this.yPosition, x + lineWidth, this.yPosition);
      this.yPosition += this.writeLineHeight;
    }
  }

  private addLabeledField(label: string, x: number, lineEndX: number, y?: number): void {
    const drawY = y ?? this.yPosition;
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(0, 0, 0);
    this.doc.text(label, x, drawY);
    const labelWidth = this.doc.getTextWidth(label) + 1;
    this.doc.setDrawColor(180, 180, 180);
    this.doc.setLineWidth(0.3);
    this.doc.line(x + labelWidth, drawY, lineEndX, drawY);
  }

  private formatWorkOrderId(id: string): string {
    if (id.length <= 8) return id;
    return `${id.slice(0, 4)}...${id.slice(-4)}`;
  }

  // ===================== IMAGE HANDLING =====================

  private async fetchImageAsBase64(url: string): Promise<{ data: string; format: 'JPEG' | 'PNG' } | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;

      const blob = await response.blob();
      const contentType = blob.type.toLowerCase();
      if (!contentType) return null;

      let format: 'JPEG' | 'PNG';
      if (contentType.includes('png')) format = 'PNG';
      else if (contentType.includes('jpeg') || contentType.includes('jpg')) format = 'JPEG';
      else return null;

      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve({ data: reader.result as string, format });
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  private async preloadImage(url: string): Promise<PreloadedImage | null> {
    const imageData = await this.fetchImageAsBase64(url);
    if (!imageData) return null;

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ ...imageData, width: img.width, height: img.height });
      img.onerror = () => resolve(null);
      img.src = imageData.data;
    });
  }

  private embedImage(
    image: PreloadedImage,
    maxWidth: number,
    maxHeight: number,
    align: 'left' | 'center' | 'right' = 'center',
    y?: number
  ): { width: number; height: number } {
    const aspectRatio = image.width / image.height;
    let w = maxWidth;
    let h = w / aspectRatio;
    if (h > maxHeight) {
      h = maxHeight;
      w = h * aspectRatio;
    }

    let x: number;
    switch (align) {
      case 'left': x = this.margin; break;
      case 'right': x = this.pageWidth - this.margin - w; break;
      default: x = (this.pageWidth - w) / 2; break;
    }

    const drawY = y ?? this.yPosition;

    try {
      this.doc.addImage(image.data, image.format, x, drawY, w, h);
    } catch {
      logger.warn('Failed to embed branding image in worksheet');
    }

    return { width: w, height: h };
  }

  // ===================== PAGE SECTIONS =====================

  private generateHeader(
    workOrder: WorkOrderForPDF,
    organizationName?: string,
    orgLogo?: PreloadedImage | null,
    teamImage?: PreloadedImage | null
  ): void {
    // Team image in top-right corner (drawn first so header text doesn't overlap)
    if (teamImage) {
      this.embedImage(teamImage, 22, 16, 'right', this.yPosition);
    }

    // Organization logo centered
    if (orgLogo) {
      const { height } = this.embedImage(orgLogo, 50, 18, 'center');
      this.yPosition += height + 3;
    }

    if (organizationName) {
      this.doc.setFontSize(14);
      this.doc.setFont('helvetica', 'bold');
      const orgWidth = this.doc.getTextWidth(organizationName);
      this.doc.text(organizationName, (this.pageWidth - orgWidth) / 2, this.yPosition);
      this.yPosition += 7;
    }

    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    const subtitle = 'FIELD WORKSHEET';
    const subtitleWidth = this.doc.getTextWidth(subtitle);
    this.doc.text(subtitle, (this.pageWidth - subtitleWidth) / 2, this.yPosition);
    this.yPosition += 7;

    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'bold');
    const titleLines = this.doc.splitTextToSize(workOrder.title, this.contentWidth - 20);
    for (const line of titleLines) {
      const lineWidth = this.doc.getTextWidth(line);
      this.doc.text(line, (this.pageWidth - lineWidth) / 2, this.yPosition);
      this.yPosition += 6;
    }

    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');
    const statusLine = `WO: ${this.formatWorkOrderId(workOrder.id)}  |  ${formatStatus(workOrder.status)}  |  Generated: ${new Date().toLocaleDateString()}`;
    const statusWidth = this.doc.getTextWidth(statusLine);
    this.doc.text(statusLine, (this.pageWidth - statusWidth) / 2, this.yPosition);
    this.yPosition += 4;

    this.addSeparator();
  }

  private generateDetailsSection(workOrder: WorkOrderForPDF): void {
    this.addSectionHeader('Work Order Details');

    const col1x = this.margin + 2;
    const col2x = this.margin + this.contentWidth / 2;

    this.addText(`Created: ${formatDate(workOrder.created_date)}`, col1x, 9);
    this.yPosition -= this.lineHeight;
    this.addText(`Due: ${formatDate(workOrder.due_date)}`, col2x, 9);

    this.addText(`Priority: ${formatPriority(workOrder.priority)}`, col1x, 9);
    this.yPosition -= this.lineHeight;
    const assignee = workOrder.assigneeName || workOrder.assignee_name || 'Unassigned';
    this.addText(`Assigned To: ${assignee}`, col2x, 9);

    if (workOrder.teamName) {
      this.addText(`Team: ${workOrder.teamName}`, col1x, 9);
    }
    if (workOrder.estimated_hours) {
      if (!workOrder.teamName) {
        this.addText(`Est. Hours: ${workOrder.estimated_hours}`, col1x, 9);
      } else {
        this.yPosition -= this.lineHeight;
        this.addText(`Est. Hours: ${workOrder.estimated_hours}`, col2x, 9);
      }
    }

    this.yPosition += 2;
  }

  private generateEquipmentSection(equipment: EquipmentForPDF): void {
    this.addSectionHeader('Equipment');

    const col1x = this.margin + 2;
    const col2x = this.margin + this.contentWidth / 2;

    this.addText(equipment.name, col1x, 10, 'bold');

    if (equipment.manufacturer || equipment.model) {
      if (equipment.manufacturer) {
        this.addText(`Mfr: ${equipment.manufacturer}`, col1x, 9);
        if (equipment.model) {
          this.yPosition -= this.lineHeight;
          this.addText(`Model: ${equipment.model}`, col2x, 9);
        }
      } else if (equipment.model) {
        this.addText(`Model: ${equipment.model}`, col1x, 9);
      }
    }

    if (equipment.serial_number) {
      this.addText(`S/N: ${equipment.serial_number}`, col1x, 9);
    }

    if (equipment.location) {
      this.addText(`Location: ${equipment.location}`, col1x, 9);
    }

    this.yPosition += 2;
  }

  private generateDescriptionSection(description: string): void {
    this.addSectionHeader('Description');
    if (description) {
      this.addMultilineText(description, this.margin + 2, this.contentWidth - 4, 9);
    } else {
      this.addText('No description provided.', this.margin + 2, 9);
    }
    this.yPosition += 2;
  }

  // ===================== PM CHECKLIST =====================

  private generateConditionLegend(): void {
    this.checkPageBreak(16);
    this.doc.setDrawColor(100, 100, 100);
    this.doc.setLineWidth(0.4);
    this.doc.setFillColor(250, 250, 245);
    this.doc.rect(this.margin, this.yPosition - 3, this.contentWidth, 12, 'FD');

    this.doc.setFontSize(7);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(0, 0, 0);
    this.doc.text('CONDITION SCALE:', this.margin + 3, this.yPosition);

    this.doc.setFont('helvetica', 'normal');
    const legendText = CONDITION_LEGEND.map(c => `${c.value} = ${c.label}`).join('   |   ');
    this.doc.text(legendText, this.margin + 3, this.yPosition + 5);

    this.yPosition += 14;
  }

  private drawConditionBoxes(x: number, y: number): void {
    const boxSize = 5;
    const gap = 3;
    this.doc.setDrawColor(120, 120, 120);
    this.doc.setLineWidth(0.3);
    this.doc.setFontSize(7);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(80, 80, 80);

    for (let i = 1; i <= 5; i++) {
      const bx = x + (i - 1) * (boxSize + gap);
      this.doc.rect(bx, y - boxSize + 1, boxSize, boxSize);
      const numStr = String(i);
      const numWidth = this.doc.getTextWidth(numStr);
      this.doc.text(numStr, bx + (boxSize - numWidth) / 2, y - 0.5);
    }

    this.doc.setTextColor(0, 0, 0);
  }

  private parsePMChecklist(pmData: PreventativeMaintenance): PMChecklistItem[] {
    try {
      const rawData = pmData.checklist_data;
      if (typeof rawData === 'string') return JSON.parse(rawData);
      if (Array.isArray(rawData)) return rawData as unknown as PMChecklistItem[];
    } catch (error) {
      logger.error('Error parsing PM checklist data for worksheet:', error);
    }
    return [];
  }

  /**
   * Compact summary page: every item on one line with condition boxes.
   * Serves as a quick-reference checklist the technician can scan at a glance.
   */
  private generatePMSummaryPage(checklist: PMChecklistItem[]): void {
    this.doc.addPage();
    this.yPosition = 20;

    this.addSectionHeader('PM Checklist \u2014 Summary');
    this.generateConditionLegend();

    const sections = Array.from(new Set(checklist.map(item => item.section)));

    for (const section of sections) {
      this.checkPageBreak(16);
      this.doc.setFillColor(235, 235, 235);
      this.doc.rect(this.margin, this.yPosition - 3.5, this.contentWidth, 6, 'F');
      this.doc.setFontSize(9);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(0, 0, 0);
      this.doc.text(section, this.margin + 2, this.yPosition);
      this.yPosition += 5;

      const sectionItems = checklist.filter(item => item.section === section);

      for (const item of sectionItems) {
        this.checkPageBreak(10);

        this.doc.setDrawColor(120, 120, 120);
        this.doc.setLineWidth(0.3);
        this.doc.rect(this.margin + 2, this.yPosition - 3.5, 4, 4);

        this.doc.setFontSize(8);
        this.doc.setFont('helvetica', 'normal');
        this.doc.setTextColor(0, 0, 0);

        const maxTitleWidth = this.contentWidth - 55;
        const truncatedTitle = this.doc.splitTextToSize(item.title, maxTitleWidth)[0] ?? item.title;
        this.doc.text(truncatedTitle, this.margin + 8, this.yPosition);

        this.drawConditionBoxes(this.pageWidth - this.margin - 42, this.yPosition);

        this.yPosition += 6;
      }

      this.yPosition += 1;
    }
  }

  /**
   * Detail pages: each item gets a title, condition boxes, and 5 blank
   * writing lines so the technician has room for handwritten observations.
   */
  private generatePMDetailPages(checklist: PMChecklistItem[]): void {
    this.doc.addPage();
    this.yPosition = 20;

    this.addSectionHeader('PM Checklist \u2014 Detail');
    this.generateConditionLegend();

    const sections = Array.from(new Set(checklist.map(item => item.section)));
    const notesLineCount = 5;
    const itemHeight = 10 + 7 + notesLineCount * this.writeLineHeight + 4;

    for (const section of sections) {
      this.checkPageBreak(itemHeight + 8);
      this.doc.setFillColor(235, 235, 235);
      this.doc.rect(this.margin, this.yPosition - 3.5, this.contentWidth, 6, 'F');
      this.doc.setFontSize(9);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(0, 0, 0);
      this.doc.text(section, this.margin + 2, this.yPosition);
      this.yPosition += 6;

      const sectionItems = checklist.filter(item => item.section === section);

      for (const item of sectionItems) {
        this.checkPageBreak(itemHeight);

        // Checkbox + title
        this.doc.setDrawColor(120, 120, 120);
        this.doc.setLineWidth(0.3);
        this.doc.rect(this.margin + 2, this.yPosition - 3.5, 4, 4);

        this.doc.setFontSize(9);
        this.doc.setFont('helvetica', 'normal');
        this.doc.setTextColor(0, 0, 0);

        const titleLines = this.doc.splitTextToSize(item.title, this.contentWidth - 12);
        for (const titleLine of titleLines) {
          this.doc.text(titleLine, this.margin + 8, this.yPosition);
          this.yPosition += 5;
        }

        // Condition boxes
        const conditionX = this.margin + 8;
        this.doc.setFontSize(7);
        this.doc.setFont('helvetica', 'bold');
        this.doc.setTextColor(0, 0, 0);
        this.doc.text('Condition:', conditionX, this.yPosition);
        this.drawConditionBoxes(conditionX + 18, this.yPosition);
        this.yPosition += 7;

        // 5 blank writing lines
        this.addWriteLines(notesLineCount, this.margin + 8, this.contentWidth - 12);

        this.yPosition += 4;
      }

      this.yPosition += 2;
    }

    // General PM notes
    this.checkPageBreak(35);
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(0, 0, 0);
    this.doc.text('General PM Notes:', this.margin + 2, this.yPosition);
    this.yPosition += 5;
    this.addWriteLines(3, this.margin + 2, this.contentWidth - 4);
  }

  private generatePMChecklistSection(pmData: PreventativeMaintenance): void {
    const checklist = this.parsePMChecklist(pmData);

    if (checklist.length === 0) {
      this.addText('No checklist items configured.', this.margin, 10);
      return;
    }

    this.generatePMSummaryPage(checklist);
    this.generatePMDetailPages(checklist);
  }

  // ===================== FIELD NOTES (dedicated pages) =====================

  /**
   * Full dedicated page of labor entry rows (Tech / Hours / Date + Task).
   * Fills the printable area so the page is useful edge-to-edge on paper.
   */
  private generateLaborSummaryPage(): void {
    this.doc.addPage();
    this.yPosition = 20;

    this.addSectionHeader('Labor Summary');

    const rowHeight = 15;
    const availableHeight = this.pageHeight - this.yPosition;
    const rowCount = Math.floor(availableHeight / rowHeight);

    for (let i = 0; i < rowCount; i++) {
      const y = this.yPosition;
      const col1 = this.margin + 2;
      const col2 = this.margin + 60;
      const col3 = this.margin + 110;

      this.addLabeledField('Tech:', col1, col1 + 50, y);
      this.addLabeledField('Hours:', col2, col2 + 40, y);
      this.addLabeledField('Date:', col3, this.pageWidth - this.margin, y);

      this.yPosition = y + 7;
      this.addLabeledField('Task:', col1, this.pageWidth - this.margin, this.yPosition);
      this.yPosition += 8;
    }
  }

  /**
   * Full dedicated page of parts/materials rows (Part / Qty / Part#).
   * Fills the printable area so the page is useful edge-to-edge on paper.
   */
  private generatePartsMaterialsPage(): void {
    this.doc.addPage();
    this.yPosition = 20;

    this.addSectionHeader('Parts / Materials Used');

    const rowHeight = this.writeLineHeight;
    const availableHeight = this.pageHeight - this.yPosition;
    const rowCount = Math.floor(availableHeight / rowHeight);

    for (let i = 0; i < rowCount; i++) {
      const y = this.yPosition;
      const partEnd = this.margin + 95;
      const qtyEnd = this.margin + 125;

      this.addLabeledField('Part:', this.margin + 2, partEnd, y);
      this.addLabeledField('Qty:', partEnd + 3, qtyEnd, y);
      this.addLabeledField('Part#:', qtyEnd + 3, this.pageWidth - this.margin, y);

      this.yPosition = y + rowHeight;
    }
  }

  // ===================== NOTES + SIGNATURE PAGE =====================

  /**
   * Dedicated full-page notes area with a signature block anchored at the
   * bottom. The signature section includes a line above the printed name
   * (for handwritten signature), the technician's printed name, and the date.
   *
   * When a technician is assigned to the work order their display name is
   * prefilled on the "Printed Name" line; otherwise the line is left blank
   * for manual entry.
   */
  private generateNotesPage(workOrder: WorkOrderForPDF): void {
    this.doc.addPage();
    this.yPosition = 20;

    this.addSectionHeader('Notes');

    // Reserve space at the bottom for the signature block + re-entry footer.
    const signatureBlockHeight = 52;
    const availableForLines = this.pageHeight - this.yPosition - signatureBlockHeight;
    const lineCount = Math.floor(availableForLines / this.writeLineHeight);

    this.addWriteLines(lineCount, this.margin + 2, this.contentWidth - 4);

    // ── Signature block ──
    this.yPosition += 4;
    this.doc.setDrawColor(60, 60, 60);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin + 2, this.yPosition, this.pageWidth - this.margin, this.yPosition);

    this.doc.setFontSize(7);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(100, 100, 100);
    this.doc.text('Technician Signature', this.margin + 2, this.yPosition + 4);
    this.doc.setTextColor(0, 0, 0);
    this.yPosition += 10;

    const nameY = this.yPosition;
    const dateStartX = this.margin + this.contentWidth / 2 + 10;

    const assigneeName = workOrder.assigneeName ?? workOrder.assignee_name ?? null;

    if (assigneeName) {
      this.doc.setFontSize(8);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Printed Name:', this.margin + 2, nameY);
      const labelWidth = this.doc.getTextWidth('Printed Name:') + 2;
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(assigneeName, this.margin + 2 + labelWidth, nameY);
    } else {
      this.addLabeledField('Printed Name:', this.margin + 2, dateStartX - 15, nameY);
    }

    this.addLabeledField('Date:', dateStartX, this.pageWidth - this.margin, nameY);
    this.yPosition = nameY + 10;

    // Re-entry reminder
    this.doc.setDrawColor(180, 180, 180);
    this.doc.setLineWidth(0.2);
    this.doc.line(this.margin, this.yPosition, this.pageWidth - this.margin, this.yPosition);
    this.yPosition += 5;

    this.doc.setFontSize(7);
    this.doc.setFont('helvetica', 'italic');
    this.doc.setTextColor(120, 120, 120);

    const reentryY = this.yPosition;
    this.addLabeledField('Entered into EquipQR by', this.margin + 2, this.margin + 82, reentryY);
    this.addLabeledField('on', this.margin + 86, this.margin + 130, reentryY);

    this.doc.setTextColor(0, 0, 0);
  }

  // ── Repeated page chrome (header + footer QR strip) ──

  private applyPageChrome(data: WorkOrderPDFData): void {
    const totalPages = this.doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      this.doc.setPage(i);
      this.renderPageHeader(data, i, totalPages);
      this.renderFooterQRStrip(data);
    }
  }

  private renderPageHeader(data: WorkOrderPDFData, pageNum: number, totalPages: number): void {
    const { pageIdentity } = data;
    const headerY = 8;

    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(120, 120, 120);
    const pageText = `Page ${pageNum} of ${totalPages}`;
    const pageTextWidth = this.doc.getTextWidth(pageText);
    this.doc.text(pageText, this.pageWidth - this.margin - pageTextWidth, headerY);

    if (pageNum > 1 && pageIdentity) {
      const maxLabelWidth = this.pageWidth - 2 * this.margin - pageTextWidth - 10;

      this.doc.setFontSize(8);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(80, 80, 80);
      const woLabel = this.doc.splitTextToSize(pageIdentity.workOrderLabel, maxLabelWidth)[0] ?? pageIdentity.workOrderLabel;
      this.doc.text(woLabel, this.margin, headerY);

      if (pageIdentity.equipmentLabel) {
        this.doc.setFont('helvetica', 'normal');
        const eqLabel = this.doc.splitTextToSize(pageIdentity.equipmentLabel, maxLabelWidth)[0] ?? pageIdentity.equipmentLabel;
        this.doc.text(eqLabel, this.margin, headerY + 5);
      }

      this.doc.setDrawColor(200, 200, 200);
      this.doc.setLineWidth(0.3);
      const separatorY = pageIdentity.equipmentLabel ? headerY + 8 : headerY + 4;
      this.doc.line(this.margin, separatorY, this.pageWidth - this.margin, separatorY);
    }

    this.doc.setTextColor(0, 0, 0);
  }

  private renderFooterQRStrip(data: WorkOrderPDFData): void {
    const { qrCodes } = data;

    this.doc.setDrawColor(200, 200, 200);
    this.doc.setLineWidth(0.3);
    this.doc.line(this.margin, this.footerY, this.pageWidth - this.margin, this.footerY);

    const qrY = this.footerY + 3;
    const labelY = qrY + this.qrSize + 3;

    if (qrCodes?.workOrder) {
      try {
        this.doc.addImage(qrCodes.workOrder.dataUrl, 'PNG', this.margin, qrY, this.qrSize, this.qrSize);
      } catch { /* QR embed failed */ }
      this.doc.setFontSize(7);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(80, 80, 80);
      this.doc.text('Work Order', this.margin, labelY);
    }

    const eqX = this.pageWidth - this.margin - this.qrSize;
    if (qrCodes?.equipment) {
      try {
        this.doc.addImage(qrCodes.equipment.dataUrl, 'PNG', eqX, qrY, this.qrSize, this.qrSize);
      } catch { /* QR embed failed */ }
      this.doc.setFontSize(7);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(80, 80, 80);
      this.doc.text('Equipment', eqX, labelY);
    } else if (qrCodes) {
      this.doc.setFontSize(7);
      this.doc.setFont('helvetica', 'italic');
      this.doc.setTextColor(160, 160, 160);
      this.doc.text('No equipment assigned', eqX, qrY + this.qrSize / 2);
    }

    this.doc.setFontSize(7);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(150, 150, 150);
    const genText = `Generated: ${new Date().toLocaleString()}`;
    const genWidth = this.doc.getTextWidth(genText);
    this.doc.text(genText, (this.pageWidth - genWidth) / 2, qrY + this.qrSize / 2 - 3);
    this.doc.setFont('helvetica', 'italic');
    this.doc.setFontSize(6);
    const disclaimer = 'Field aid only \u2014 enter results into EquipQR';
    const disclaimerWidth = this.doc.getTextWidth(disclaimer);
    this.doc.text(disclaimer, (this.pageWidth - disclaimerWidth) / 2, qrY + this.qrSize / 2 + 3);

    this.doc.setTextColor(0, 0, 0);
  }

  // ===================== PUBLIC API =====================

  public async generateWorksheet(data: WorkOrderPDFData): Promise<jsPDF> {
    const { workOrder, equipment, organizationName, pmData } = data;

    // Pre-load branding images (fail silently — text-only fallback)
    const [orgLogo, teamImage] = await Promise.all([
      data.organizationLogoUrl ? this.preloadImage(data.organizationLogoUrl) : Promise.resolve(null),
      data.teamImageUrl ? this.preloadImage(data.teamImageUrl) : Promise.resolve(null),
    ]);

    // Page 1 — cover
    this.generateHeader(workOrder, organizationName, orgLogo, teamImage);
    this.generateDetailsSection(workOrder);

    if (equipment) {
      this.generateEquipmentSection(equipment);
    }

    this.generateDescriptionSection(workOrder.description);

    // PM Checklist — summary page then detail pages
    if (pmData && workOrder.has_pm) {
      this.generatePMChecklistSection(pmData);
    }

    // Dedicated pages for labor and parts
    this.generateLaborSummaryPage();
    this.generatePartsMaterialsPage();

    // Final page — blank ruled lines + signature
    this.generateNotesPage(workOrder);
    this.applyPageChrome(data);

    return this.doc;
  }

  public static async generateAndDownload(data: WorkOrderPDFData): Promise<void> {
    try {
      const generator = await WorkOrderFieldWorksheetPDFGenerator.create();
      const pdf = await generator.generateWorksheet(data);

      const safeTitle = data.workOrder.title
        .replace(/[^a-z0-9]/gi, '-')
        .replace(/-+/g, '-')
        .slice(0, 50);
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `FieldWorksheet-${safeTitle}-${dateStr}.pdf`;

      pdf.save(filename);
    } catch (error) {
      logger.error('Error generating field worksheet PDF:', error);
      throw error;
    }
  }
}

export const generateFieldWorksheetPDF = WorkOrderFieldWorksheetPDFGenerator.generateAndDownload;
