import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WorkOrderDeleteConfirmDialog } from '@/features/work-orders/components/WorkOrderDeleteConfirmDialog';
import { Edit, Info, Download, MoreHorizontal } from 'lucide-react';
import { getStatusColor, formatStatus } from '@/features/work-orders/utils/workOrderHelpers';
import { WorkOrderData, PermissionLevels, EquipmentData, PMData } from '@/features/work-orders/types/workOrderDetails';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import PageHeader from '@/components/layout/PageHeader';
import { WorkOrderPDFExportDialog } from './WorkOrderPDFExportDialog';
import { WorkOrderExportMenuContent } from './WorkOrderExportMenuContent';
import { useWorkOrderPDF } from '@/features/work-orders/hooks/useWorkOrderPDFData';
import { useWorkOrderExcelExport } from '@/features/work-orders/hooks/useWorkOrderExcelExport';
import { useGoogleWorkspaceConnectionStatus } from '@/features/organization/hooks/useGoogleWorkspaceConnectionStatus';
import { useGoogleWorkspaceExportDestination } from '@/features/organization/hooks/useGoogleWorkspaceExportDestination';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';
import { useDeleteWorkOrder } from '@/features/work-orders/hooks/useDeleteWorkOrder';
import { useWorkOrderImageCount } from '@/features/work-orders/hooks/useWorkOrderImageCount';
import { useQuickBooksAccess } from '@/hooks/useQuickBooksAccess';
import { isQuickBooksEnabled } from '@/lib/flags';
import QuickBooksInvoiceStatusBadge from './QuickBooksInvoiceStatusBadge';
import type { PreventativeMaintenance } from '@/features/pm-templates/services/preventativeMaintenanceService';
import { canExportWorkOrderGoogleDoc } from '@/features/work-orders/utils/googleDocsExportAvailability';

interface WorkOrderDetailsDesktopHeaderProps {
  workOrder: WorkOrderData;
  formMode: string;
  permissionLevels: PermissionLevels;
  canEdit: boolean;
  onEditClick: () => void;
  /** Team ID derived from the equipment assigned to this work order */
  equipmentTeamId?: string | null;
  /** Equipment data for PDF export */
  equipment?: EquipmentData | null;
  /** PM data for PDF export */
  pmData?: PreventativeMaintenance | PMData | null;
  /** Organization name for PDF header */
  organizationName?: string;
  /** Organization ID for Excel export */
  organizationId?: string;
}

const formatPriority = (priority: string) => {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
};

export const WorkOrderDetailsDesktopHeader: React.FC<WorkOrderDetailsDesktopHeaderProps> = ({
  workOrder,
  formMode,
  permissionLevels,
  canEdit,
  onEditClick,
  equipmentTeamId,
  equipment,
  pmData,
  organizationName,
  organizationId
}) => {
  const [showPDFDialog, setShowPDFDialog] = useState(false);
  const [pdfDialogFocusDrive, setPdfDialogFocusDrive] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const navigate = useNavigate();
  const permissions = useUnifiedPermissions();
  const deleteWorkOrderMutation = useDeleteWorkOrder();
  const { data: imageData } = useWorkOrderImageCount(workOrder?.id);
  const canDelete = permissions.hasRole(['owner', 'admin']);

  const { data: canManageQuickBooks = false } = useQuickBooksAccess();
  const showQuickBooks = isQuickBooksEnabled() && canManageQuickBooks;

  const handleDeleteConfirm = async () => {
    try {
      await deleteWorkOrderMutation.mutateAsync(workOrder.id);
      setShowDeleteDialog(false);
      navigate('/dashboard/work-orders');
    } catch {
      // Error is handled in the mutation
    }
  };

  const { downloadPDF, isGenerating, saveToDrive, isSavingToDrive } = useWorkOrderPDF({
    workOrder,
    equipment: equipment ? {
      id: equipment.id,
      name: equipment.name,
      manufacturer: equipment.manufacturer,
      model: equipment.model,
      serial_number: equipment.serial_number,
      status: equipment.status,
      location: equipment.location,
      customerId: equipment.customer_id ?? null,
    } : null,
    pmData: pmData as PreventativeMaintenance | null,
    organizationName,
    organizationId,
    teamId: equipmentTeamId,
  });

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
  } = useWorkOrderExcelExport(
    organizationId,
    organizationName ?? ''
  );

  const { isConnected: isGoogleWorkspaceConnected, connectionStatus } = useGoogleWorkspaceConnectionStatus({
    organizationId,
  });
  const { destination: googleDocsDestination } = useGoogleWorkspaceExportDestination(organizationId, permissionLevels.isManager);
  const canExportGoogleDoc = canExportWorkOrderGoogleDoc({
    isConnected: isGoogleWorkspaceConnected,
    scopes: connectionStatus?.scopes,
    hasDestination: Boolean(googleDocsDestination),
  });

  const handlePDFExport = async (options: { includeCosts: boolean }) => {
    await downloadPDF(options);
  };

  const handleSaveToDrive = async (options: { includeCosts: boolean }) => {
    await saveToDrive(options);
  };

  const openPdfDialog = (focusDrive: boolean) => {
    setPdfDialogFocusDrive(focusDrive);
    // Defer so nested export dropdowns can close before the dialog opens (Radix focus trap).
    window.setTimeout(() => {
      setShowPDFDialog(true);
    }, 0);
  };

  const truncatedId = workOrder.id.substring(0, 8).toUpperCase();
  const showExports = permissionLevels.isManager;
  const showActionsMenu = showExports || showQuickBooks || canDelete;
  const actionsMenuLabel = showExports ? 'Export' : 'Actions';
  const showGoogleDrive = isGoogleWorkspaceConnected && Boolean(googleDocsDestination);
  const isExportBusy =
    isExportingSingle
    || isExportingSingleToDocs
    || isExportingSingleToSheets
    || isExportingSingleCsv
    || isExportingSingleDocx
    || isGenerating
    || isSavingToDrive;

  return (
    <TooltipProvider>
      <div className="hidden lg:block px-4 lg:px-6">
        <PageHeader
          density="compact"
          title={workOrder.title}
          breadcrumbs={[
            { label: 'Work Orders', href: '/dashboard/work-orders' },
            { label: `WO-${truncatedId}` },
          ]}
          meta={
            <>
              <Badge className={getStatusColor(workOrder.status)}>
                {formatStatus(workOrder.status)}
              </Badge>
              <span className="text-sm text-muted-foreground capitalize">
                {formatPriority(workOrder.priority)} Priority
              </span>
              <QuickBooksInvoiceStatusBadge
                status={workOrder.invoice_status}
                invoiceNumber={workOrder.quickbooks_invoice_number}
                balanceCents={workOrder.invoice_balance_cents}
                paidAt={workOrder.invoice_paid_at}
              />
              {formMode === 'requestor' && !permissionLevels.isManager && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>You have limited access to this work order</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </>
          }
          actions={
            <>
              {canEdit && (
                <Button
                  variant="outline"
                  onClick={onEditClick}
                  aria-label={formMode === 'requestor' ? 'Edit work order request' : 'Edit work order'}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {formMode === 'requestor' ? 'Edit Request' : 'Edit'}
                </Button>
              )}
              {showActionsMenu && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" aria-label={actionsMenuLabel}>
                      {showExports ? (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </>
                      ) : (
                        <>
                          <MoreHorizontal className="h-4 w-4 mr-2" />
                          Actions
                        </>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <WorkOrderExportMenuContent
                      workOrderId={workOrder.id}
                      workOrderStatus={workOrder.status}
                      equipmentTeamId={equipmentTeamId}
                      showExports={showExports}
                      showQuickBooks={showQuickBooks}
                      showGoogleDrive={showGoogleDrive}
                      canDelete={canDelete}
                      organizationId={organizationId}
                      isManager={permissionLevels.isManager}
                      onOpenPdfDialog={() => openPdfDialog(false)}
                      onOpenDrivePdfDialog={() => openPdfDialog(true)}
                      isGeneratingPdf={isGenerating || isSavingToDrive}
                      onDownloadXlsx={() => exportSingle(workOrder.id)}
                      isExportingXlsx={isExportingSingle}
                      onDownloadCsv={() => exportSingleCsv(workOrder.id)}
                      isExportingCsv={isExportingSingleCsv}
                      onDownloadDocx={() => exportSingleDocx(workOrder.id)}
                      isExportingDocx={isExportingSingleDocx}
                      docxDisabled={!canExportGoogleDoc}
                      onDriveDocs={() => exportSingleToDocs(workOrder.id)}
                      isExportingToDocs={isExportingSingleToDocs}
                      onDriveSheets={() => exportSingleToSheets(workOrder.id)}
                      isExportingToSheets={isExportingSingleToSheets}
                      onDelete={() => setShowDeleteDialog(true)}
                      isDeleting={deleteWorkOrderMutation.isPending}
                      isExportBusy={isExportBusy}
                    />
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </>
          }
        />

        <WorkOrderPDFExportDialog
          open={showPDFDialog}
          onOpenChange={setShowPDFDialog}
          onExport={handlePDFExport}
          isExporting={isGenerating}
          showCostsOption={permissionLevels.isManager}
          isGoogleWorkspaceConnected={isGoogleWorkspaceConnected}
          hasOrganizationDriveDestination={Boolean(googleDocsDestination)}
          onSaveToDrive={handleSaveToDrive}
          isSavingToDrive={isSavingToDrive}
          focusDriveAction={pdfDialogFocusDrive}
        />

        <WorkOrderDeleteConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          imageData={imageData}
          isDeleting={deleteWorkOrderMutation.isPending}
          onConfirm={handleDeleteConfirm}
        />
      </div>
    </TooltipProvider>
  );
};
