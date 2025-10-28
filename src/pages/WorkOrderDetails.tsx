import React, { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clipboard } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useWorkOrderDetailsData } from '@/hooks/useWorkOrderDetailsData';
import { useWorkOrderDetailsActions } from '@/hooks/useWorkOrderDetailsActions';
import { useWorkOrderEquipment } from '@/hooks/useWorkOrderEquipment';
import { logNavigationEvent } from '@/utils/navigationDebug';
import WorkOrderDetailsInfo from '@/components/work-orders/WorkOrderDetailsInfo';
import WorkOrderTimeline from '@/components/work-orders/WorkOrderTimeline';
import WorkOrderNotesSection from '@/components/work-orders/WorkOrderNotesSection';
import WorkOrderImagesSection from '@/components/work-orders/WorkOrderImagesSection';
import WorkOrderFormEnhanced from '@/components/work-orders/WorkOrderFormEnhanced';
import PMChecklistComponent from '@/components/work-orders/PMChecklistComponent';
import WorkOrderCostsSection from '@/components/work-orders/WorkOrderCostsSection';
import { WorkOrderEquipmentSelector } from '@/components/work-orders/WorkOrderEquipmentSelector';
import { WorkOrderDetailsMobileHeader } from '@/components/work-orders/details/WorkOrderDetailsMobileHeader';
import { WorkOrderDetailsDesktopHeader } from '@/components/work-orders/details/WorkOrderDetailsDesktopHeader';
import { WorkOrderDetailsStatusLockWarning } from '@/components/work-orders/details/WorkOrderDetailsStatusLockWarning';
import { WorkOrderDetailsPMInfo } from '@/components/work-orders/details/WorkOrderDetailsPMInfo';
import { WorkOrderDetailsSidebar } from '@/components/work-orders/details/WorkOrderDetailsSidebar';

const WorkOrderDetails = () => {
  const { workOrderId } = useParams<{ workOrderId: string }>();
  const isMobile = useIsMobile();

  // State for selected equipment (for multi-equipment work orders)
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>('');

  // Use custom hooks for data and actions
  const {
    workOrder,
    equipment,
    pmData,
    workOrderLoading,
    pmLoading,
    permissionLevels,
    formMode,
    isWorkOrderLocked,
    canAddCosts,
    canEditCosts,
    canAddNotes,
    canUpload,
    canEdit,
    baseCanAddNotes,
    currentOrganization
  } = useWorkOrderDetailsData(workOrderId || '', selectedEquipmentId);

  // Update selectedEquipmentId when workOrder loads
  React.useEffect(() => {
    if (workOrder?.equipment_id && !selectedEquipmentId) {
      setSelectedEquipmentId(workOrder.equipment_id);
    }
  }, [workOrder?.equipment_id, selectedEquipmentId]);
  
  // Fetch linked equipment for multi-equipment support
  const { data: linkedEquipment = [] } = useWorkOrderEquipment(workOrderId || '');

  const {
    isEditFormOpen,
    showMobileSidebar,
    setShowMobileSidebar,
    handleEditWorkOrder,
    handleCloseEditForm,
    handleUpdateWorkOrder,
    handleStatusUpdate,
    handlePMUpdate
  } = useWorkOrderDetailsActions(workOrderId || '', currentOrganization?.id || '');

  // Only redirect if we definitely don't have the required data and aren't loading
  if (!workOrderId) {
    logNavigationEvent('REDIRECT_NO_WORK_ORDER_ID');
    return <Navigate to="/dashboard/work-orders" replace />;
  }

  // Show loading state while fetching data or organization
  if (workOrderLoading || !currentOrganization) {
    logNavigationEvent('LOADING_STATE', { workOrderLoading, hasOrganization: !!currentOrganization });
    return (
      <div className="space-y-6 p-4">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  // Only redirect if we're done loading and definitely don't have the work order
  if (!workOrder) {
    logNavigationEvent('REDIRECT_NO_WORK_ORDER_DATA', { workOrderId });
    return <Navigate to="/dashboard/work-orders" replace />;
  }

  // Log successful navigation to work order details
  logNavigationEvent('SUCCESSFUL_RENDER', { 
    workOrderId, 
    formMode, 
    hasPermissions: !!permissionLevels,
    organizationId: currentOrganization.id 
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <WorkOrderDetailsMobileHeader
        workOrder={workOrder}
        canEdit={canEdit}
        organizationId={currentOrganization.id}
        onEditClick={handleEditWorkOrder}
        onToggleSidebar={() => setShowMobileSidebar(!showMobileSidebar)}
      />

      {/* Desktop Header */}
      <WorkOrderDetailsDesktopHeader
        workOrder={workOrder}
        formMode={formMode}
        permissionLevels={permissionLevels}
        canEdit={canEdit}
        onEditClick={handleEditWorkOrder}
      />

      {/* Status Lock Warning */}
      <WorkOrderDetailsStatusLockWarning
        workOrder={workOrder}
        isWorkOrderLocked={isWorkOrderLocked}
        baseCanAddNotes={baseCanAddNotes}
        isAdmin={permissionLevels.isManager}
        onStatusUpdate={handleStatusUpdate}
      />

      <div className={`${isMobile ? 'block' : 'grid grid-cols-1 lg:grid-cols-3 gap-6'} p-4 lg:p-6`}>
        {/* Main Content */}
        <div className={`${isMobile ? 'space-y-4' : 'lg:col-span-2 space-y-6'}`}>
          {/* Equipment Selector for Multi-Equipment Work Orders */}
          {linkedEquipment.length > 1 && (
            <WorkOrderEquipmentSelector
              workOrderId={workOrder.id}
              selectedEquipmentId={selectedEquipmentId}
              onEquipmentChange={setSelectedEquipmentId}
            />
          )}

          {/* Work Order Details */}
          <WorkOrderDetailsInfo workOrder={workOrder} equipment={equipment} />

          {/* Costs Section - Now positioned above PM checklist and only show to managers and technicians */}
          {(permissionLevels.isManager || permissionLevels.isTechnician) && (
            <WorkOrderCostsSection 
              workOrderId={workOrder.id}
              canAddCosts={canAddCosts && !isWorkOrderLocked}
              canEditCosts={canEditCosts && !isWorkOrderLocked}
            />
          )}

          {/* PM Checklist Section - Now positioned after costs */}
          {workOrder.has_pm && pmData && (permissionLevels.isManager || permissionLevels.isTechnician) && (
            <PMChecklistComponent 
              key={selectedEquipmentId} // Force re-render on equipment change
              pm={pmData} 
              onUpdate={handlePMUpdate}
              readOnly={isWorkOrderLocked || (!permissionLevels.isManager && !permissionLevels.isTechnician)}
              isAdmin={permissionLevels.isManager}
              workOrder={workOrder}
              equipment={equipment}
              team={{ name: workOrder.teamName }}
              organization={currentOrganization}
              assignee={{ name: workOrder.assigneeName }}
            />
          )}

          {/* PM Loading State */}
          {workOrder.has_pm && pmLoading && (permissionLevels.isManager || permissionLevels.isTechnician) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clipboard className="h-5 w-5" />
                  Loading PM Checklist...
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-32 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          )}

          {/* PM Info for Requestors */}
          <WorkOrderDetailsPMInfo 
            workOrder={workOrder}
            pmData={pmData}
            permissionLevels={permissionLevels}
          />

          {/* Notes Section */}
          <WorkOrderNotesSection 
            workOrderId={workOrder.id}
            canAddNotes={canAddNotes}
            showPrivateNotes={permissionLevels.isManager}
          />

          {/* Images Section */}
          <WorkOrderImagesSection 
            workOrderId={workOrder.id}
            canUpload={canUpload}
          />

          {/* Timeline - Show appropriate level of detail based on permissions */}
          <WorkOrderTimeline 
            workOrder={workOrder} 
            showDetailedHistory={permissionLevels.isManager}
          />
        </div>

        {/* Sidebar - Mobile overlay or desktop sidebar */}
        <WorkOrderDetailsSidebar
          workOrder={workOrder}
          equipment={equipment}
          pmData={pmData}
          formMode={formMode}
          permissionLevels={permissionLevels}
          currentOrganization={currentOrganization}
          showMobileSidebar={showMobileSidebar}
          onCloseMobileSidebar={() => setShowMobileSidebar(false)}
        />
      </div>

      {/* Edit Work Order Form - Pass workOrder for edit mode */}
      <WorkOrderFormEnhanced
        open={isEditFormOpen}
        onClose={handleCloseEditForm}
        workOrder={workOrder}
        onSubmit={handleUpdateWorkOrder}
      />
    </div>
  );
};

export default WorkOrderDetails;
