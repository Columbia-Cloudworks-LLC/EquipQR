// fallow-ignore-file code-duplication
// Duplication rationale: PDF report shares checklist row metadata with inline UI
// jsPDF is loaded dynamically to reduce initial bundle size (~150KB)
// It's only needed when a user explicitly triggers a PDF export
import type jsPDF from 'jspdf';
import { logger } from '@/utils/logger';
import { formatStatus, formatPriority } from '@/features/work-orders/utils/workOrderHelpers';
import { buildWorkOrderReportPdfFilename } from '@/features/work-orders/utils/workOrderReportPdfFilename';
import type { UserSettings } from '@/types/settings';
import {
  formatDate as formatDateTz,
  formatDateTime as formatDateTimeTz,
} from '@/utils/dateFormatter';
import type { WorkOrderNote } from '@/features/work-orders/services/workOrderNotesService';
import type { WorkOrderCost } from '@/features/work-orders/types/workOrderCosts';
import type { PMChecklistItem, PreventativeMaintenance } from '@/features/pm-templates/services/preventativeMaintenanceService';
import type { QRAsset } from '@/utils/qr';
import {
  applyWorkOrderPdfPageChrome,
  formatWorkOrderIdForPdf,
  type WorkOrderPdfPageLayout,
} from './workOrderPdfChrome';
import { WorkOrderPdfTextLayout } from './workOrderPdfTextLayout';

export type WorkOrderExportDateSettings = Pick<UserSettings, 'timezone' | 'dateFormat'>;

/**
 * Flexible work order type that works with both WorkOrder and WorkOrderData
 */
export interface WorkOrderForPDF {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_date: string;
  due_date?: string | null;
  completed_date?: string | null;
  estimated_hours?: number | null;
  assigneeName?: string;
  assignee_name?: string | null;
  teamName?: string;
  has_pm?: boolean;
}

/**
 * Flexible equipment type for PDF generation
 */
export interface EquipmentForPDF {
  id: string;
  name: string;
  manufacturer?: string | null;
  model?: string | null;
  serial_number?: string | null;
  status: string;
  location?: string | null;
  customerId?: string | null;
  customerName?: string | null;
}

/** Pre-rendered QR assets for embedding in PDF page chrome */
export interface WorkOrderPDFQRCodes {
  workOrder: QRAsset;
  equipment?: QRAsset;
}

/** Repeated per-page identity strings derived once by the hook */
export interface WorkOrderPDFPageIdentity {
  workOrderLabel: string;
  equipmentLabel?: string;
}

export interface WorkOrderPDFData {
  workOrder: WorkOrderForPDF;
  equipment?: EquipmentForPDF | null;
  organizationName?: string;
  notes?: WorkOrderNote[];
  costs?: WorkOrderCost[];
  pmData?: PreventativeMaintenance | null;
  /** Include cost items in the PDF (default: false for customer-facing docs) */
  includeCosts?: boolean;
  /** Organization logo URL for printed worksheet branding */
  organizationLogoUrl?: string | null;
  /** Team image URL for printed worksheet branding */
  teamImageUrl?: string | null;
  /** Pre-rendered QR code assets for repeated page footers */
  qrCodes?: WorkOrderPDFQRCodes;
  /** Identifying labels for repeated page headers */
  pageIdentity?: WorkOrderPDFPageIdentity;
  exportDateSettings: WorkOrderExportDateSettings;
}

/** Milliseconds in one day - used for date delta calculations */
const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Work Order Report PDF Generator
 * Generates comprehensive PDF reports for work orders including all details,
 * notes, costs, and PM checklist data.
 */
export class WorkOrderReportPDFGenerator {
  private doc!: jsPDF;
  private textLayout!: WorkOrderPdfTextLayout;
  private readonly lineHeight = 6;
  private readonly pageHeight = 252;
  private readonly margin = 20;
  private readonly pageWidth = 210; // A4 width in mm
  private readonly footerY = 255;
  private readonly qrSize = 20;
  private exportDateSettings!: WorkOrderExportDateSettings;

  private pdfFormatDate(date: string | null | undefined): string {
    if (!date) return '—';
    return formatDateTz(date, this.exportDateSettings as UserSettings);
  }

  private pdfFormatDateTime(date: string | null | undefined): string {
    if (!date) return '—';
    return formatDateTimeTz(date, this.exportDateSettings as UserSettings);
  }

  /**
   * Use the static create() method instead of calling the constructor directly.
   * jsPDF is loaded dynamically to reduce initial bundle size.
   */
  private constructor() {
    // doc is initialized in init()
  }

  private async init(): Promise<void> {
    const { default: jsPDF } = await import('jspdf');
    this.doc = new jsPDF();
    this.textLayout = new WorkOrderPdfTextLayout(this.doc, {
      margin: this.margin,
      pageHeight: this.pageHeight,
      lineHeight: this.lineHeight,
      pageWidth: this.pageWidth,
      defaultMultilineMaxWidth: 170,
    });
  }

  static async create(): Promise<WorkOrderReportPDFGenerator> {
    const instance = new WorkOrderReportPDFGenerator();
    await instance.init();
    return instance;
  }

  /**
   * Add a horizontal separator line
   */
  private addSeparator(): void {
    this.textLayout.yPosition += 3;
    this.textLayout.checkPageBreak(10);
    this.doc.setDrawColor(200, 200, 200);
    this.doc.line(this.margin, this.textLayout.yPosition, this.pageWidth - this.margin, this.textLayout.yPosition);
    this.textLayout.yPosition += 6;
  }

  /**
   * Add section header
   */
  private addSectionHeader(title: string): void {
    this.textLayout.checkPageBreak(15);
    this.textLayout.yPosition += 2;
    this.textLayout.addText(title.toUpperCase(), this.margin, 11, 'bold');
    this.textLayout.yPosition += 2;
  }

  /**
   * Format currency value from cents
   */
  private formatCurrency(cents: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100);
  }

  /**
   * Get condition text from numeric value
   */
  private getConditionText(condition: number | null | undefined): string {
    if (condition === null || condition === undefined) return 'Not Rated';
    switch (condition) {
      case 1: return 'OK';
      case 2: return 'Adjusted';
      case 3: return 'Recommend Repairs';
      case 4: return 'Requires Immediate Repairs';
      case 5: return 'Unsafe Condition Present';
      default: return 'Unknown';
    }
  }

  /**
   * Calculate days difference between two dates
   */
  private calculateDaysDelta(fromDate: string, toDate: string | null | undefined): number | null {
    if (!toDate) return null;
    try {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      const diffMs = to.getTime() - from.getTime();
      return Math.round(diffMs / MS_PER_DAY);
    } catch (error) {
      logger.warn('Failed to calculate days delta for work order dates', {
        fromDate,
        toDate,
        error,
      });
      return null;
    }
  }

  private getPageLayout(): WorkOrderPdfPageLayout {
    return {
      margin: this.margin,
      pageWidth: this.pageWidth,
      footerY: this.footerY,
      qrSize: this.qrSize,
    };
  }

  /**
   * Generate the PDF header section
   */
  private generateHeader(workOrder: WorkOrderForPDF, organizationName?: string): void {
    // Organization name (centered)
    if (organizationName) {
      this.doc.setFontSize(14);
      this.doc.setFont('helvetica', 'bold');
      const orgWidth = this.doc.getTextWidth(organizationName);
      this.doc.text(organizationName, (this.pageWidth - orgWidth) / 2, this.textLayout.yPosition);
      this.textLayout.yPosition += 8;
    }

    // Work Order Title (centered)
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    const title = `Work Order: ${workOrder.title}`;
    const titleWidth = this.doc.getTextWidth(title);
    this.doc.text(title, (this.pageWidth - titleWidth) / 2, this.textLayout.yPosition);
    this.textLayout.yPosition += 8;

    // ID and Status line (first4...last4 format)
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    const statusLine = `ID: ${formatWorkOrderIdForPdf(workOrder.id)} | Status: ${formatStatus(workOrder.status)}`;
    const statusWidth = this.doc.getTextWidth(statusLine);
    this.doc.text(statusLine, (this.pageWidth - statusWidth) / 2, this.textLayout.yPosition);
    this.textLayout.yPosition += 6;

    this.addSeparator();
  }

  /**
   * Generate work order details section
   * Order: Created, Priority, Due (with delta), Completed (with delta)
   */
  private generateDetailsSection(workOrder: WorkOrderForPDF): void {
    this.addSectionHeader('Details');

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');

    // Created date
    this.textLayout.addText(`Created: ${this.pdfFormatDate(workOrder.created_date)}`, this.margin, 10);

    // Priority
    this.textLayout.addText(`Priority: ${formatPriority(workOrder.priority)}`, this.margin, 10);

    // Due date with delta from created
    const dueDelta = this.calculateDaysDelta(workOrder.created_date, workOrder.due_date);
    const dueDeltaStr = dueDelta !== null ? ` (${dueDelta} days from created)` : '';
    this.textLayout.addText(`Due: ${this.pdfFormatDate(workOrder.due_date)}${dueDeltaStr}`, this.margin, 10);

    // Completed date with delta from created (if completed)
    if (workOrder.completed_date) {
      const completedDelta = this.calculateDaysDelta(workOrder.created_date, workOrder.completed_date);
      const completedDeltaStr = completedDelta !== null ? ` (${completedDelta} days from created)` : '';
      this.textLayout.addText(`Completed: ${this.pdfFormatDate(workOrder.completed_date)}${completedDeltaStr}`, this.margin, 10);
    }

    this.addSeparator();
  }

  /**
   * Generate equipment section
   */
  private generateEquipmentSection(equipment: EquipmentForPDF): void {
    this.addSectionHeader('Equipment');

    this.textLayout.addText(`${equipment.name} - ${equipment.status}`, this.margin, 11, 'bold');
    
    const details: string[] = [];
    if (equipment.manufacturer) details.push(`Mfr: ${equipment.manufacturer}`);
    if (equipment.model) details.push(`Model: ${equipment.model}`);
    const serialNumber = equipment.serial_number;
    if (serialNumber) details.push(`S/N: ${serialNumber}`);
    
    if (details.length > 0) {
      this.textLayout.addText(details.join(' | '), this.margin, 10);
    }

    if (equipment.location) {
      this.textLayout.addText(`Location: ${equipment.location}`, this.margin, 10);
    }
    if (equipment.customerName) {
      this.textLayout.addText(`Customer: ${equipment.customerName}`, this.margin, 10);
    }

    this.addSeparator();
  }

  /**
   * Generate service team and assignment section (customer-facing document)
   * Note: teamName represents the internal service team responsible for the work order,
   * not the customer. The customer is the organization that owns the equipment.
   */
  private generateAssignmentSection(workOrder: WorkOrderForPDF): void {
    const teamName = workOrder.teamName || 'Unassigned';
    const assigneeName = workOrder.assigneeName || workOrder.assignee_name || 'Unassigned';

    // "Serviced By" label - this is the team performing the work, not the customer
    this.textLayout.addText(`Serviced By: ${teamName}`, this.margin, 10, 'bold');
    this.textLayout.addText(`Assigned To: ${assigneeName}`, this.margin, 10);

    this.addSeparator();
  }

  /**
   * Generate description section
   */
  private generateDescriptionSection(description: string): void {
    this.addSectionHeader('Description');
    this.textLayout.addMultilineText(description || 'No description provided.', this.margin, 170, 10);
    this.addSeparator();
  }

  /**
   * Generate notes section (customer-facing: public notes only, chronological order)
   * Notes with images get full-page treatment with the note text repeated on each photo page.
   * Notes without images are rendered in-flow within this section and can share pages with each other.
   * (The notes section itself is started on a new page by the caller.)
   * 
   * Note: This method always filters to public notes only for customer-facing PDFs.
   * Private notes are never included regardless of user permissions.
   * 
   * Performance: Images are pre-fetched in parallel before sequential PDF rendering
   * to improve performance for work orders with many images.
   */
  private async generateNotesSection(notes: WorkOrderNote[]): Promise<void> {
    // For customer-facing PDF, always filter to public notes only
    const publicNotes = notes.filter(note => !note.is_private);

    if (publicNotes.length === 0) {
      return;
    }

    // Sort chronologically (oldest first)
    const sortedNotes = [...publicNotes].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    // Collect all image URLs from notes for parallel pre-fetching
    const allImageUrls: string[] = [];
    for (const note of sortedNotes) {
      if (note.images && note.images.length > 0) {
        for (const image of note.images) {
          allImageUrls.push(image.file_url);
        }
      }
    }

    // Pre-fetch all images in parallel for better performance
    const imageCache = await this.prefetchImages(allImageUrls);

    this.addSectionHeader('Public Work Order Notes');

    for (const note of sortedNotes) {
      const dateStr = this.pdfFormatDateTime(note.created_at);
      const author = note.author_name || 'Unknown';
      const hasImages = note.images && note.images.length > 0;

      if (hasImages && note.images) {
        // Notes with images: each image gets its own full page with the note text
        // Images are already cached from parallel pre-fetch
        for (const image of note.images) {
          this.addNewPage();
          await this.generateNoteWithImagePage(note, image, dateStr, author, imageCache);
        }
      } else {
        // Notes without images: render in-flow (can share pages)
        this.textLayout.checkPageBreak(30);
        this.generateNoteText(note, dateStr, author);
        this.textLayout.yPosition += 6;
      }
    }

    this.addSeparator();
  }

  /**
   * Pre-fetch all images in parallel and return a cache map.
   * This improves performance for work orders with many images by
   * fetching all images concurrently instead of sequentially.
   */
  private async prefetchImages(imageUrls: string[]): Promise<Map<string, { data: string; format: 'JPEG' | 'PNG' } | null>> {
    const cache = new Map<string, { data: string; format: 'JPEG' | 'PNG' } | null>();
    
    if (imageUrls.length === 0) {
      return cache;
    }

    // Fetch all images in parallel
    const results = await Promise.all(
      imageUrls.map(async (url) => {
        const imageData = await this.fetchImageAsBase64(url);
        return { url, imageData };
      })
    );

    // Populate cache with results
    for (const { url, imageData } of results) {
      cache.set(url, imageData);
    }

    return cache;
  }

  /**
   * Generate a full-page layout for a note with an image
   * @param imageCache Optional pre-fetched image cache for performance
   */
  private async generateNoteWithImagePage(
    note: WorkOrderNote, 
    image: { file_url: string; file_name: string }, 
    dateStr: string, 
    author: string,
    imageCache?: Map<string, { data: string; format: 'JPEG' | 'PNG' } | null>
  ): Promise<void> {
    // Note header
    this.textLayout.addText(`${dateStr} - ${author}`, this.margin, 9, 'bold');
    
    // Note content
    this.textLayout.addMultilineText(note.content, this.margin, 170, 9);
    
    // Hours worked if available
    if (note.hours_worked && note.hours_worked > 0) {
      this.textLayout.addText(`Hours worked: ${note.hours_worked}`, this.margin, 8);
    }
    
    this.textLayout.yPosition += 6;
    
    // Embed the actual image (using cache if available)
    await this.addEmbeddedImage(image.file_url, image.file_name, imageCache);
  }

  /**
   * Fetch an image and convert to base64 for embedding in PDF.
   * 
   * Note: jsPDF natively supports only JPEG (including both .jpg and .jpeg file extensions,
   * which are the same format) and PNG formats.
   * Other formats such as WebP, GIF, SVG, BMP, and TIFF are not supported and will be skipped.
   */
  private async fetchImageAsBase64(imageUrl: string): Promise<{ data: string; format: 'JPEG' | 'PNG' } | null> {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        logger.warn(`Failed to fetch image: ${response.status} ${response.statusText}`);
        return null;
      }
      
      const blob = await response.blob();
      const contentType = blob.type.toLowerCase();
      
      // Check for empty or malformed content type first
      if (!contentType || contentType.trim() === '') {
        logger.warn('Skipping image with empty or missing content type. Only JPEG and PNG are supported.');
        return null;
      }
      
      // Determine format - jsPDF only supports JPEG and PNG
      let format: 'JPEG' | 'PNG';
      if (contentType.includes('png')) {
        format = 'PNG';
      } else if (contentType.includes('jpeg') || contentType.includes('jpg')) {
        format = 'JPEG';
      } else {
        // Unsupported formats: WebP, GIF, SVG, BMP, TIFF, etc.
        // Log warning and skip - jsPDF cannot embed these formats natively
        const formatName = contentType.replace('image/', '').toUpperCase() || 'unknown';
        logger.warn(`Skipping unsupported image format for PDF: ${formatName}. Only JPEG and PNG are supported.`);
        return null;
      }
      
      // Convert to base64
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve({ data: base64, format });
        };
        reader.onerror = () => {
          logger.warn('Failed to convert image to base64');
          resolve(null);
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      logger.warn('Error fetching image for PDF:', error);
      return null;
    }
  }

  /**
   * Add an embedded image scaled to fit available page space.
   * On any error (fetch, decode, or embed), falls back to a placeholder box.
   * @param imageCache Optional pre-fetched image cache for performance
   */
  private async addEmbeddedImage(
    imageUrl: string, 
    fileName: string,
    imageCache?: Map<string, { data: string; format: 'JPEG' | 'PNG' } | null>
  ): Promise<void> {
    const availableHeight = this.pageHeight - this.textLayout.yPosition - 20;
    const availableWidth = this.pageWidth - (2 * this.margin);
    const maxImageHeight = Math.min(availableHeight, 180);
    
    // Try to get image from cache first, otherwise fetch it
    let imageData: { data: string; format: 'JPEG' | 'PNG' } | null | undefined;
    if (imageCache && imageCache.has(imageUrl)) {
      imageData = imageCache.get(imageUrl);
    } else {
      imageData = await this.fetchImageAsBase64(imageUrl);
    }
    
    if (imageData) {
      // Wrap image loading and embedding in try-catch to ensure fallback on any error
      // This catches: Image decode errors, dimension calculation issues, and jsPDF embed errors
      try {
        // Create a temporary image to get dimensions
        const img = new Image();
        
        // Load image and wait for dimensions - rejection caught by outer try-catch
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Failed to decode image data'));
          img.src = imageData.data;
        });
        
        // Calculate scaled dimensions to fit within available space
        const aspectRatio = img.width / img.height;
        let imgWidth = availableWidth;
        let imgHeight = imgWidth / aspectRatio;
        
        if (imgHeight > maxImageHeight) {
          imgHeight = maxImageHeight;
          imgWidth = imgHeight * aspectRatio;
        }
        
        // Center the image horizontally
        const xOffset = this.margin + (availableWidth - imgWidth) / 2;
        
        // Add the image to the PDF
        this.doc.addImage(imageData.data, imageData.format, xOffset, this.textLayout.yPosition, imgWidth, imgHeight);
        this.textLayout.yPosition += imgHeight + 10;
        
        // Add filename caption below image
        this.doc.setFontSize(8);
        this.doc.setFont('helvetica', 'italic');
        this.doc.setTextColor(100, 100, 100);
        this.doc.text(fileName, this.margin, this.textLayout.yPosition);
        this.doc.setTextColor(0, 0, 0);
        this.textLayout.yPosition += 6;
        
        return;
      } catch (error) {
        // Any error in image loading/embedding falls through to placeholder
        logger.warn('Error embedding image in PDF, using placeholder:', error);
      }
    }
    
    // Fallback: Draw a bordered box with image reference
    this.doc.setDrawColor(150, 150, 150);
    this.doc.setLineWidth(0.5);
    this.doc.rect(this.margin, this.textLayout.yPosition, availableWidth, 40);
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Photo: ${fileName}`, this.margin + 5, this.textLayout.yPosition + 15);
    this.doc.setFontSize(8);
    this.doc.setTextColor(100, 100, 100);
    this.doc.text('(Image could not be loaded)', this.margin + 5, this.textLayout.yPosition + 25);
    this.doc.setTextColor(0, 0, 0);
    
    this.textLayout.yPosition += 50;
  }

  /**
   * Generate note text (without full-page image treatment)
   */
  private generateNoteText(note: WorkOrderNote, dateStr: string, author: string): void {
    // Note header
    this.textLayout.addText(`${dateStr} - ${author}`, this.margin, 9, 'bold');
    
    // Note content
    this.textLayout.addMultilineText(note.content, this.margin + 5, 165, 9);
    
    // Hours worked if available
    if (note.hours_worked && note.hours_worked > 0) {
      this.textLayout.addText(`Hours worked: ${note.hours_worked}`, this.margin + 5, 8);
    }
  }

  /**
   * Generate costs section
   */
  private generateCostsSection(costs: WorkOrderCost[]): void {
    if (costs.length === 0) {
      return;
    }

    this.addSectionHeader('Itemized Costs');

    let totalCents = 0;

    for (const cost of costs) {
      this.textLayout.checkPageBreak(15);
      
      const unitPrice = this.formatCurrency(cost.unit_price_cents);
      const totalPrice = this.formatCurrency(cost.total_price_cents);
      
      // Cost line: Description x Qty @ Price = Total
      const costLine = `${cost.description} x${cost.quantity} @ ${unitPrice} = ${totalPrice}`;
      this.textLayout.addText(costLine, this.margin, 10);
      
      totalCents += cost.total_price_cents;
    }

    // Total line
    this.textLayout.yPosition += 3;
    this.doc.setFont('helvetica', 'bold');
    this.textLayout.addText(`TOTAL: ${this.formatCurrency(totalCents)}`, this.margin, 11, 'bold');

    this.addSeparator();
  }

  /**
   * Generate PM checklist section
   */
  private generatePMChecklistSection(pmData: PreventativeMaintenance): void {
    this.addSectionHeader('PM Checklist');

    // PM Status
    const pmStatus = pmData.status.replace(/_/g, ' ').toUpperCase();
    this.textLayout.addText(`Status: ${pmStatus}`, this.margin, 10, 'bold');
    
    if (pmData.completed_at) {
      this.textLayout.addText(`Completed: ${this.pdfFormatDateTime(pmData.completed_at)}`, this.margin, 9);
    }
    this.textLayout.yPosition += 3;

    // Parse checklist data
    let checklist: PMChecklistItem[] = [];
    try {
      const rawData = pmData.checklist_data;
      if (typeof rawData === 'string') {
        checklist = JSON.parse(rawData);
      } else if (Array.isArray(rawData)) {
        checklist = rawData as unknown as PMChecklistItem[];
      }
    } catch (error) {
      logger.error('Error parsing PM checklist data:', error);
      this.textLayout.addText('Unable to parse checklist data.', this.margin, 10);
      return;
    }

    if (checklist.length === 0) {
      this.textLayout.addText('No checklist items.', this.margin, 10);
      return;
    }

    // Group items by section
    const sections = Array.from(new Set(checklist.map(item => item.section)));

    for (const section of sections) {
      this.textLayout.checkPageBreak(15);
      this.textLayout.addText(section, this.margin, 10, 'bold');
      
      const sectionItems = checklist.filter(item => item.section === section);
      
      for (const item of sectionItems) {
        this.textLayout.checkPageBreak(12);
        
        const hasCondition = item.condition !== null && item.condition !== undefined;
        const checkmark = hasCondition ? '☑' : '☐';
        const conditionText = this.getConditionText(item.condition);
        
        // Item line: [X] Title - Condition
        const itemLine = `${checkmark} ${item.title} - ${conditionText}`;
        this.textLayout.addText(itemLine, this.margin + 5, 9);
        
        // Notes if available
        if (item.notes) {
          this.textLayout.addMultilineText(`Notes: ${item.notes}`, this.margin + 10, 155, 8);
        }
      }
      
      this.textLayout.yPosition += 2;
    }

    // General PM notes
    if (pmData.notes) {
      this.textLayout.checkPageBreak(15);
      this.textLayout.addText('General Notes:', this.margin, 10, 'bold');
      this.textLayout.addMultilineText(pmData.notes, this.margin, 170, 9);
    }

    this.addSeparator();
  }

  /**
   * Force a new page
   */
  private addNewPage(): void {
    this.doc.addPage();
    this.textLayout.yPosition = 20;
  }

  /**
   * Generate the complete PDF
   * 
   * Section order (customer-facing):
   * 1. Organization (header)
   * 2. Work Order: Title
   * 3. ID: {first4}...{last4} | Status
   * 4. Details (Created, Priority, Due with delta, Completed with delta)
   * 5. Equipment (if present)
   * 6. Service Team + Assignment
   * 7. Description
   * 8. NEW PAGE: PM Checklist (if present)
   * 9. NEW PAGE: Public Work Order Notes
   * 10. Costs (only if includeCosts is true)
   */
  public async generatePDF(data: WorkOrderPDFData): Promise<jsPDF> {
    const {
      workOrder,
      equipment,
      organizationName,
      notes = [],
      costs = [],
      pmData,
      includeCosts = false,
      exportDateSettings,
    } = data;

    this.exportDateSettings = exportDateSettings;

    // Page 1: Header, Details, Equipment, Customer/Assignment, Description
    this.generateHeader(workOrder, organizationName);
    this.generateDetailsSection(workOrder);
    
    if (equipment) {
      this.generateEquipmentSection(equipment);
    }
    
    this.generateAssignmentSection(workOrder);
    this.generateDescriptionSection(workOrder.description);
    
    // Page 2+: PM Checklist (always starts on a new page)
    if (pmData && workOrder.has_pm) {
      this.addNewPage();
      this.generatePMChecklistSection(pmData);
    }
    
    // Next Page: Notes (always starts on a new page after PM or description)
    if (notes.length > 0) {
      this.addNewPage();
      await this.generateNotesSection(notes);
    }
    
    // Costs section (only if explicitly included - not shown by default for customer-facing docs)
    if (includeCosts && costs.length > 0) {
      this.generateCostsSection(costs);
    }
    
    applyWorkOrderPdfPageChrome(this.doc, this.getPageLayout(), data, 'report');

    return this.doc;
  }

  /**
   * Generate and download the PDF
   */
  public static async generateAndDownload(data: WorkOrderPDFData): Promise<void> {
    try {
      const generator = await WorkOrderReportPDFGenerator.create();
      const pdf = await generator.generatePDF(data);
      
      const filename = buildWorkOrderReportPdfFilename(data.workOrder.title);
      pdf.save(filename);
    } catch (error) {
      logger.error('Error generating work order PDF:', error);
      throw error;
    }
  }

  /**
   * Generate the PDF and return it as a Blob with a suggested filename.
   * Useful for uploading to cloud storage (e.g., Google Drive) instead of downloading.
   */
  public static async generateAndGetBlob(data: WorkOrderPDFData): Promise<{ blob: Blob; filename: string }> {
    try {
      const generator = await WorkOrderReportPDFGenerator.create();
      const pdf = await generator.generatePDF(data);
      
      const filename = buildWorkOrderReportPdfFilename(data.workOrder.title);

      // Get the PDF as a Blob
      const blob = pdf.output('blob');
      
      return { blob, filename };
    } catch (error) {
      logger.error('Error generating work order PDF blob:', error);
      throw error;
    }
  }
}

/**
 * Convenience function to generate and download a work order PDF
 */
export const generateWorkOrderPDF = WorkOrderReportPDFGenerator.generateAndDownload;

/**
 * Convenience function to generate a work order PDF and return it as a Blob
 */
export const generateWorkOrderPDFBlob = WorkOrderReportPDFGenerator.generateAndGetBlob;
