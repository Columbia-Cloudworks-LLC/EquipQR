import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clipboard, CheckCircle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useWorkOrderDetailsData } from '@/features/work-orders/components/hooks/useWorkOrderDetailsData';
import { useWorkOrderDetailsActions } from '@/features/work-orders/hooks/useWorkOrderDetailsActions';
import { useWorkOrderEquipment } from '@/features/work-orders/hooks/useWorkOrderEquipment';
import { useUpdateWorkOrderStatus } from '@/features/work-orders/hooks/useWorkOrderData';
import { useWorkOrderExcelExport } from '@/features/work-orders/hooks/useWorkOrderExcelExport';
import { logNavigationEvent } from '@/utils/navigationDebug';
import WorkOrderDetailsInfo from '@/features/work-orders/components/WorkOrderDetailsInfo';
import WorkOrderTimeline from '@/features/work-orders/components/WorkOrderTimeline';
import WorkOrderNotesSection from '@/features/work-orders/components/WorkOrderNotesSection';
import WorkOrderImagesSection from '@/features/work-orders/components/WorkOrderImagesSection';
import WorkOrderForm from '@/features/work-orders/components/WorkOrderForm';
import PMChecklistComponent from '@/features/work-orders/components/PMChecklistComponent';
import WorkOrderCostsSection from '@/features/work-orders/components/WorkOrderCostsSection';
import { WorkOrderEquipmentSelector } from '@/features/work-orders/components/WorkOrderEquipmentSelector';
import { WorkOrderDetailsMobileHeader } from '@/features/work-orders/components/WorkOrderDetailsMobileHeader';
import { WorkOrderDetailsDesktopHeader } from '@/features/work-orders/components/WorkOrderDetailsDesktopHeader';
import { WorkOrderDetailsStatusLockWarning } from '@/features/work-orders/components/WorkOrderDetailsStatusLockWarning';
import { WorkOrderDetailsPMInfo } from '@/features/work-orders/components/WorkOrderDetailsPMInfo';
import { PMChangeWarningDialog } from '@/features/work-orders/components/PMChangeWarningDialog';
import { WorkOrderDetailsSidebar } from '@/features/work-orders/components/WorkOrderDetailsSidebar';
import { WorkOrderDetailsMobile } from '@/features/work-orders/components/WorkOrderDetailsMobile';
import { WorkOrderNotesMobile } from '@/features/work-orders/components/WorkOrderNotesMobile';
import { WorkOrderPDFExportDialog } from '@/features/work-orders/components/WorkOrderPDFExportDialog';
import { MobileWorkOrderActionSheet } from '@/features/work-orders/components/MobileWorkOrderActionSheet';
import { MobileWorkOrderInProgressBar } from '@/features/work-orders/components/MobileWorkOrderInProgressBar';
import { useWorkTimer } from '@/features/work-orders/hooks/useWorkTimer';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useInitializePMChecklist } from '@/features/pm-templates/hooks/useInitializePMChecklist';
import { PMChecklistItem } from '@/features/pm-templates/services/preventativeMaintenanceService';
import { toast } from 'sonner';
import { useWorkOrderPDF } from '@/features/work-orders/hooks/useWorkOrderPDFData';
import { HistoryTab } from '@/components/audit';
import { cn } from '@/lib/utils';

const WorkOrderDetails = () => {
  const { workOrderId } = useParams<{ workOrderId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();

  // Handle quick action query params (from WorkOrderQuickActions dropdown)
  const actionParam = searchParams.get('action');
  const shouldAutoOpenNoteForm = actionParam === 'add-note';
  const shouldAutoOpenPDFDialog = actionParam === 'download-pdf';
  const notesSectionRef = useRef<HTMLDivElement>(null);
  const pmSectionRef = useRef<HTMLDivElement>(null);
  const actionHandledRef = useRef(false);

  // State for selected equipment (for multi-equipment work orders)
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>('');
  const [pmInitializing, setPmInitializing] = useState(false);

  // State for mobile action sheet
  const [showMobileActionSheet, setShowMobileActionSheet] = useState(false);

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

  // Stagger animation: always run hooks (must be before any early returns)
  const [hasAnimated, setHasAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setHasAnimated(true), 500);
    return () => clearTimeout(t);
  }, []);
  const stagger = (i: number) =>
    !hasAnimated
      ? { className: 'animate-stagger-in', style: { animationDelay: `${i * 60}ms` } as React.CSSProperties }
      : {};

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

  // State for PDF export dialog (used for both mobile and quick action navigation)
  const [showMobilePDFDialog, setShowMobilePDFDialog] = useState(false);

  // Excel export hook for mobile action sheet
  const { exportSingle, isExportingSingle } = useWorkOrderExcelExport(
    currentOrganization?.id || '',
    currentOrganization?.name || ''
  );

  // Status update mutation for in-progress bar
  const updateStatusMutation = useUpdateWorkOrderStatus();

  // Timer hook for tracking work time (mobile in-progress bar)
  const workTimer = useWorkTimer(workOrderId || '');

  // Online status for offline indicator
  const { isOnline, isSyncing } = useOnlineStatus();

  // Handle quick action navigation (scroll to notes section and/or open PDF dialog)
  useEffect(() => {
    // Only handle once per navigation
    if (actionHandledRef.current) return;
    if (!workOrder || workOrderLoading) return;

    if (shouldAutoOpenPDFDialog) {
      // Open the PDF export dialog
      setShowMobilePDFDialog(true);
      actionHandledRef.current = true;
      // Clear the action param from URL
      setSearchParams({}, { replace: true });
    } else if (shouldAutoOpenNoteForm) {
      // Scroll to notes section after a short delay to ensure render is complete
      setTimeout(() => {
        notesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      actionHandledRef.current = true;
      // Clear the action param from URL
      setSearchParams({}, { replace: true });
    }
  }, [shouldAutoOpenPDFDialog, shouldAutoOpenNoteForm, workOrder, workOrderLoading, setSearchParams]);

  // Reset action handled ref when action param changes (new navigation)
  useEffect(() => {
    if (!actionParam) {
      actionHandledRef.current = false;
    }
  }, [actionParam]);

  // PDF generation hook for mobile
  const { downloadPDF: downloadMobilePDF, isGenerating: isMobilePDFGenerating } = useWorkOrderPDF({
    workOrder: workOrder ? {
      id: workOrder.id,
      title: workOrder.title,
      description: workOrder.description,
      status: workOrder.status,
      priority: workOrder.priority,
      created_date: workOrder.created_date,
      due_date: workOrder.due_date,
      completed_date: workOrder.completed_date,
      estimated_hours: workOrder.estimated_hours,
      assigneeName: workOrder.assigneeName,
      teamName: workOrder.teamName,
      has_pm: workOrder.has_pm
    } : {
      id: '',
      title: '',
      description: '',
      status: 'submitted',
      priority: 'medium',
      created_date: ''
    },
    equipment: equipment ? {
      id: equipment.id,
      name: equipment.name,
      manufacturer: equipment.manufacturer,
      model: equipment.model,
      serial_number: equipment.serial_number,
      status: equipment.status,
      location: equipment.location
    } : null,
    pmData,
    organizationName: currentOrganization?.name
  });

  // Handle mobile PDF export with options from dialog
  const handleMobilePDFExport = async (options: { includeCosts: boolean }) => {
    // Let errors propagate so the dialog can detect failures and stay open for retry.
    // The useWorkOrderPDF hook already logs and shows a toast on error.
    await downloadMobilePDF(options);
  };

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

  const showFloatingCTA =
    isMobile &&
    !!workOrder.has_pm &&
    !!pmData &&
    pmData.status !== 'completed' &&
    (permissionLevels.isManager || permissionLevels.isTechnician) &&
    !isWorkOrderLocked &&
    workOrder.status !== 'completed' &&
    workOrder.status !== 'cancelled';

  const scrollToPMSection = () => {
    pmSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-background texture-grain">
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
        onOpenActionSheet={() => setShowMobileActionSheet(true)}
      />

      {/* Desktop Header */}
      <WorkOrderDetailsDesktopHeader
        workOrder={workOrder}
        formMode={formMode}
        permissionLevels={permissionLevels}
        canEdit={canEdit}
        onEditClick={handleEditWorkOrder}
        equipmentTeamId={equipment?.team_id}
        equipment={equipment ? {
          id: equipment.id,
          name: equipment.name,
          manufacturer: equipment.manufacturer,
          model: equipment.model,
          serial_number: equipment.serial_number,
          status: equipment.status,
          location: equipment.location
        } : null}
        pmData={pmData}
        organizationName={currentOrganization.name}
        organizationId={currentOrganization.id}
      />

      {/* Status Lock Warning */}
      <WorkOrderDetailsStatusLockWarning
        workOrder={workOrder}
        isWorkOrderLocked={isWorkOrderLocked}
        baseCanAddNotes={baseCanAddNotes}
        isAdmin={permissionLevels.isManager}
        onStatusUpdate={handleStatusUpdate}
      />

      <div className={cn('p-4 lg:p-6', isMobile ? 'block' : 'grid grid-cols-1 lg:grid-cols-3 gap-6')}>
        {/* Main Content */}
        <div
          className={cn(
            isMobile ? 'space-y-4' : 'lg:col-span-2 space-y-6',
            showFloatingCTA && 'pb-24'
          )}
        >
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
              <div {...stagger(0)}>
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
                  serial_number: equipment.serial_number,
                  status: equipment.status,
                  location: equipment.location,
                  team_id: equipment.team_id
                } : undefined}
                team={workOrder.teamName ? { id: workOrder.team_id || '', name: workOrder.teamName } : undefined}
                assignee={workOrder.assigneeName ? { id: '', name: workOrder.assigneeName } : undefined}
                onScrollToPM={scrollToPMSection}
              />
              </div>

              {/* PM Checklist - Responsive */}
              {workOrder.has_pm && (permissionLevels.isManager || permissionLevels.isTechnician) && (
                <div {...stagger(1)}>
                <div ref={pmSectionRef}>
                  {pmData && (
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
                  {pmLoading && (
                    <Card className="shadow-elevation-2">
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
                </div>
                </div>
              )}

              {/* Mobile PM Info for Requestors */}
              <div {...stagger(2)}>
              <WorkOrderDetailsPMInfo 
                workOrder={workOrder}
                pmData={pmData}
                permissionLevels={permissionLevels}
              />
              </div>

              {/* Mobile Notes Section */}
              <div {...stagger(3)}>
              <div ref={notesSectionRef}>
                <WorkOrderNotesMobile 
                  workOrderId={workOrder.id}
                  canAddNotes={canAddNotes}
                  showPrivateNotes={permissionLevels.isManager}
                  autoOpenForm={shouldAutoOpenNoteForm}
                />
              </div>
              </div>

              {/* Mobile Images Section */}
              <div {...stagger(4)}>
              <WorkOrderImagesSection 
                workOrderId={workOrder.id}
                canUpload={canUpload}
              />
              </div>

              {/* Mobile Timeline */}
              <div {...stagger(5)}>
              <WorkOrderTimeline 
                workOrder={workOrder} 
                showDetailedHistory={permissionLevels.isManager}
              />
              </div>

              {/* Mobile Audit History */}
              {permissionLevels.isManager && currentOrganization && (
                <div {...stagger(6)}>
                <Card className="shadow-elevation-2">
                  <CardHeader>
                    <CardTitle>Change History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <HistoryTab 
                      entityType="work_order"
                      entityId={workOrder.id}
                      organizationId={currentOrganization.id}
                    />
                  </CardContent>
                </Card>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Desktop Layout - Keep existing structure */}
              <div {...stagger(0)}>
                <WorkOrderDetailsInfo workOrder={workOrder} equipment={equipment} />
              </div>

              {/* Costs Section - Now positioned above PM checklist and only show to managers and technicians */}
              {(permissionLevels.isManager || permissionLevels.isTechnician) && (
                <div {...stagger(1)}>
                <WorkOrderCostsSection 
                  workOrderId={workOrder.id}
                  canAddCosts={canAddCosts && !isWorkOrderLocked}
                  canEditCosts={canEditCosts && !isWorkOrderLocked}
                  primaryEquipmentId={workOrder.equipment_id}
                />
                </div>
              )}

              {/* PM Checklist Section - Now positioned after costs */}
              {workOrder.has_pm && pmData && (permissionLevels.isManager || permissionLevels.isTechnician) && (
                <div {...stagger(2)}>
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
                </div>
              )}

              {/* PM Loading State */}
              {workOrder.has_pm && pmLoading && (permissionLevels.isManager || permissionLevels.isTechnician) && (
                <div {...stagger(2)}>
                <Card className="shadow-elevation-2">
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
                </div>
              )}

              {/* PM Info for Requestors */}
              <div {...stagger(3)}>
              <WorkOrderDetailsPMInfo 
                workOrder={workOrder}
                pmData={pmData}
                permissionLevels={permissionLevels}
              />
              </div>

              {/* Notes Section */}
              <div {...stagger(4)}>
              <div ref={notesSectionRef}>
                <WorkOrderNotesSection 
                  workOrderId={workOrder.id}
                  canAddNotes={canAddNotes}
                  showPrivateNotes={permissionLevels.isManager}
                  autoOpenForm={shouldAutoOpenNoteForm}
                />
              </div>
              </div>

              {/* Images Section */}
              <div {...stagger(5)}>
              <WorkOrderImagesSection 
                workOrderId={workOrder.id}
                canUpload={canUpload}
              />
              </div>

              {/* Timeline - Show appropriate level of detail based on permissions */}
              <div {...stagger(6)}>
              <WorkOrderTimeline 
                workOrder={workOrder} 
                showDetailedHistory={permissionLevels.isManager}
              />
              </div>

              {/* Audit History - Only visible to managers */}
              {permissionLevels.isManager && currentOrganization && (
                <div {...stagger(7)}>
                <Card className="shadow-elevation-2">
                  <CardHeader>
                    <CardTitle>Change History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <HistoryTab 
                      entityType="work_order"
                      entityId={workOrder.id}
                      organizationId={currentOrganization.id}
                    />
                  </CardContent>
                </Card>
                </div>
              )}
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

      {/* Mobile floating Complete PM CTA */}
      {showFloatingCTA && (
        <div className="fixed bottom-[70px] left-0 right-0 z-fixed border-t bg-background p-4 pb-safe-bottom lg:hidden">
          <Button
            className="h-12 w-full min-h-[44px] font-medium"
            size="lg"
            onClick={scrollToPMSection}
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            Complete PM
          </Button>
        </div>
      )}

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

      {/* Mobile PDF Export Dialog */}
      <WorkOrderPDFExportDialog
        open={showMobilePDFDialog}
        onOpenChange={setShowMobilePDFDialog}
        onExport={handleMobilePDFExport}
        isExporting={isMobilePDFGenerating}
        showCostsOption={permissionLevels.isManager}
      />

      {/* Mobile Action Sheet */}
      {isMobile && (
        <MobileWorkOrderActionSheet
          open={showMobileActionSheet}
          onOpenChange={setShowMobileActionSheet}
          workOrderId={workOrder.id}
          workOrderStatus={workOrder.status}
          equipmentTeamId={equipment?.team_id}
          canAddNotes={canAddNotes}
          canUploadImages={canUpload}
          isManager={permissionLevels.isManager}
          onAddNote={() => {
            notesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          onAddPhoto={() => {
            // Navigate to images section - for now just scroll to notes
            notesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          onDownloadPDF={() => setShowMobilePDFDialog(true)}
          onExportExcel={() => exportSingle(workOrder.id)}
          isExportingExcel={isExportingSingle}
        />
      )}

      {/* Mobile In-Progress Bar */}
      {isMobile && 
        (workOrder.status === 'in_progress' || workOrder.status === 'on_hold') && 
        (permissionLevels.isManager || permissionLevels.isTechnician) &&
        !isWorkOrderLocked &&
        !showFloatingCTA && (
        <MobileWorkOrderInProgressBar
          workOrderId={workOrder.id}
          workOrderStatus={workOrder.status}
          canComplete={!workOrder.has_pm || (pmData?.status === 'completed')}
          canChangeStatus={permissionLevels.isManager || permissionLevels.isTechnician}
          canAddNotes={canAddNotes}
          isUpdatingStatus={updateStatusMutation.isPending}
          timerDisplay={workTimer.displayTime}
          isTimerRunning={workTimer.isRunning}
          isOnline={isOnline}
          isSyncing={isSyncing}
          onAddNote={() => {
            notesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          onAddPhoto={() => {
            notesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          onPauseResume={() => {
            const newStatus = workOrder.status === 'on_hold' ? 'in_progress' : 'on_hold';
            // Pause/resume timer along with work order status
            if (newStatus === 'on_hold') {
              workTimer.pause();
            } else {
              workTimer.start();
            }
            updateStatusMutation.mutate({
              workOrderId: workOrder.id,
              status: newStatus,
              organizationId: currentOrganization.id,
            });
          }}
          onComplete={() => {
            // Stop timer and get hours worked for potential note creation
            const hoursWorked = workTimer.stopAndGetHours();
            if (hoursWorked > 0) {
              toast.success(`Timer stopped: ${hoursWorked.toFixed(2)} hours worked`);
            }
            updateStatusMutation.mutate({
              workOrderId: workOrder.id,
              status: 'completed',
              organizationId: currentOrganization.id,
            });
          }}
          onToggleTimer={() => {
            if (workTimer.isRunning) {
              workTimer.pause();
            } else {
              workTimer.start();
            }
          }}
        />
      )}
    </div>
  );
};

export default WorkOrderDetails;
