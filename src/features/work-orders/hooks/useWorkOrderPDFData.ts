import { useCallback, useState, useRef } from 'react';
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
  /** @deprecated No longer used - customer-facing PDF always shows public notes only */
  showPrivateNotes?: boolean;
}

/** Options passed to downloadPDF function */
export interface DownloadPDFOptions {
  /** Include cost items in the PDF (default: false for customer-facing docs) */
  includeCosts?: boolean;
}

export interface UseWorkOrderPDFReturn {
  /** Generate and download the PDF. Accepts optional options for customization. */
  downloadPDF: (options?: DownloadPDFOptions) => Promise<void>;
  /** Whether PDF generation is in progress */
  isGenerating: boolean;
}

/**
 * Hook to handle work order PDF generation with data fetching
 * 
 * This hook aggregates notes and costs data, then generates a comprehensive PDF.
 * It handles loading states and error handling automatically.
 * 
 * Note: The PDF is customer-facing by default:
 * - Only public notes are included
 * - Costs are excluded unless explicitly requested via includeCosts option
 */
export const useWorkOrderPDF = (options: UseWorkOrderPDFOptions): UseWorkOrderPDFReturn => {
  const { 
    workOrder, 
    equipment, 
    pmData, 
    organizationName
  } = options;
  
  const [isGenerating, setIsGenerating] = useState(false);
  // Use ref for the re-entry guard to avoid stale closure issues
  // The ref always has the current value, unlike state captured in callback closure
  const isGeneratingRef = useRef(false);

  const downloadPDF = useCallback(async (downloadOptions?: DownloadPDFOptions) => {
    // Use ref for guard check to prevent race conditions from rapid clicks
    if (isGeneratingRef.current) return;
    
    const { includeCosts = false } = downloadOptions || {};
    
    // Update both ref (for guard) and state (for UI)
    isGeneratingRef.current = true;
    setIsGenerating(true);
    
    try {
      // Always fetch notes (PDF generator filters to public only)
      const notesPromise = getWorkOrderNotesWithImages(workOrder.id).catch(err => {
        logger.warn('Failed to fetch notes for PDF:', err);
        return [];
      });
      
      // Only fetch costs if explicitly requested
      const costsPromise = includeCosts 
        ? getWorkOrderCosts(workOrder.id).catch(err => {
            logger.warn('Failed to fetch costs for PDF:', err);
            return [];
          })
        : Promise.resolve([]);

      const [notes, costs] = await Promise.all([notesPromise, costsPromise]);

      // Prepare PDF data (customer-facing: always exclude private notes)
      const pdfData: WorkOrderPDFData = {
        workOrder,
        equipment,
        organizationName,
        notes,
        costs,
        pmData,
        showPrivateNotes: false, // Customer-facing PDF always shows public notes only
        includeCosts
      };

      // Generate and download the PDF
      await generateWorkOrderPDF(pdfData);
      
      toast.success('PDF downloaded successfully');
    } catch (error) {
      logger.error('Error generating work order PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
      // Re-throw so callers know the operation failed (e.g., to keep dialog open for retry)
      throw error;
    } finally {
      isGeneratingRef.current = false;
      setIsGenerating(false);
    }
  }, [workOrder, equipment, pmData, organizationName]);

  return {
    downloadPDF,
    isGenerating
  };
};
