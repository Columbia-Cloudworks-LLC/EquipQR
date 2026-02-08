
import React from 'react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import WorkOrderStatusManager from '@/features/work-orders/components/WorkOrderStatusManager';
import { WorkOrderDetailsQuickInfo } from './WorkOrderDetailsQuickInfo';
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
}

export const WorkOrderDetailsSidebar: React.FC<WorkOrderDetailsSidebarProps> = ({
  workOrder,
  equipment,
  pmData,
  formMode,
  permissionLevels,
  currentOrganization,
  showMobileSidebar,
  onCloseMobileSidebar
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
          />
        )}

        {/* Status Info for Requestors - now includes assignee info */}
        <WorkOrderDetailsRequestorStatus 
          workOrder={workOrder}
          permissionLevels={permissionLevels}
        />

        {/* Quick Info */}
        <WorkOrderDetailsQuickInfo 
          workOrder={workOrder}
          equipment={equipment}
          formMode={formMode}
          permissionLevels={permissionLevels}
          pmData={pmData}
        />
      </div>
    </div>
  );
};


