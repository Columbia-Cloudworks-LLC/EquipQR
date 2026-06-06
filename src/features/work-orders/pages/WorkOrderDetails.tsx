// fallow-ignore-file code-duplication
// Duplication rationale: Large details page with repeated section chrome
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useSearchParams, Navigate } from 'react-router-dom';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { CheckCircle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useWorkOrderDetailsData } from '@/features/work-orders/components/hooks/useWorkOrderDetailsData';
import { useWorkOrderDetailsActions } from '@/features/work-orders/hooks/useWorkOrderDetailsActions';
import { useWorkOrderEquipment } from '@/features/work-orders/hooks/useWorkOrderEquipment';
import { useWorkOrderExcelExport } from '@/features/work-orders/hooks/useWorkOrderExcelExport';
import { logNavigationEvent } from '@/utils/navigationDebug';
import WorkOrderForm from '@/features/work-orders/components/WorkOrderForm';
import { WorkOrderEquipmentSelector } from '@/features/work-orders/components/WorkOrderEquipmentSelector';
import { WorkOrderDetailsMobileHeader } from '@/features/work-orders/components/WorkOrderDetailsMobileHeader';
import { WorkOrderDetailsDesktopHeader } from '@/features/work-orders/components/WorkOrderDetailsDesktopHeader';
import { PMChangeWarningDialog } from '@/features/work-orders/components/PMChangeWarningDialog';
import { WorkOrderDetailsSidebar } from '@/features/work-orders/components/WorkOrderDetailsSidebar';
import { WorkOrderPDFExportDialog } from '@/features/work-orders/components/WorkOrderPDFExportDialog';
import { MobileWorkOrderActionSheet } from '@/features/work-orders/components/MobileWorkOrderActionSheet';
import { MobileWorkOrderActionFooter } from '@/features/work-orders/components/MobileWorkOrderActionFooter';
import { useWorkTimer } from '@/features/work-orders/hooks/useWorkTimer';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useInitializePMChecklist } from '@/features/pm-templates/hooks/useInitializePMChecklist';
import { getPMChecklistStats } from '@/features/work-orders/utils/pmChecklistStats';
import { toast } from 'sonner';
import { useWorkOrderPDF } from '@/features/work-orders/hooks/useWorkOrderPDFData';
import { useGoogleWorkspaceConnectionStatus } from '@/features/organization/hooks/useGoogleWorkspaceConnectionStatus';
import { useGoogleWorkspaceExportDestination } from '@/features/organization/hooks/useGoogleWorkspaceExportDestination';
import { cn } from '@/lib/utils';
import { canExportWorkOrderGoogleDoc } from '@/features/work-orders/utils/googleDocsExportAvailability';
import { useAuth } from '@/hooks/useAuth';
import { isOfflineId } from '@/features/work-orders/hooks/useOfflineMergedWorkOrders';
import { useWorkOrderStatusUpdate } from '@/features/work-orders/hooks/useWorkOrderStatusUpdate';
import { useOfflineQueue } from '@/contexts/OfflineQueueContext';
import type { WorkOrderStatus } from '@/features/work-orders/types/workOrder';
import { useWorkOrderAcceptance } from '@/features/work-orders/hooks/useWorkOrderAcceptance';
import WorkOrderAcceptanceModal from '@/features/work-orders/components/WorkOrderAcceptanceModal';
import type { WorkOrderLike } from '@/features/work-orders/utils/workOrderTypeConversion';
import {
  buildEquipmentPdfInput,
  buildMobileEquipmentSummary,
  buildMobileWorkOrderAssigneeSummary,
  buildMobileWorkOrderSummary,
  buildOfflineSyncState,
  buildWorkOrderAssigneeSummary,
  buildWorkOrderPdfInput,
  buildWorkOrderTeamSummary,
  isFooterRoleEligible,
  shouldHideInlineNoteAddButton,
  shouldShowMobileActionFooter,
} from '@/features/work-orders/utils/workOrderDetailsViewModel';
import { WorkOrderDetailsMobileContent } from '@/features/work-orders/components/WorkOrderDetailsMobileContent';
import { WorkOrderDetailsDesktopContent } from '@/features/work-orders/components/WorkOrderDetailsDesktopContent';

const WorkOrderDetails = () => {
  const { workOrderId } = useParams<{ workOrderId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();

  const actionParam = searchParams.get('action');
  const shouldAutoOpenNoteForm = actionParam === 'add-note';
  const shouldAutoOpenPDFDialog = actionParam === 'download-pdf';
  const shouldAutoFocusPM = actionParam === 'pm';
  const notesSectionRef = useRef<HTMLDivElement>(null);
  const pmSectionRef = useRef<HTMLDivElement>(null);
  const actionHandledRef = useRef(false);

  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>('');
  const [pmInitializing, setPmInitializing] = useState(false);
  const [showMobileActionSheet, setShowMobileActionSheet] = useState(false);
  const [showMobileCompleteDialog, setShowMobileCompleteDialog] = useState(false);
  const [showFieldAcceptDialog, setShowFieldAcceptDialog] = useState(false);
  const [openNoteFormTrigger, setOpenNoteFormTrigger] = useState(0);
  const [openCaptureTrigger, setOpenCaptureTrigger] = useState(0);
  const [mobileReviewOpen, setMobileReviewOpen] = useState(false);

  const { user } = useAuth();

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
  const fieldAcceptanceMutation = useWorkOrderAcceptance();

  const documentTitle = workOrder
    ? `${workOrder.title}${equipment ? ` – ${equipment.name}` : ''}`
    : undefined;
  useDocumentTitle(documentTitle);

  React.useEffect(() => {
    if (workOrder?.equipment_id && !selectedEquipmentId) {
      setSelectedEquipmentId(workOrder.equipment_id);
    }
  }, [workOrder?.equipment_id, selectedEquipmentId]);

  const hasWorkOrder = !!workOrder;
  const teamName = workOrder?.teamName;
  const assigneeName = workOrder?.assigneeName;
  const teamData = useMemo(
    () => hasWorkOrder ? { name: teamName } : undefined,
    [hasWorkOrder, teamName]
  );
  const assigneeData = useMemo(
    () => hasWorkOrder ? { name: assigneeName } : undefined,
    [hasWorkOrder, assigneeName]
  );

  const [hasAnimated, setHasAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setHasAnimated(true), 500);
    return () => clearTimeout(t);
  }, []);
  const stagger = (i: number) =>
    !hasAnimated
      ? { className: 'animate-stagger-in', style: { animationDelay: `${i * 60}ms` } as React.CSSProperties }
      : {};

  const pmInitializationAttempted = React.useRef<string | null>(null);

  React.useEffect(() => {
    const workOrderKey = workOrder?.id && workOrder?.equipment_id
      ? `${workOrder.id}-${selectedEquipmentId || workOrder.equipment_id}`
      : null;

    const shouldInitializePM =
      workOrderKey &&
      workOrderKey !== pmInitializationAttempted.current &&
      workOrder?.has_pm &&
      !pmData &&
      !pmLoading &&
      !pmError &&
      !pmInitializing &&
      !workOrderLoading &&
      !isOfflineId(workOrder.id) &&
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
          onSuccess: (result) => {
            if (result !== null) {
              toast.success('PM checklist initialized');
            }
            setPmInitializing(false);
          },
          onError: (error) => {
            console.error('Failed to initialize PM:', error);
            toast.error('Failed to initialize PM checklist');
            setPmInitializing(false);
            pmInitializationAttempted.current = null;
          }
        }
      );
    }

    if (pmData && pmInitializationAttempted.current === workOrderKey) {
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
    showPMWarning,
    setShowPMWarning,
    pmChangeType,
    handleConfirmPMChange,
    handleCancelPMChange,
    getPMDataDetails,
    isUpdating,
  } = useWorkOrderDetailsActions(workOrderId || '', currentOrganization?.id || '', pmData);

  const [showMobilePDFDialog, setShowMobilePDFDialog] = useState(false);

  const { exportSingle, isExportingSingle, exportSingleToDocs, isExportingSingleToDocs } = useWorkOrderExcelExport(
    currentOrganization?.id || '',
    currentOrganization?.name || ''
  );

  const mobileStatusMutation = useWorkOrderStatusUpdate();
  const workTimer = useWorkTimer(workOrderId);
  const offlineQueue = useOfflineQueue();

  useEffect(() => {
    if (actionHandledRef.current) return;
    if (!workOrder || workOrderLoading) return;

    if (shouldAutoOpenPDFDialog) {
      setShowMobilePDFDialog(true);
      actionHandledRef.current = true;
      setSearchParams({}, { replace: true });
    } else if (shouldAutoOpenNoteForm) {
      setTimeout(() => {
        notesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      actionHandledRef.current = true;
      setSearchParams({}, { replace: true });
    } else if (shouldAutoFocusPM) {
      setTimeout(() => {
        pmSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      actionHandledRef.current = true;
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('action');
          return next;
        },
        { replace: true }
      );
    }
  }, [
    shouldAutoOpenPDFDialog,
    shouldAutoOpenNoteForm,
    shouldAutoFocusPM,
    workOrder,
    workOrderLoading,
    setSearchParams,
  ]);

  useEffect(() => {
    if (!actionParam) {
      actionHandledRef.current = false;
    }
  }, [actionParam]);

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
    organizationName: currentOrganization?.name,
    teamId: equipment?.team_id,
  });

  const { isConnected: isGoogleWorkspaceConnected, connectionStatus } = useGoogleWorkspaceConnectionStatus({
    organizationId: currentOrganization?.id,
  });
  const { destination: googleDocsDestination } = useGoogleWorkspaceExportDestination(currentOrganization?.id, permissionLevels.isManager);
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

  const updateMobileStatus = useCallback((newStatus: WorkOrderStatus, onSuccess?: () => void) => {
    if (!workOrder) return;
    mobileStatusMutation.mutate(
      {
        workOrderId: workOrder.id,
        newStatus,
        serverUpdatedAt: workOrder.updated_at ?? undefined,
      },
      { onSuccess },
    );
  }, [mobileStatusMutation, workOrder]);

  const startMobileWorkOrder = useCallback(() => {
    updateMobileStatus('in_progress', () => {
      workTimer.start();
    });
  }, [updateMobileStatus, workTimer]);

  const putAssignedMobileWorkOrderOnHold = useCallback(() => {
    updateMobileStatus('on_hold');
  }, [updateMobileStatus]);

  const pauseResumeMobileWorkOrder = useCallback(() => {
    if (!workOrder) return;
    const newStatus: WorkOrderStatus = workOrder.status === 'on_hold' ? 'in_progress' : 'on_hold';
    updateMobileStatus(newStatus, () => {
      if (newStatus === 'on_hold') {
        workTimer.pause();
        toast('Work order paused', {
          action: {
            label: 'Undo',
            onClick: () => {
              updateMobileStatus('in_progress', () => workTimer.start());
            },
          },
          duration: 5000,
        });
      } else {
        workTimer.start();
      }
    });
  }, [updateMobileStatus, workOrder, workTimer]);

  const handleFieldAcceptComplete = useCallback(async (assigneeId?: string) => {
    if (!workOrder || !currentOrganization?.id) return;
    await fieldAcceptanceMutation.mutateAsync({
      workOrderId: workOrder.id,
      organizationId: currentOrganization.id,
      assigneeId,
    });
    setShowFieldAcceptDialog(false);
  }, [currentOrganization?.id, fieldAcceptanceMutation, workOrder]);

  if (!workOrderId) {
    logNavigationEvent('REDIRECT_NO_WORK_ORDER_ID');
    return <Navigate to="/dashboard/work-orders" replace />;
  }

  if (workOrderLoading || !currentOrganization) {
    logNavigationEvent('LOADING_STATE', { workOrderLoading, hasOrganization: !!currentOrganization });
    return (
      <div className="space-y-6 p-4" role="status" aria-label="Loading work order details">
        <span className="sr-only">Loading work order details...</span>
        <div className="h-8 bg-muted animate-pulse rounded" aria-hidden="true" />
        <div className="h-64 bg-muted animate-pulse rounded" aria-hidden="true" />
      </div>
    );
  }

  if (!workOrder) {
    logNavigationEvent('REDIRECT_NO_WORK_ORDER_DATA', { workOrderId });
    return <Navigate to="/dashboard/work-orders" replace />;
  }

  logNavigationEvent('SUCCESSFUL_RENDER', {
    workOrderId,
    formMode,
    hasPermissions: !!permissionLevels,
    organizationId: currentOrganization.id
  });

  const footerRoleEligible = isFooterRoleEligible({
    permissionLevels,
    assigneeId: workOrder.assignee_id,
    createdBy: workOrder.created_by,
    status: workOrder.status,
    userId: user?.id,
  });

  const showMobileActionFooter = shouldShowMobileActionFooter({
    isMobile,
    isWorkOrderLocked,
    workOrderStatus: workOrder.status,
    footerRoleEligible,
  });
  const hideInlineNoteAddButton = shouldHideInlineNoteAddButton(showMobileActionFooter, workOrder.status);

  const canCompletePmGate = !workOrder.has_pm || pmData?.status === 'completed';
  const pmChecklist = getPMChecklistStats(pmData?.checklist_data);
  const syncState = buildOfflineSyncState(offlineQueue);
  const teamSummary = buildWorkOrderTeamSummary(workOrder, equipment);
  const assigneeNameSummary = buildWorkOrderAssigneeSummary(workOrder.assigneeName);
  const mobileAssigneeSummary = buildMobileWorkOrderAssigneeSummary(workOrder.assigneeName);
  const compactWorkOrderSummary = buildMobileWorkOrderSummary({
    status: workOrder.status,
    priority: workOrder.priority,
    dueDate: workOrder.due_date,
  });
  const compactEquipmentSummary = equipment
    ? buildMobileEquipmentSummary({
        id: equipment.id,
        name: equipment.name,
        status: equipment.status,
      })
    : undefined;

  const scrollToPMSection = () => {
    pmSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openNotesComposer = () => {
    setOpenNoteFormTrigger((prev) => prev + 1);
    setTimeout(() => {
      notesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const openPhotoCapture = () => {
    if (!offlineQueue.isOnline) {
      toast.error('Photos need a connection. Text notes can still be saved offline.');
      return;
    }
    setOpenNoteFormTrigger((prev) => prev + 1);
    setOpenCaptureTrigger((prev) => prev + 1);
    setTimeout(() => {
      notesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  return (
    <div className="min-h-screen bg-background texture-grain">
      <WorkOrderDetailsMobileHeader
        workOrder={{ title: workOrder.title }}
        canEdit={canEdit}
        onEditClick={handleEditWorkOrder}
        onOpenActionSheet={() => setShowMobileActionSheet(true)}
      />

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
          location: equipment.location,
          customer_id: equipment.customer_id ?? null,
        } : null}
        pmData={pmData}
        organizationName={currentOrganization.name}
        organizationId={currentOrganization.id}
      />

      <div className={cn('p-4 lg:p-6', isMobile ? 'block' : 'grid grid-cols-1 lg:grid-cols-3 gap-6')}>
        <div
          className={cn(
            isMobile ? 'space-y-4' : 'lg:col-span-2 space-y-6',
            showMobileActionFooter && 'pb-32'
          )}
        >
          {linkedEquipment.length > 1 && (
            <WorkOrderEquipmentSelector
              workOrderId={workOrder.id}
              selectedEquipmentId={selectedEquipmentId}
              onEquipmentChange={setSelectedEquipmentId}
            />
          )}

          {isMobile ? (
            <WorkOrderDetailsMobileContent
              workOrder={workOrder}
              equipment={equipment}
              pmData={pmData}
              currentOrganization={currentOrganization}
              permissionLevels={permissionLevels}
              pmChecklist={pmChecklist}
              pmLoading={pmLoading}
              isWorkOrderLocked={isWorkOrderLocked}
              canAddNotes={canAddNotes}
              canUpload={canUpload}
              canAddCosts={canAddCosts}
              canEditCosts={canEditCosts}
              hideInlineNoteAddButton={hideInlineNoteAddButton}
              shouldAutoOpenNoteForm={shouldAutoOpenNoteForm}
              openNoteFormTrigger={openNoteFormTrigger}
              openCaptureTrigger={openCaptureTrigger}
              showMobileActionFooter={showMobileActionFooter}
              footerRoleEligible={footerRoleEligible}
              syncState={syncState}
              compactWorkOrderSummary={compactWorkOrderSummary}
              compactEquipmentSummary={compactEquipmentSummary}
              teamSummary={teamSummary}
              assigneeNameSummary={assigneeNameSummary}
              mobileAssigneeSummary={mobileAssigneeSummary}
              mobileReviewOpen={mobileReviewOpen}
              onMobileReviewOpenChange={setMobileReviewOpen}
              pmSectionRef={pmSectionRef}
              notesSectionRef={notesSectionRef}
              stagger={stagger}
              onAcceptWorkOrder={() => setShowFieldAcceptDialog(true)}
              onStartWork={startMobileWorkOrder}
              onResumeWork={pauseResumeMobileWorkOrder}
              onContinueChecklist={scrollToPMSection}
              onAddNote={openNotesComposer}
              onAddPhoto={openPhotoCapture}
              onComplete={() => setShowMobileCompleteDialog(true)}
              onRetrySync={offlineQueue.retryFailed}
            />
          ) : (
            <WorkOrderDetailsDesktopContent
              workOrder={workOrder}
              equipment={equipment}
              pmData={pmData}
              currentOrganization={currentOrganization}
              permissionLevels={permissionLevels}
              selectedEquipmentId={selectedEquipmentId}
              pmLoading={pmLoading}
              isWorkOrderLocked={isWorkOrderLocked}
              canAddNotes={canAddNotes}
              canUpload={canUpload}
              canAddCosts={canAddCosts}
              canEditCosts={canEditCosts}
              hideInlineNoteAddButton={hideInlineNoteAddButton}
              shouldAutoOpenNoteForm={shouldAutoOpenNoteForm}
              openNoteFormTrigger={openNoteFormTrigger}
              teamData={teamData}
              assigneeData={assigneeData}
              pmSectionRef={pmSectionRef}
              notesSectionRef={notesSectionRef}
              stagger={stagger}
              onPMUpdate={handlePMUpdate}
            />
          )}
        </div>

        <WorkOrderDetailsSidebar
          workOrder={workOrder}
          equipment={equipment}
          pmData={pmData}
          formMode={formMode}
          permissionLevels={permissionLevels}
          currentOrganization={currentOrganization}
          showMobileSidebar={showMobileSidebar}
          onCloseMobileSidebar={() => setShowMobileSidebar(false)}
          team={workOrder.team}
          isWorkOrderLocked={isWorkOrderLocked}
          baseCanAddNotes={baseCanAddNotes}
          onStatusUpdate={handleStatusUpdate}
        />
      </div>

      <WorkOrderForm
        open={isEditFormOpen}
        onClose={handleCloseEditForm}
        workOrder={workOrder}
        onSubmit={(data) => handleUpdateWorkOrder(data, workOrder.has_pm, workOrder.equipment_id)}
        isUpdating={isUpdating}
        pmData={pmData}
      />

      <PMChangeWarningDialog
        open={showPMWarning}
        onOpenChange={setShowPMWarning}
        onConfirm={handleConfirmPMChange}
        onCancel={handleCancelPMChange}
        changeType={pmChangeType}
        hasExistingNotes={getPMDataDetails().hasNotes}
        hasCompletedItems={getPMDataDetails().hasCompletedItems}
      />

      <WorkOrderPDFExportDialog
        open={showMobilePDFDialog}
        onOpenChange={setShowMobilePDFDialog}
        onExport={handleMobilePDFExport}
        isExporting={isMobilePDFGenerating}
        showCostsOption={permissionLevels.isManager}
        isGoogleWorkspaceConnected={isGoogleWorkspaceConnected}
        hasOrganizationDriveDestination={Boolean(googleDocsDestination)}
        onSaveToDrive={handleMobileSaveToDrive}
        isSavingToDrive={isMobileSavingToDrive}
      />

      {isMobile && (
        <MobileWorkOrderActionSheet
          open={showMobileActionSheet}
          onOpenChange={setShowMobileActionSheet}
          workOrderId={workOrder.id}
          workOrderStatus={workOrder.status}
          equipmentTeamId={equipment?.team_id}
          isManager={permissionLevels.isManager}
          canEdit={canEdit}
          onEdit={handleEditWorkOrder}
          onViewFullDetails={() => {
            setShowMobileActionSheet(false);
            setShowMobileSidebar(true);
          }}
          onDownloadPDF={() => setShowMobilePDFDialog(true)}
          onDownloadWorksheet={handleMobileDownloadWorksheet}
          isGeneratingWorksheet={isMobileWorksheetGenerating}
          onExportExcel={() => exportSingle(workOrder.id)}
          isExportingExcel={isExportingSingle}
          onExportGoogleDoc={canExportGoogleDoc ? () => exportSingleToDocs(workOrder.id) : undefined}
          isExportingGoogleDoc={isExportingSingleToDocs}
        />
      )}

      <AlertDialog open={showMobileCompleteDialog} onOpenChange={setShowMobileCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              Complete Work Order
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Are you sure you want to mark this work order as completed?</p>
                {workTimer.elapsedSeconds > 0 && (
                  <p className="text-sm">
                    Timer: <span className="font-medium text-foreground">{workTimer.displayTime}</span> ({(workTimer.elapsedSeconds / 3600).toFixed(2)}h)
                  </p>
                )}
                <p className="text-sm font-medium text-foreground">Before completing, please confirm:</p>
                <ul className="text-sm space-y-1 list-disc pl-4">
                  <li>All hours have been logged</li>
                  <li>All cost items have been recorded</li>
                  <li>Notes and photos are up to date</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mobileStatusMutation.isPending}>
              Go Back
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={mobileStatusMutation.isPending}
              onClick={() => {
                const hoursWorked = Math.round((workTimer.elapsedSeconds / 3600) * 100) / 100;
                mobileStatusMutation.mutate(
                  {
                    workOrderId: workOrder.id,
                    newStatus: 'completed',
                    serverUpdatedAt: workOrder.updated_at ?? undefined,
                  },
                  {
                    onSuccess: () => {
                      workTimer.stopAndGetHours();
                      setShowMobileCompleteDialog(false);
                      if (hoursWorked > 0) {
                        toast.success(`Timer stopped: ${hoursWorked.toFixed(2)} hours worked`);
                      }
                    },
                  }
                );
              }}
            >
              {mobileStatusMutation.isPending ? 'Completing...' : 'Mark as Complete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <WorkOrderAcceptanceModal
        open={showFieldAcceptDialog}
        onClose={() => setShowFieldAcceptDialog(false)}
        workOrder={workOrder as unknown as WorkOrderLike}
        organizationId={currentOrganization.id}
        onAccept={handleFieldAcceptComplete}
      />

      {showMobileActionFooter && (
        <MobileWorkOrderActionFooter
          workOrder={{
            id: workOrder.id,
            status: workOrder.status,
            has_pm: workOrder.has_pm,
            assignee_id: workOrder.assignee_id,
            created_by: workOrder.created_by,
          }}
          organizationId={currentOrganization.id}
          canCompletePm={canCompletePmGate}
          canAddNotes={canAddNotes}
          isUpdatingStatusExternal={mobileStatusMutation.isPending || fieldAcceptanceMutation.isPending}
          syncState={syncState}
          timerDisplay={workTimer.displayTime}
          isTimerRunning={workTimer.isRunning}
          onToggleTimer={() => {
            if (workTimer.isRunning) {
              workTimer.pause();
            } else {
              workTimer.start();
            }
          }}
          onAddNote={openNotesComposer}
          onAddPhoto={openPhotoCapture}
          onStartWork={startMobileWorkOrder}
          onAssignedPutOnHold={putAssignedMobileWorkOrderOnHold}
          onPauseResume={pauseResumeMobileWorkOrder}
          onOpenCompleteDialog={() => setShowMobileCompleteDialog(true)}
          onScrollToChecklist={scrollToPMSection}
          onRequestAccept={() => setShowFieldAcceptDialog(true)}
          onRetrySync={offlineQueue.retryFailed}
        />
      )}
    </div>
  );
};

export default WorkOrderDetails;
