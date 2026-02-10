
import React from 'react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import WorkOrderStatusManager from '@/features/work-orders/components/WorkOrderStatusManager';
import { WorkOrderDetailsRequestorStatus } from './WorkOrderDetailsRequestorStatus';
import { WorkOrderData, EquipmentData, PMData, PermissionLevels, OrganizationData } from '@/features/work-orders/types/workOrderDetails';

interface WorkOrderDetailsSidebarProps {
  workOrder: WorkOrderData;
  equipment: EquipmentData;
  pmData: PMData | null;
  formMode: string;
  permissionLevels: PermissionLevels;
  currentOrganization: OrganizationData;
  showMobileSidebar: boolean;
  onCloseMobileSidebar: () => void;
  /** Full team details from equipment join */
  team?: {
    id: string;
    name: string;
    description?: string;
    location_address?: string | null;
    location_lat?: number | null;
    location_lng?: number | null;
  } | null;
}

export const WorkOrderDetailsSidebar: React.FC<WorkOrderDetailsSidebarProps> = ({
  workOrder,
  equipment,
  pmData,
  formMode,
  permissionLevels,
  currentOrganization,
  showMobileSidebar,
  onCloseMobileSidebar,
  team
}) => {
  const isMobile = useIsMobile();

  return (
    <div className={`
      ${isMobile ? (
        showMobileSidebar 
          ? 'fixed inset-0 z-50 bg-background p-4 overflow-y-auto' 
          : 'hidden'
      ) : 'space-y-6'}
    `}>
      {isMobile && showMobileSidebar && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Work Order Info</h2>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onCloseMobileSidebar}
          >
            ✕
          </Button>
        </div>
      )}

      <div className="space-y-4 lg:space-y-6">
        {/* Status Management with Assignment - Only managers can change status */}
        {permissionLevels.isManager && (
          <WorkOrderStatusManager 
            workOrder={{
              ...workOrder,
              // Pass equipment team_id for contextual assignment
              equipmentTeamId: equipment?.team_id
            }} 
            organizationId={currentOrganization.id}
            contextData={{
              createdDate: workOrder.created_date,
              dueDate: workOrder.due_date,
              estimatedHours: workOrder.estimated_hours,
              equipmentId: equipment?.id,
              equipmentName: equipment?.name,
              pmStatus: workOrder.has_pm && pmData ? pmData.status : undefined,
              formMode,
              team: team || null,
            }}
          />
        )}

        {/* Status Info for Requestors - now includes context data */}
        <WorkOrderDetailsRequestorStatus 
          workOrder={workOrder}
          permissionLevels={permissionLevels}
          equipment={equipment}
          pmData={pmData}
        />
      </div>
    </div>
  );
};

