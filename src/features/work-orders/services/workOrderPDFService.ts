import { logger } from '@/utils/logger';
import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';

export interface PMChecklistItem {
  id: string;
  task: string;
  completed: boolean;
  notes?: string;
  completed_by?: string;
  completed_at?: string;
}

export interface PMData {
  id: string;
  work_order_id: string;
  equipment_id: string;
  checklist_data: PMChecklistItem[];
  status: string;
  completed_at?: string;
  completed_by?: string;
  notes?: string;
}

export const generatePMChecklistPDF = async (workOrderId: string): Promise<void> => {
  try {
    // Fetch PM data and work order details
    const { data: pmData, error: pmError } = await supabase
      .from('preventative_maintenance')
      .select(`
        *,
        work_orders!inner(
          title,
          description,
          equipment:equipment_id(name, manufacturer, model, serial_number)
        )
      `)
      .eq('work_order_id', workOrderId)
      .single();

    if (pmError) throw pmError;
    if (!pmData) throw new Error('PM data not found');

    const workOrder = pmData.work_orders;
    const equipment = workOrder.equipment;

    // Create PDF
    const pdf = new jsPDF();
    
    // Header
    pdf.setFontSize(20);
    pdf.text('Preventative Maintenance Checklist', 20, 20);
    
    // Work order info
    pdf.setFontSize(12);
    pdf.text(`Work Order: ${workOrder.title}`, 20, 40);
    pdf.text(`Equipment: ${equipment?.name || 'N/A'}`, 20, 50);
    pdf.text(`Model: ${equipment?.manufacturer} ${equipment?.model}`, 20, 60);
    pdf.text(`Serial: ${equipment?.serial_number || 'N/A'}`, 20, 70);
    
    if (pmData.completed_at) {
      pdf.text(`Completed: ${new Date(pmData.completed_at).toLocaleDateString()}`, 20, 80);
    }
    
    // Checklist items
    pdf.setFontSize(14);
    pdf.text('Checklist Items:', 20, 100);
    
    let yPosition = 120;
    const checklistData = (pmData.checklist_data as unknown) as PMChecklistItem[];
    
    checklistData.forEach(item => {
      pdf.setFontSize(10);
      const status = item.completed ? '✓' : '☐';
      pdf.text(`${status} ${item.task}`, 25, yPosition);
      
      if (item.notes) {
        yPosition += 10;
        pdf.setFontSize(8);
        pdf.text(`Notes: ${item.notes}`, 30, yPosition);
      }
      
      yPosition += 15;
      
      // Add new page if needed
      if (yPosition > 270) {
        pdf.addPage();
        yPosition = 20;
      }
    });
    
    // Download
    pdf.save(`PM-Checklist-${workOrder.title}-${Date.now()}.pdf`);
  } catch (error) {
    logger.error('Error generating PM PDF:', error);
    throw error;
  }
};

