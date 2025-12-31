import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { getWorkOrderNotesWithImages } from '@/features/work-orders/services/workOrderNotesService';
import { getWorkOrderCosts } from '@/features/work-orders/services/workOrderCostsService';
import { 
  generateWorkOrderPDF, 
  type WorkOrderPDFData,
  type WorkOrderForPDF,
  type EquipmentForPDF
} from '@/features/work-orders/services/workOrderReportPDFService';
import type { PreventativeMaintenance } from '@/features/pm-templates/services/preventativeMaintenanceService';

export interface UseWorkOrderPDFOptions {
  workOrder: WorkOrderForPDF;
  equipment?: EquipmentForPDF | null;
  pmData?: PreventativeMaintenance | null;
  organizationName?: string;
  showPrivateNotes?: boolean;
}

export interface UseWorkOrderPDFReturn {
  /** Generate and download the PDF */
  downloadPDF: () => Promise<void>;
  /** Whether PDF generation is in progress */
  isGenerating: boolean;
}

/**
 * Hook to handle work order PDF generation with data fetching
 * 
 * This hook aggregates notes and costs data, then generates a comprehensive PDF.
 * It handles loading states and error handling automatically.
 */
export const useWorkOrderPDF = (options: UseWorkOrderPDFOptions): UseWorkOrderPDFReturn => {
  const { 
    workOrder, 
    equipment, 
    pmData, 
    organizationName, 
    showPrivateNotes = false 
  } = options;
  
  const [isGenerating, setIsGenerating] = useState(false);

  const downloadPDF = useCallback(async () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    
    try {
      // Fetch notes and costs in parallel
      const [notes, costs] = await Promise.all([
        getWorkOrderNotesWithImages(workOrder.id).catch(err => {
          logger.warn('Failed to fetch notes for PDF:', err);
          return [];
        }),
        getWorkOrderCosts(workOrder.id).catch(err => {
          logger.warn('Failed to fetch costs for PDF:', err);
          return [];
        })
      ]);

      // Prepare PDF data
      const pdfData: WorkOrderPDFData = {
        workOrder,
        equipment,
        organizationName,
        notes,
        costs,
        pmData,
        showPrivateNotes
      };

      // Generate and download the PDF
      await generateWorkOrderPDF(pdfData);
      
      toast.success('PDF downloaded successfully');
    } catch (error) {
      logger.error('Error generating work order PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [workOrder, equipment, pmData, organizationName, showPrivateNotes, isGenerating]);

  return {
    downloadPDF,
    isGenerating
  };
};
