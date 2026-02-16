import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ChevronRight, Edit, Info, Download, FileSpreadsheet, Loader2, MoreHorizontal, Trash2 } from 'lucide-react';
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
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { QuickBooksExportButton } from './QuickBooksExportButton';
import { WorkOrderPDFExportDialog } from './WorkOrderPDFExportDialog';
import { useWorkOrderPDF } from '@/features/work-orders/hooks/useWorkOrderPDFData';
import { useWorkOrderExcelExport } from '@/features/work-orders/hooks/useWorkOrderExcelExport';
import { useGoogleWorkspaceConnectionStatus } from '@/features/organization/hooks/useGoogleWorkspaceConnectionStatus';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';
import { useDeleteWorkOrder } from '@/features/work-orders/hooks/useDeleteWorkOrder';
import { useWorkOrderImageCount } from '@/features/work-orders/hooks/useWorkOrderImageCount';
import type { PreventativeMaintenance } from '@/features/pm-templates/services/preventativeMaintenanceService';

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

/** Format priority for display */
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

  const handleDeleteConfirm = async () => {
    try {
      await deleteWorkOrderMutation.mutateAsync(workOrder.id);
      setShowDeleteDialog(false);
      navigate('/dashboard/work-orders');
    } catch {
      // Error is handled in the mutation
    }
  };

  // PDF generation hook
  const { downloadPDF, isGenerating, saveToDrive, isSavingToDrive } = useWorkOrderPDF({
    workOrder,
    equipment: equipment ? {
      id: equipment.id,
      name: equipment.name,
      manufacturer: equipment.manufacturer,
      model: equipment.model,
      serial_number: equipment.serial_number,
      status: equipment.status,
      location: equipment.location
    } : null,
    pmData: pmData as PreventativeMaintenance | null,
    organizationName
  });

  // Excel export hook
  const { exportSingle, isExportingSingle } = useWorkOrderExcelExport(
    organizationId,
    organizationName ?? ''
  );
  
  // Google Workspace connection status (for showing "Save to Google Drive" option)
  const { isConnected: isGoogleWorkspaceConnected } = useGoogleWorkspaceConnectionStatus({
    organizationId,
  });

  // Handle PDF export with options from dialog
  const handlePDFExport = async (options: { includeCosts: boolean }) => {
    // Let errors propagate so the dialog can detect failures and stay open for retry.
    // The useWorkOrderPDF hook already logs and shows a toast on error.
    await downloadPDF(options);
  };

  // Handle save to Drive with options from dialog
  const handleSaveToDrive = async (options: { includeCosts: boolean }) => {
    await saveToDrive(options);
  };

  // Truncate work order UUID to first 8 characters for display (matches invoice format WO-XXXXXXXX)
  const truncatedId = workOrder.id.substring(0, 8).toUpperCase();

  return (
    <TooltipProvider>
      <div className="hidden lg:block">
        <header className="gradient-primary rounded-b-xl -mb-6 p-6 relative z-10">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm text-secondary/80 mb-2">
            <Link to="/dashboard/work-orders" className="hover:underline hover:text-secondary transition-colors">
              Work Orders
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-secondary font-medium cursor-help">WO-{truncatedId}</span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-mono text-xs">{workOrder.id}</p>
              </TooltipContent>
            </Tooltip>
          </nav>

          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-3xl font-bold tracking-tight truncate">{workOrder.title}</h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="capitalize">{formatPriority(workOrder.priority)} priority</span>
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
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
              <Badge className={getStatusColor(workOrder.status)}>
                {formatStatus(workOrder.status)}
              </Badge>
              <QuickBooksExportButton
                workOrderId={workOrder.id}
                teamId={equipmentTeamId ?? null}
                workOrderStatus={workOrder.status}
                showStatusDetails
              />
              {canEdit && (
                <Button variant="outline" onClick={onEditClick}>
                  <Edit className="h-4 w-4 mr-2" />
                  {formMode === 'requestor' ? 'Edit Request' : 'Edit'}
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="More actions">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setShowPDFDialog(true)}
                    disabled={isGenerating}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => exportSingle(workOrder.id)}
                    disabled={isExportingSingle || !organizationId}
                  >
                    {isExportingSingle ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                    )}
                    Export Excel
                  </DropdownMenuItem>
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
            </div>
          </div>
        </header>

        {/* PDF Export Dialog */}
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

        {/* Delete Confirmation Dialog */}
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

