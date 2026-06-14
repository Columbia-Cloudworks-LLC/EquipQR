import { useWorkOrderExcelExport } from '@/features/work-orders/hooks/useWorkOrderExcelExport';
import { useWorkOrderPDF } from '@/features/work-orders/hooks/useWorkOrderPDFData';
import { useGoogleWorkspaceConnectionStatus } from '@/features/organization/hooks/useGoogleWorkspaceConnectionStatus';
import { useGoogleWorkspaceExportDestination } from '@/features/organization/hooks/useGoogleWorkspaceExportDestination';
import { canExportWorkOrderGoogleDoc } from '@/features/work-orders/utils/googleDocsExportAvailability';
import {
  buildEquipmentPdfInput,
  buildWorkOrderPdfInput,
} from '@/features/work-orders/utils/workOrderDetailsViewModel';
import type { WorkOrder } from '@/features/work-orders/types/workOrder';
import type { EquipmentData, PMData } from '@/features/work-orders/types/workOrderDetails';

type UseWorkOrderDetailsExportsParams = {
  workOrder: WorkOrder | null | undefined;
  equipment: EquipmentData | null | undefined;
  pmData: PMData | null | undefined;
  organizationId?: string;
  organizationName?: string;
  isManager: boolean;
};

export function useWorkOrderDetailsExports({
  workOrder,
  equipment,
  pmData,
  organizationId = '',
  organizationName = '',
  isManager,
}: UseWorkOrderDetailsExportsParams) {
  const {
    exportSingle,
    isExportingSingle,
    exportSingleToDocs,
    isExportingSingleToDocs,
    exportSingleToSheets,
    isExportingSingleToSheets,
    exportSingleCsv,
    isExportingSingleCsv,
    exportSingleDocx,
    isExportingSingleDocx,
  } = useWorkOrderExcelExport(organizationId, organizationName);

  const {
    downloadPDF: downloadMobilePDF,
    isGenerating: isMobilePDFGenerating,
    saveToDrive: saveMobilePDFToDrive,
    isSavingToDrive: isMobileSavingToDrive,
    downloadFieldWorksheet: downloadMobileWorksheet,
    isGeneratingWorksheet: isMobileWorksheetGenerating,
  } = useWorkOrderPDF({
    workOrder: buildWorkOrderPdfInput(workOrder),
    equipment: buildEquipmentPdfInput(
      equipment
        ? {
            id: equipment.id,
            name: equipment.name,
            manufacturer: equipment.manufacturer,
            model: equipment.model,
            serial_number: equipment.serial_number,
            status: equipment.status,
            location: equipment.location,
            customer_id: equipment.customer_id,
          }
        : null,
    ),
    pmData,
    organizationName,
    organizationId: organizationId || undefined,
    teamId: equipment?.team_id,
  });

  const { isConnected: isGoogleWorkspaceConnected, connectionStatus } =
    useGoogleWorkspaceConnectionStatus({ organizationId });

  const { destination: googleDocsDestination } = useGoogleWorkspaceExportDestination(
    organizationId,
    isManager,
  );

  const canExportGoogleDoc = canExportWorkOrderGoogleDoc({
    isConnected: isGoogleWorkspaceConnected,
    scopes: connectionStatus?.scopes,
    hasDestination: Boolean(googleDocsDestination),
  });

  const handleMobilePDFExport = async (options: { includeCosts: boolean }) => {
    await downloadMobilePDF(options);
  };

  const handleMobileSaveToDrive = async (options: { includeCosts: boolean }) => {
    await saveMobilePDFToDrive(options);
  };

  const handleMobileDownloadWorksheet = async () => {
    try {
      await downloadMobileWorksheet();
    } catch {
      // Error toast is shown by the hook
    }
  };

  const showGoogleDrive =
    isGoogleWorkspaceConnected && Boolean(googleDocsDestination) && Boolean(organizationId);

  const isExportBusy =
    isExportingSingle
    || isExportingSingleToDocs
    || isExportingSingleToSheets
    || isExportingSingleCsv
    || isExportingSingleDocx
    || isMobilePDFGenerating
    || isMobileSavingToDrive;

  return {
    exportSingle,
    isExportingSingle,
    exportSingleToDocs,
    isExportingSingleToDocs,
    exportSingleToSheets,
    isExportingSingleToSheets,
    exportSingleCsv,
    isExportingSingleCsv,
    exportSingleDocx,
    isExportingSingleDocx,
    isMobilePDFGenerating,
    isMobileSavingToDrive,
    isMobileWorksheetGenerating,
    isGoogleWorkspaceConnected,
    googleDocsDestination,
    canExportGoogleDoc,
    showGoogleDrive,
    isExportBusy,
    handleMobilePDFExport,
    handleMobileSaveToDrive,
    handleMobileDownloadWorksheet,
  };
}
