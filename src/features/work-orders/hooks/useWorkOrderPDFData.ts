import { useCallback, useState, useRef } from 'react';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { getWorkOrderNotesWithImages } from '@/features/work-orders/services/workOrderNotesService';
import { getWorkOrderCosts } from '@/features/work-orders/services/workOrderCostsService';
import { 
  generateWorkOrderPDF,
  generateWorkOrderPDFBlob,
  type WorkOrderPDFData,
  type WorkOrderForPDF,
  type EquipmentForPDF
} from '@/features/work-orders/services/workOrderReportPDFService';
import type { PreventativeMaintenance } from '@/features/pm-templates/services/preventativeMaintenanceService';

/** Response from the upload-to-google-drive edge function */
interface GoogleDriveUploadResponse {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  webContentLink?: string;
}

/** Error response with optional code for handling insufficient scopes */
interface DriveUploadErrorResponse {
  error: string;
  code?: string;
}

export interface UseWorkOrderPDFOptions {
  workOrder: WorkOrderForPDF;
  equipment?: EquipmentForPDF | null;
  pmData?: PreventativeMaintenance | null;
  organizationName?: string;
}

/** Options passed to downloadPDF function */
export interface DownloadPDFOptions {
  /** Include cost items in the PDF (default: false for customer-facing docs) */
  includeCosts?: boolean;
}

export interface UseWorkOrderPDFReturn {
  /** Generate and download the PDF. Accepts optional options for customization. */
  downloadPDF: (options?: DownloadPDFOptions) => Promise<void>;
  /** Generate the PDF and upload it to Google Drive. Requires Google Workspace connection. */
  saveToDrive: (options?: DownloadPDFOptions) => Promise<void>;
  /** Whether PDF generation/download is in progress */
  isGenerating: boolean;
  /** Whether Google Drive upload is in progress */
  isSavingToDrive: boolean;
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
  
  const { organization } = useOrganization();
  const organizationId = organization?.id;
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingToDrive, setIsSavingToDrive] = useState(false);
  
  // Use refs for the re-entry guards to avoid stale closure issues.
  // The refs always have the current value, unlike state captured in callback closure.
  // Note: The refs are reset in the finally blocks after operations complete/fail.
  const isGeneratingRef = useRef(false);
  const isSavingToDriveRef = useRef(false);

  const downloadPDF = useCallback(async (downloadOptions?: DownloadPDFOptions) => {
    // Use ref for guard check to prevent race conditions from rapid clicks.
    // This blocks re-entry until the finally block resets the ref.
    if (isGeneratingRef.current) return;
    
    const { includeCosts = false } = downloadOptions || {};
    
    // Update both ref (for guard) and state (for UI)
    isGeneratingRef.current = true;
    setIsGenerating(true);
    
    try {
      // Always fetch notes (PDF generator filters to public only).
      // Multi-tenancy: Explicit organization_id filtering is provided as a failsafe
      // (per coding guidelines). RLS policies on work_order_notes table also enforce multi-tenancy.
      const notesPromise = getWorkOrderNotesWithImages(workOrder.id, organizationId).catch(err => {
        logger.warn('Failed to fetch notes for PDF:', err);
        return [];
      });
      
      // Only fetch costs if explicitly requested
      // Multi-tenancy: Explicit organization_id filtering is provided as a failsafe
      const costsPromise = includeCosts 
        ? getWorkOrderCosts(workOrder.id, organizationId).catch(err => {
            logger.warn('Failed to fetch costs for PDF:', err);
            return [];
          })
        : Promise.resolve([]);

      const [notes, costs] = await Promise.all([notesPromise, costsPromise]);

      // Prepare PDF data (customer-facing: public notes only, costs optional)
      const pdfData: WorkOrderPDFData = {
        workOrder,
        equipment,
        organizationName,
        notes,
        costs,
        pmData,
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
  }, [workOrder, equipment, pmData, organizationName, organizationId]);

  const saveToDrive = useCallback(async (downloadOptions?: DownloadPDFOptions) => {
    // Use ref for guard check to prevent race conditions from rapid clicks.
    if (isSavingToDriveRef.current) return;
    
    const { includeCosts = false } = downloadOptions || {};
    
    // Update both ref (for guard) and state (for UI)
    isSavingToDriveRef.current = true;
    setIsSavingToDrive(true);
    
    try {
      // Fetch notes and costs (same as downloadPDF)
      const notesPromise = getWorkOrderNotesWithImages(workOrder.id, organizationId).catch(err => {
        logger.warn('Failed to fetch notes for PDF:', err);
        return [];
      });
      
      const costsPromise = includeCosts 
        ? getWorkOrderCosts(workOrder.id, organizationId).catch(err => {
            logger.warn('Failed to fetch costs for PDF:', err);
            return [];
          })
        : Promise.resolve([]);

      const [notes, costs] = await Promise.all([notesPromise, costsPromise]);

      // Prepare PDF data
      const pdfData: WorkOrderPDFData = {
        workOrder,
        equipment,
        organizationName,
        notes,
        costs,
        pmData,
        includeCosts
      };

      // Generate the PDF as a blob
      const { blob, filename } = await generateWorkOrderPDFBlob(pdfData);
      
      // Convert blob to base64 for upload using FileReader for better performance
      const contentBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result;
          if (typeof result === 'string') {
            // result is a data URL: "data:application/pdf;base64,...."
            const [, base64] = result.split(',', 2);
            if (base64) {
              resolve(base64);
            } else {
              reject(new Error('Failed to extract base64 content from PDF data URL'));
            }
          } else {
            reject(new Error('Failed to read PDF blob as base64'));
          }
        };
        reader.onerror = () => {
          reject(reader.error ?? new Error('Failed to read PDF blob as base64'));
        };
        reader.readAsDataURL(blob);
      });
      
      // Get auth token for the request
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      
      if (!accessToken) {
        throw new Error('Not authenticated');
      }
      
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }
      
      // Upload to Google Drive via edge function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/upload-to-google-drive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          organizationId,
          filename,
          contentBase64,
          mimeType: 'application/pdf',
        }),
      });
      
      if (!response.ok) {
        const errorData: DriveUploadErrorResponse = await response.json().catch(() => ({ error: 'Unknown error' }));
        
        // Handle insufficient scopes error
        if (errorData.code === 'insufficient_scopes' || errorData.code === 'not_connected') {
          toast.error('Google Workspace Permissions Required', {
            description: 'Please reconnect Google Workspace in Organization Settings to enable this feature.',
          });
          throw new Error(errorData.error);
        }
        
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const result: GoogleDriveUploadResponse = await response.json();
      
      // Show success toast with link to open the file
      toast.success('PDF saved to Google Drive', {
        description: 'Click to open in Drive',
        action: result.webViewLink ? {
          label: 'Open',
          onClick: () => window.open(result.webViewLink, '_blank', 'noopener,noreferrer'),
        } : undefined,
      });
    } catch (error) {
      logger.error('Error saving PDF to Google Drive:', error);
      // Only show generic error if we haven't already shown a specific one
      if (!(error instanceof Error && error.message.includes('Google Workspace'))) {
        toast.error('Failed to save PDF to Google Drive. Please try again.');
      }
      throw error;
    } finally {
      isSavingToDriveRef.current = false;
      setIsSavingToDrive(false);
    }
  }, [workOrder, equipment, pmData, organizationName, organizationId]);

  return {
    downloadPDF,
    saveToDrive,
    isGenerating,
    isSavingToDrive,
  };
};
