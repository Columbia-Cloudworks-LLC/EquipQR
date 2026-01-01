import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Info } from 'lucide-react';
import { getStatusColor, formatStatus } from '@/features/work-orders/utils/workOrderHelpers';
import { WorkOrderData, PermissionLevels, EquipmentData, PMData } from '@/features/work-orders/types/workOrderDetails';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { QuickBooksExportButton } from './QuickBooksExportButton';
import PrintExportDropdown from './PrintExportDropdown';
import { useWorkOrderPDF } from '@/features/work-orders/hooks/useWorkOrderPDFData';
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
  organizationName
}) => {
  // PDF generation hook
  const { downloadPDF, isGenerating } = useWorkOrderPDF({
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
    organizationName,
    showPrivateNotes: permissionLevels.isManager
  });

  return (
    <div className="hidden lg:block space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard/work-orders">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Work Orders
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{workOrder.title}</h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <p>Work Order #{workOrder.id}</p>
              <span className="text-muted-foreground">•</span>
              <span className="capitalize">{formatPriority(workOrder.priority)} priority</span>
              {formMode === 'requestor' && !permissionLevels.isManager && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>You have limited access to this work order</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(workOrder.status)}>
            {formatStatus(workOrder.status)}
          </Badge>
          <div className="flex items-center gap-2">
            <PrintExportDropdown
              onDownloadPDF={downloadPDF}
              disabled={isGenerating}
            />
            <QuickBooksExportButton
              workOrderId={workOrder.id}
              teamId={equipmentTeamId ?? null}
              workOrderStatus={workOrder.status}
            />
          </div>
          {canEdit && (
            <Button variant="outline" onClick={onEditClick}>
              <Edit className="h-4 w-4 mr-2" />
              {formMode === 'requestor' ? 'Edit Request' : 'Edit'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

