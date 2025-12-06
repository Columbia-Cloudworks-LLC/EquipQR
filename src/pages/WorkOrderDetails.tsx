import React, { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clipboard } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useWorkOrderDetailsData } from '@/components/work-orders/hooks/useWorkOrderDetailsData';
import { useWorkOrderDetailsActions } from '@/hooks/useWorkOrderDetailsActions';
import { useWorkOrderEquipment } from '@/hooks/useWorkOrderEquipment';
import { logNavigationEvent } from '@/utils/navigationDebug';
import WorkOrderDetailsInfo from '@/components/work-orders/WorkOrderDetailsInfo';
import WorkOrderTimeline from '@/components/work-orders/WorkOrderTimeline';
import WorkOrderNotesSection from '@/components/work-orders/WorkOrderNotesSection';
import WorkOrderImagesSection from '@/components/work-orders/WorkOrderImagesSection';
import WorkOrderForm from '@/components/work-orders/WorkOrderForm';
import PMChecklistComponent from '@/components/work-orders/PMChecklistComponent';
import WorkOrderCostsSection from '@/components/work-orders/WorkOrderCostsSection';
import { WorkOrderEquipmentSelector } from '@/components/work-orders/WorkOrderEquipmentSelector';
import { WorkOrderDetailsMobileHeader } from '@/components/work-orders/details/WorkOrderDetailsMobileHeader';
import { WorkOrderDetailsDesktopHeader } from '@/components/work-orders/details/WorkOrderDetailsDesktopHeader';
import { WorkOrderDetailsStatusLockWarning } from '@/components/work-orders/details/WorkOrderDetailsStatusLockWarning';
import { WorkOrderDetailsPMInfo } from '@/components/work-orders/details/WorkOrderDetailsPMInfo';
import { PMChangeWarningDialog } from '@/components/work-orders/form/PMChangeWarningDialog';
import { WorkOrderDetailsSidebar } from '@/components/work-orders/details/WorkOrderDetailsSidebar';
import { WorkOrderDetailsMobile } from '@/components/work-orders/details/WorkOrderDetailsMobile';
import { WorkOrderNotesMobile } from '@/components/work-orders/details/WorkOrderNotesMobile';
import { useInitializePMChecklist } from '@/hooks/useInitializePMChecklist';
import { PMChecklistItem } from '@/services/preventativeMaintenanceService';
import { toast } from 'sonner';

const WorkOrderDetails = () => {
  const { workOrderId } = useParams<{ workOrderId: string }>();
  const isMobile = useIsMobile();

  // State for selected equipment (for multi-equipment work orders)
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>('');
  const [pmInitializing, setPmInitializing] = useState(false);

  // Use custom hooks for data and actions
  const {
    workOrder,
    equipment,
    pmData,
    workOrderLoading,
    pmLoading,
    pmError,
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

  const initializePMChecklist = useInitializePMChecklist();

  // Update selectedEquipmentId when workOrder loads
  React.useEffect(() => {
    if (workOrder?.equipment_id && !selectedEquipmentId) {
      setSelectedEquipmentId(workOrder.equipment_id);
    }
  }, [workOrder?.equipment_id, selectedEquipmentId]);

  // Auto-initialize PM if work order has_pm=true but no PM record exists
  // Use ref to prevent multiple initializations
  const pmInitializationAttempted = React.useRef<string | null>(null);
  
  React.useEffect(() => {
    const workOrderKey = workOrder?.id && workOrder?.equipment_id 
      ? `${workOrder.id}-${selectedEquipmentId || workOrder.equipment_id}` 
      : null;

    // Only initialize if we're certain no PM exists
    // Don't initialize if:
    // - Query is loading (wait for it to finish)
    // - Query is in error state (might be RLS issue - don't create duplicate)
    // - We've already attempted initialization for this work order/equipment combo
    const shouldInitializePM = 
      workOrderKey &&
      workOrderKey !== pmInitializationAttempted.current &&
      workOrder?.has_pm && 
      !pmData && 
      !pmLoading && // Query has finished loading
      !pmError && // Don't initialize if query has error - might be RLS issue causing 406
      !pmInitializing &&
      !workOrderLoading &&
      workOrder?.equipment_id &&
      currentOrganization?.id &&
      (permissionLevels.isManager || permissionLevels.isTechnician);

    if (shouldInitializePM) {
      pmInitializationAttempted.current = workOrderKey;
      setPmInitializing(true);
      const equipmentId = selectedEquipmentId || workOrder.equipment_id;
      
      initializePMChecklist.mutate(
        {
          workOrderId: workOrder.id,
          equipmentId: equipmentId,
          organizationId: currentOrganization.id,
          templateId: equipment?.default_pm_template_id || undefined
        },
        {
          onSuccess: () => {
            toast.success('PM checklist initialized');
            setPmInitializing(false);
          },
          onError: (error) => {
            console.error('Failed to initialize PM:', error);
            toast.error('Failed to initialize PM checklist');
            setPmInitializing(false);
            // Reset the ref so we can try again
            pmInitializationAttempted.current = null;
          }
        }
      );
    }

    // Reset ref when pmData appears (PM was successfully created or loaded)
    // BUT only reset if the PM ID matches what we were initializing
    // This prevents resetting when a different PM appears (like after a re-initialization bug)
    if (pmData && pmInitializationAttempted.current === workOrderKey) {
      // Check if this is the PM we just initialized or loaded
      // If PM data exists and matches our work order, clear the ref
      if (pmData.work_order_id === workOrder?.id) {
        pmInitializationAttempted.current = null;
      }
    }
  }, [
    workOrder?.has_pm,
    workOrder?.id,
    workOrder?.equipment_id,
    pmData,
    pmLoading,
    pmInitializing,
    workOrderLoading,
    selectedEquipmentId,
    currentOrganization?.id,
    permissionLevels.isManager,
    permissionLevels.isTechnician,
    equipment?.default_pm_template_id,
    initializePMChecklist,
    pmError
  ]);
  
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
    handlePMUpdate,
    // PM warning dialog state
    showPMWarning,
    setShowPMWarning,
    pmChangeType,
    handleConfirmPMChange,
    handleCancelPMChange,
    getPMDataDetails,
    isUpdating,
  } = useWorkOrderDetailsActions(workOrderId || '', currentOrganization?.id || '', pmData);

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
        workOrder={{
          ...workOrder,
          equipment: equipment ? {
            name: equipment.name,
            status: equipment.status,
            location: equipment.location
          } : undefined,
          team: workOrder.teamName ? { name: workOrder.teamName } : undefined,
          created_at: workOrder.createdAt
        }}
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

          {/* Mobile-Optimized Layout */}
          {isMobile ? (
            <>
              {/* Mobile Work Order Details */}
              <WorkOrderDetailsMobile
                workOrder={{
                  ...workOrder,
                  created_at: workOrder.createdAt,
                  due_date: workOrder.dueDate,
                  has_pm: workOrder.has_pm,
                  pm_status: pmData?.status,
                  pm_progress: pmData ? (() => {
                    try {
                      const checklist = typeof pmData.checklist_data === 'string' 
                        ? JSON.parse(pmData.checklist_data) 
                        : pmData.checklist_data;
                      return Array.isArray(checklist) 
                        ? checklist.filter((item: PMChecklistItem) => item.condition !== null && item.condition !== undefined).length 
                        : 0;
                    } catch {
                      return 0;
                    }
                  })() : 0,
                  pm_total: pmData ? (() => {
                    try {
                      const checklist = typeof pmData.checklist_data === 'string' 
                        ? JSON.parse(pmData.checklist_data) 
                        : pmData.checklist_data;
                      return Array.isArray(checklist) ? checklist.length : 0;
                    } catch {
                      return 0;
                    }
                  })() : 0
                }}
                equipment={equipment ? {
                  id: equipment.id,
                  name: equipment.name,
                  manufacturer: equipment.manufacturer,
                  model: equipment.model,
                  serial_number: equipment.serialNumber,
                  status: equipment.status,
                  location: equipment.location
                } : undefined}
                team={workOrder.teamName ? { id: '', name: workOrder.teamName } : undefined}
                assignee={workOrder.assigneeName ? { id: '', name: workOrder.assigneeName } : undefined}
                costs={undefined} // TODO: Add costs data
                onStatusChange={handleStatusUpdate}
                onPriorityChange={() => {
                  // TODO: Implement priority change
                  // Priority change functionality to be implemented
                }}
                onViewEquipment={() => {
                  if (equipment) {
                    window.location.href = `/dashboard/equipment/${equipment.id}`;
                  }
                }}
                onAddNote={() => {
                  // TODO: Focus on notes section
                  // Add note functionality to be implemented
                }}
                onUploadImage={() => {
                  // TODO: Focus on images section
                  // Upload image functionality to be implemented
                }}
                onDownloadPDF={() => {
                  // TODO: Implement PDF download
                  // PDF download functionality to be implemented
                }}
                onViewPMDetails={() => {
                  // TODO: Expand PM details
                  // View PM details functionality to be implemented
                }}
                canEdit={canEdit}
              />

              {/* PM Checklist - Responsive */}
              {workOrder.has_pm && pmData && (permissionLevels.isManager || permissionLevels.isTechnician) && (
                <PMChecklistComponent
                  pm={pmData}
                  onUpdate={() => {
                    // Refresh PM data after updates
                    // PM data has been updated
                  }}
                  readOnly={isWorkOrderLocked || (!permissionLevels.isManager && !permissionLevels.isTechnician)}
                  isAdmin={permissionLevels.isManager}
                  workOrder={workOrder}
                  equipment={equipment}
                  team={workOrder.team}
                  organization={currentOrganization}
                  assignee={workOrder.assignee}
                />
              )}

              {/* Mobile PM Loading State */}
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

              {/* Mobile PM Info for Requestors */}
              <WorkOrderDetailsPMInfo 
                workOrder={workOrder}
                pmData={pmData}
                permissionLevels={permissionLevels}
              />

              {/* Mobile Notes Section */}
              <WorkOrderNotesMobile 
                workOrderId={workOrder.id}
                canAddNotes={canAddNotes}
                showPrivateNotes={permissionLevels.isManager}
                onAddNote={() => {
                  // TODO: Implement note addition
                  // Add note functionality to be implemented
                }}
              />

              {/* Mobile Images Section */}
              <WorkOrderImagesSection 
                workOrderId={workOrder.id}
                canUpload={canUpload}
              />

              {/* Mobile Timeline */}
              <WorkOrderTimeline 
                workOrder={workOrder} 
                showDetailedHistory={permissionLevels.isManager}
              />
            </>
          ) : (
            <>
              {/* Desktop Layout - Keep existing structure */}
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
            </>
          )}
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
      <WorkOrderForm
        open={isEditFormOpen}
        onClose={handleCloseEditForm}
        workOrder={workOrder}
        onSubmit={(data) => handleUpdateWorkOrder(data, workOrder.has_pm, workOrder.equipment_id)}
        isUpdating={isUpdating}
        pmData={pmData}
      />

      {/* PM Change Warning Dialog */}
      <PMChangeWarningDialog
        open={showPMWarning}
        onOpenChange={setShowPMWarning}
        onConfirm={handleConfirmPMChange}
        onCancel={handleCancelPMChange}
        changeType={pmChangeType}
        hasExistingNotes={getPMDataDetails().hasNotes}
        hasCompletedItems={getPMDataDetails().hasCompletedItems}
      />
    </div>
  );
};

export default WorkOrderDetails;
