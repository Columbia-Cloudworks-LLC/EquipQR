import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Edit, Info, Download, FileSpreadsheet, Loader2, MoreHorizontal, Trash2, FileText, ExternalLink, ClipboardList } from 'lucide-react';
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
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import PageHeader from '@/components/layout/PageHeader';
import { QuickBooksExportButton } from './QuickBooksExportButton';
import { WorkOrderPDFExportDialog } from './WorkOrderPDFExportDialog';
import { useWorkOrderPDF } from '@/features/work-orders/hooks/useWorkOrderPDFData';
import { useWorkOrderExcelExport } from '@/features/work-orders/hooks/useWorkOrderExcelExport';
import { useGoogleWorkspaceConnectionStatus } from '@/features/organization/hooks/useGoogleWorkspaceConnectionStatus';
import { useGoogleWorkspaceExportDestination } from '@/features/organization/hooks/useGoogleWorkspaceExportDestination';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';
import { useDeleteWorkOrder } from '@/features/work-orders/hooks/useDeleteWorkOrder';
import { useWorkOrderImageCount } from '@/features/work-orders/hooks/useWorkOrderImageCount';
import { useQuickBooksAccess } from '@/hooks/useQuickBooksAccess';
import { isQuickBooksEnabled } from '@/lib/flags';
import type { PreventativeMaintenance } from '@/features/pm-templates/services/preventativeMaintenanceService';
import { canExportWorkOrderGoogleDoc } from '@/features/work-orders/utils/googleDocsExportAvailability';
import { useLatestExportArtifact } from '@/features/work-orders/hooks/useLatestExportArtifact';

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

  const { downloadPDF, isGenerating, saveToDrive, isSavingToDrive, downloadFieldWorksheet, isGeneratingWorksheet } = useWorkOrderPDF({
    workOrder,
    equipment: equipment ? {
      id: equipment.id,
      name: equipment.name,
      manufacturer: equipment.manufacturer,
      model: equipment.model,
      serial_number: equipment.serial_number,
      status: equipment.status,
      location: equipment.location,
      customerId: (equipment as { customer_id?: string | null }).customer_id ?? null,
    } : null,
    pmData: pmData as PreventativeMaintenance | null,
    organizationName,
    teamId: equipmentTeamId,
  });

  const { exportSingle, isExportingSingle, exportSingleToDocs, isExportingSingleToDocs } = useWorkOrderExcelExport(
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

  const { data: lastDocArtifact } = useLatestExportArtifact(
    organizationId,
    'work_order',
    workOrder?.id,
    'google_docs',
    'internal_packet',
  );

  const handlePDFExport = async (options: { includeCosts: boolean }) => {
    await downloadPDF(options);
  };

  const handleSaveToDrive = async (options: { includeCosts: boolean }) => {
    await saveToDrive(options);
  };

  const handleDownloadWorksheet = async () => {
    try {
      await downloadFieldWorksheet();
    } catch {
      // Error toast is shown by the hook
    }
  };

  const truncatedId = workOrder.id.substring(0, 8).toUpperCase();
  const showExports = permissionLevels.isManager;
  const showActionsMenu = showExports || showQuickBooks || canDelete;

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
                    <Button variant="outline" size="icon" aria-label="Actions">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {showExports && (
                      <>
                        <DropdownMenuLabel>Exports</DropdownMenuLabel>
                        <DropdownMenuGroup>
                          <DropdownMenuItem
                            onClick={() => setShowPDFDialog(true)}
                            disabled={isGenerating}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Service Report PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={handleDownloadWorksheet}
                            disabled={isGeneratingWorksheet}
                          >
                            {isGeneratingWorksheet ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <ClipboardList className="h-4 w-4 mr-2" />
                            )}
                            Printable Field Worksheet
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => exportSingle(workOrder.id)}
                            disabled={isExportingSingle || isExportingSingleToDocs || !organizationId}
                          >
                            {isExportingSingle ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <FileSpreadsheet className="h-4 w-4 mr-2" />
                            )}
                            Internal Work Order Packet
                          </DropdownMenuItem>
                          {canExportGoogleDoc && (
                            <DropdownMenuItem
                              onClick={() => exportSingleToDocs(workOrder.id)}
                              disabled={isExportingSingle || isExportingSingleToDocs || !organizationId}
                            >
                              {isExportingSingleToDocs ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <FileText className="h-4 w-4 mr-2" />
                              )}
                              Internal Work Order Packet (Google Doc)
                            </DropdownMenuItem>
                          )}
                          {lastDocArtifact?.web_view_link && (
                            <DropdownMenuItem
                              onClick={() => window.open(lastDocArtifact.web_view_link, '_blank', 'noopener,noreferrer')}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Open Last Google Doc
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuGroup>
                      </>
                    )}
                    {showQuickBooks && (
                      <>
                        {showExports && <DropdownMenuSeparator />}
                        <DropdownMenuLabel>Integrations</DropdownMenuLabel>
                        <DropdownMenuGroup>
                          <QuickBooksExportButton
                            workOrderId={workOrder.id}
                            teamId={equipmentTeamId ?? null}
                            workOrderStatus={workOrder.status}
                            asMenuItem
                          />
                        </DropdownMenuGroup>
                      </>
                    )}
                    {canDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setShowDeleteDialog(true)}
                          disabled={deleteWorkOrderMutation.isPending}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Work Order
                        </DropdownMenuItem>
                      </>
                    )}
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
          onSaveToDrive={handleSaveToDrive}
          isSavingToDrive={isSavingToDrive}
        />

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Work Order</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this work order? This action is irreversible and will permanently remove:
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• Work order details and description</li>
                  <li>• All notes and comments</li>
                  <li>• Cost records and estimates</li>
                  <li>• Status history</li>
                  <li>• Preventative maintenance records</li>
                  {imageData && imageData.count > 0 && (
                    <li className="flex items-center gap-2">
                      • All uploaded images
                      <Badge variant="destructive" className="text-xs">
                        {imageData.count} image{imageData.count !== 1 ? 's' : ''}
                      </Badge>
                    </li>
                  )}
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteWorkOrderMutation.isPending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={deleteWorkOrderMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteWorkOrderMutation.isPending ? 'Deleting...' : 'Delete Permanently'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
};
