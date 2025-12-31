import jsPDF from 'jspdf';
import { logger } from '@/utils/logger';
import { formatStatus, formatPriority, formatDate, formatDateTime } from '@/features/work-orders/utils/workOrderHelpers';
import type { WorkOrderNote } from '@/features/work-orders/services/workOrderNotesService';
import type { WorkOrderCost } from '@/features/work-orders/types/workOrderCosts';
import type { PMChecklistItem, PreventativeMaintenance } from '@/features/pm-templates/services/preventativeMaintenanceService';

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
  serialNumber?: string | null;
  status: string;
  location?: string | null;
}

export interface WorkOrderPDFData {
  workOrder: WorkOrderForPDF;
  equipment?: EquipmentForPDF | null;
  organizationName?: string;
  notes?: WorkOrderNote[];
  costs?: WorkOrderCost[];
  pmData?: PreventativeMaintenance | null;
  showPrivateNotes?: boolean;
}

/**
 * Work Order Report PDF Generator
 * Generates comprehensive PDF reports for work orders including all details,
 * notes, costs, and PM checklist data.
 */
export class WorkOrderReportPDFGenerator {
  private doc: jsPDF;
  private yPosition: number = 20;
  private readonly lineHeight = 6;
  private readonly pageHeight = 280;
  private readonly margin = 20;
  private readonly pageWidth = 210; // A4 width in mm

  constructor() {
    this.doc = new jsPDF();
  }

  /**
   * Check and handle page break if needed
   */
  private checkPageBreak(requiredSpace: number = 20): void {
    if (this.yPosition + requiredSpace > this.pageHeight) {
      this.doc.addPage();
      this.yPosition = 20;
    }
  }

  /**
   * Add text with optional styling
   */
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

  /**
   * Add multi-line text with word wrapping
   */
  private addMultilineText(
    text: string,
    x: number = this.margin,
    maxWidth: number = 170,
    fontSize: number = 10
  ): void {
    this.doc.setFontSize(fontSize);
    const lines = this.doc.splitTextToSize(text, maxWidth);

    for (const line of lines) {
      this.checkPageBreak();
      this.doc.text(line, x, this.yPosition);
      this.yPosition += this.lineHeight;
    }
  }

  /**
   * Add a horizontal separator line
   */
  private addSeparator(): void {
    this.yPosition += 3;
    this.checkPageBreak(10);
    this.doc.setDrawColor(200, 200, 200);
    this.doc.line(this.margin, this.yPosition, this.pageWidth - this.margin, this.yPosition);
    this.yPosition += 6;
  }

  /**
   * Add section header
   */
  private addSectionHeader(title: string): void {
    this.checkPageBreak(15);
    this.yPosition += 2;
    this.addText(title.toUpperCase(), this.margin, 11, 'bold');
    this.yPosition += 2;
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
   * Generate the PDF header section
   */
  private generateHeader(workOrder: WorkOrder, organizationName?: string): void {
    // Organization name (centered)
    if (organizationName) {
      this.doc.setFontSize(14);
      this.doc.setFont('helvetica', 'bold');
      const orgWidth = this.doc.getTextWidth(organizationName);
      this.doc.text(organizationName, (this.pageWidth - orgWidth) / 2, this.yPosition);
      this.yPosition += 8;
    }

    // Work Order Title (centered)
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    const title = `Work Order: ${workOrder.title}`;
    const titleWidth = this.doc.getTextWidth(title);
    this.doc.text(title, (this.pageWidth - titleWidth) / 2, this.yPosition);
    this.yPosition += 8;

    // ID and Status line
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    const statusLine = `ID: ${workOrder.id.slice(0, 8)}... | Status: ${formatStatus(workOrder.status)}`;
    const statusWidth = this.doc.getTextWidth(statusLine);
    this.doc.text(statusLine, (this.pageWidth - statusWidth) / 2, this.yPosition);
    this.yPosition += 6;

    this.addSeparator();
  }

  /**
   * Generate work order details section
   */
  private generateDetailsSection(workOrder: WorkOrder): void {
    this.addSectionHeader('Details');

    // Priority and dates on same line
    const priority = `Priority: ${formatPriority(workOrder.priority)}`;
    const created = `Created: ${formatDate(workOrder.created_date)}`;
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(priority, this.margin, this.yPosition);
    this.doc.text(created, this.margin + 70, this.yPosition);
    this.yPosition += this.lineHeight;

    // Due date and completed date
    const due = `Due: ${formatDate(workOrder.due_date)}`;
    const completed = workOrder.completed_date 
      ? `Completed: ${formatDate(workOrder.completed_date)}`
      : '';
    
    this.doc.text(due, this.margin, this.yPosition);
    if (completed) {
      this.doc.text(completed, this.margin + 70, this.yPosition);
    }
    this.yPosition += this.lineHeight;

    // Estimated hours if available
    if (workOrder.estimated_hours) {
      this.addText(`Estimated Hours: ${workOrder.estimated_hours}`, this.margin, 10);
    }

    this.addSeparator();
  }

  /**
   * Generate equipment section
   */
  private generateEquipmentSection(equipment: EquipmentForPDF): void {
    this.addSectionHeader('Equipment');

    this.addText(`${equipment.name} - ${equipment.status}`, this.margin, 11, 'bold');
    
    const details: string[] = [];
    if (equipment.manufacturer) details.push(`Mfr: ${equipment.manufacturer}`);
    if (equipment.model) details.push(`Model: ${equipment.model}`);
    // Handle both serial_number and serialNumber
    const serialNumber = equipment.serial_number || equipment.serialNumber;
    if (serialNumber) details.push(`S/N: ${serialNumber}`);
    
    if (details.length > 0) {
      this.addText(details.join(' | '), this.margin, 10);
    }

    if (equipment.location) {
      this.addText(`Location: ${equipment.location}`, this.margin, 10);
    }

    this.addSeparator();
  }

  /**
   * Generate team and assignment section
   */
  private generateAssignmentSection(workOrder: WorkOrder): void {
    const teamName = workOrder.teamName || 'Unassigned';
    const assigneeName = workOrder.assigneeName || workOrder.assignee_name || 'Unassigned';

    this.addSectionHeader('Team & Assignment');
    this.addText(`Team: ${teamName}`, this.margin, 10);
    this.addText(`Assigned To: ${assigneeName}`, this.margin, 10);

    this.addSeparator();
  }

  /**
   * Generate description section
   */
  private generateDescriptionSection(description: string): void {
    this.addSectionHeader('Description');
    this.addMultilineText(description || 'No description provided.', this.margin, 170, 10);
    this.addSeparator();
  }

  /**
   * Generate notes section
   */
  private generateNotesSection(notes: WorkOrderNote[], showPrivateNotes: boolean): void {
    // Filter notes based on privacy settings
    const visibleNotes = showPrivateNotes 
      ? notes 
      : notes.filter(note => !note.is_private);

    if (visibleNotes.length === 0) {
      return;
    }

    this.addSectionHeader('Notes');

    for (const note of visibleNotes) {
      this.checkPageBreak(20);
      
      // Note header: date and author
      const dateStr = formatDateTime(note.created_at);
      const author = note.author_name || 'Unknown';
      const privateTag = note.is_private ? ' [Private]' : '';
      
      this.addText(`${dateStr} - ${author}${privateTag}`, this.margin, 9, 'bold');
      
      // Note content
      this.addMultilineText(note.content, this.margin + 5, 165, 9);
      
      // Hours worked if available
      if (note.hours_worked && note.hours_worked > 0) {
        this.addText(`Hours worked: ${note.hours_worked}`, this.margin + 5, 8);
      }
      
      this.yPosition += 3;
    }

    this.addSeparator();
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
      this.checkPageBreak(15);
      
      const unitPrice = this.formatCurrency(cost.unit_price_cents);
      const totalPrice = this.formatCurrency(cost.total_price_cents);
      
      // Cost line: Description x Qty @ Price = Total
      const costLine = `${cost.description} x${cost.quantity} @ ${unitPrice} = ${totalPrice}`;
      this.addText(costLine, this.margin, 10);
      
      totalCents += cost.total_price_cents;
    }

    // Total line
    this.yPosition += 3;
    this.doc.setFont('helvetica', 'bold');
    this.addText(`TOTAL: ${this.formatCurrency(totalCents)}`, this.margin, 11, 'bold');

    this.addSeparator();
  }

  /**
   * Generate PM checklist section
   */
  private generatePMChecklistSection(pmData: PreventativeMaintenance): void {
    this.addSectionHeader('PM Checklist');

    // PM Status
    const pmStatus = pmData.status.replace(/_/g, ' ').toUpperCase();
    this.addText(`Status: ${pmStatus}`, this.margin, 10, 'bold');
    
    if (pmData.completed_at) {
      this.addText(`Completed: ${formatDateTime(pmData.completed_at)}`, this.margin, 9);
    }
    this.yPosition += 3;

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
      this.addText('Unable to parse checklist data.', this.margin, 10);
      return;
    }

    if (checklist.length === 0) {
      this.addText('No checklist items.', this.margin, 10);
      return;
    }

    // Group items by section
    const sections = Array.from(new Set(checklist.map(item => item.section)));

    for (const section of sections) {
      this.checkPageBreak(15);
      this.addText(section, this.margin, 10, 'bold');
      
      const sectionItems = checklist.filter(item => item.section === section);
      
      for (const item of sectionItems) {
        this.checkPageBreak(12);
        
        const hasCondition = item.condition !== null && item.condition !== undefined;
        const checkmark = hasCondition ? '☑' : '☐';
        const conditionText = this.getConditionText(item.condition);
        
        // Item line: [X] Title - Condition
        const itemLine = `${checkmark} ${item.title} - ${conditionText}`;
        this.addText(itemLine, this.margin + 5, 9);
        
        // Notes if available
        if (item.notes) {
          this.addMultilineText(`Notes: ${item.notes}`, this.margin + 10, 155, 8);
        }
      }
      
      this.yPosition += 2;
    }

    // General PM notes
    if (pmData.notes) {
      this.checkPageBreak(15);
      this.addText('General Notes:', this.margin, 10, 'bold');
      this.addMultilineText(pmData.notes, this.margin, 170, 9);
    }

    this.addSeparator();
  }

  /**
   * Generate footer with timestamp
   */
  private generateFooter(): void {
    // Move to bottom of page
    this.yPosition = this.pageHeight + 5;
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Generated: ${new Date().toLocaleString()}`, this.margin, this.yPosition);
  }

  /**
   * Generate the complete PDF
   */
  public generatePDF(data: WorkOrderPDFData): jsPDF {
    const {
      workOrder,
      equipment,
      organizationName,
      notes = [],
      costs = [],
      pmData,
      showPrivateNotes = false
    } = data;

    // Generate all sections
    this.generateHeader(workOrder, organizationName);
    this.generateDetailsSection(workOrder);
    
    if (equipment) {
      this.generateEquipmentSection(equipment);
    }
    
    this.generateAssignmentSection(workOrder);
    this.generateDescriptionSection(workOrder.description);
    
    if (notes.length > 0) {
      this.generateNotesSection(notes, showPrivateNotes);
    }
    
    if (costs.length > 0) {
      this.generateCostsSection(costs);
    }
    
    if (pmData && workOrder.has_pm) {
      this.generatePMChecklistSection(pmData);
    }
    
    this.generateFooter();

    return this.doc;
  }

  /**
   * Generate and download the PDF
   */
  public static async generateAndDownload(data: WorkOrderPDFData): Promise<void> {
    try {
      const generator = new WorkOrderReportPDFGenerator();
      const pdf = generator.generatePDF(data);
      
      // Create filename from work order title
      const safeTitle = data.workOrder.title
        .replace(/[^a-z0-9]/gi, '-')
        .replace(/-+/g, '-')
        .slice(0, 50);
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `WorkOrder-${safeTitle}-${dateStr}.pdf`;
      
      pdf.save(filename);
    } catch (error) {
      logger.error('Error generating work order PDF:', error);
      throw error;
    }
  }
}

/**
 * Convenience function to generate and download a work order PDF
 */
export const generateWorkOrderPDF = WorkOrderReportPDFGenerator.generateAndDownload;
