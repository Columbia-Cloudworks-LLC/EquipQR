// fallow-ignore-file code-duplication
// Duplication rationale: Large details page with repeated section chrome
import React, { useState, useRef, useMemo } from 'react';
import { useParams, useSearchParams, Navigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useWorkOrderDetailsData } from '@/features/work-orders/components/hooks/useWorkOrderDetailsData';
import { useWorkOrderDetailsActions } from '@/features/work-orders/hooks/useWorkOrderDetailsActions';
import { useWorkOrderEquipment } from '@/features/work-orders/hooks/useWorkOrderEquipment';
import { logNavigationEvent } from '@/utils/navigationDebug';
import { WorkOrderEquipmentSelector } from '@/features/work-orders/components/WorkOrderEquipmentSelector';
import { WorkOrderDetailsMobileHeader } from '@/features/work-orders/components/WorkOrderDetailsMobileHeader';
import { WorkOrderDetailsDesktopHeader } from '@/features/work-orders/components/WorkOrderDetailsDesktopHeader';
import { WorkOrderDetailsSidebar } from '@/features/work-orders/components/WorkOrderDetailsSidebar';
import { useWorkTimer } from '@/features/work-orders/hooks/useWorkTimer';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useInitializePMChecklist } from '@/features/pm-templates/hooks/useInitializePMChecklist';
import { getPMChecklistStats } from '@/features/work-orders/utils/pmChecklistStats';
import { useWorkOrderDetailsExports } from '@/features/work-orders/hooks/useWorkOrderDetailsExports';
import { useWorkOrderDetailsActionQuery } from '@/features/work-orders/hooks/useWorkOrderDetailsActionQuery';
import { useWorkOrderDetailsStagger } from '@/features/work-orders/hooks/useWorkOrderDetailsStagger';
import { useWorkOrderDetailsPMInitialization } from '@/features/work-orders/hooks/useWorkOrderDetailsPMInitialization';
import { useWorkOrderDetailsMobileWorkflow } from '@/features/work-orders/hooks/useWorkOrderDetailsMobileWorkflow';
import { useWorkOrderDetailsNotesComposer } from '@/features/work-orders/hooks/useWorkOrderDetailsNotesComposer';
import { useWorkOrderInlineFieldSave } from '@/features/work-orders/hooks/useWorkOrderInlineFieldSave';
import { useSaveEquipmentAssignedLocation } from '@/features/equipment/hooks/useSaveEquipmentAssignedLocation';
import { useGoogleMapsLoader } from '@/hooks/useGoogleMapsLoader';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';
import type { EquipmentLocationEditProps } from '@/components/location/equipmentLocationEditProps';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineQueue } from '@/contexts/OfflineQueueContext';
import {
  buildMobileWorkOrderAssigneeSummary,
  buildOfflineSyncState,
  buildWorkOrderAssigneeSummary,
  buildWorkOrderTeamSummary,
  getMobileWorkOrderDetailsBottomPaddingClass,
  isFooterRoleEligible,
  shouldHideInlineNoteAddButton,
  shouldShowMobileActionFooter,
} from '@/features/work-orders/utils/workOrderDetailsViewModel';
import { WorkOrderDetailsMobileContent } from '@/features/work-orders/components/WorkOrderDetailsMobileContent';
import { WorkOrderDetailsDesktopContent } from '@/features/work-orders/components/WorkOrderDetailsDesktopContent';
import { WorkOrderDetailsOverlays } from '@/features/work-orders/components/WorkOrderDetailsOverlays';
import WorkOrderQRCodeDisplay from '@/features/work-orders/components/WorkOrderQRCodeDisplay';
import { PMChangeWarningDialog } from '@/features/work-orders/components/PMChangeWarningDialog';
import { WorkOrderPMManagementDialog } from '@/features/work-orders/components/WorkOrderPMManagementDialog';

const WorkOrderDetails = () => {
  const { workOrderId } = useParams<{ workOrderId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();

  const actionParam = searchParams.get('action');
  const shouldAutoOpenNoteForm = actionParam === 'add-note';
  const shouldAutoOpenPDFDialog = actionParam === 'download-pdf';
  const shouldAutoDownloadWorksheet = actionParam === 'download-worksheet';
  const shouldAutoFocusPM = actionParam === 'pm';
  const notesSectionRef = useRef<HTMLDivElement>(null);
  const pmSectionRef = useRef<HTMLDivElement>(null);
  const costsSectionRef = useRef<HTMLDivElement>(null);

  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>('');
  const [isEditingWorkOrderEquipmentLocation, setIsEditingWorkOrderEquipmentLocation] = useState(false);
  const [showPMManagementDialog, setShowPMManagementDialog] = useState(false);
  const [showWorkOrderQr, setShowWorkOrderQr] = useState(false);

  const { user } = useAuth();
  const permissions = useUnifiedPermissions();

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
    canViewWorkOrderCosts,
    canAddNotes,
    canUsePrivateNotes,
    canUpload,
    canEdit,
    baseCanAddNotes,
    currentOrganization
  } = useWorkOrderDetailsData(workOrderId || '', selectedEquipmentId);

  const initializePMChecklist = useInitializePMChecklist();
  const { stagger } = useWorkOrderDetailsStagger();

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

  useWorkOrderDetailsPMInitialization({
    workOrderId: workOrder?.id,
    workOrderEquipmentId: workOrder?.equipment_id,
    hasPm: workOrder?.has_pm,
    pmData,
    pmLoading,
    pmError,
    workOrderLoading,
    selectedEquipmentId,
    organizationId: currentOrganization?.id,
    isManager: permissionLevels.isManager,
    isTechnician: permissionLevels.isTechnician,
    defaultPmTemplateId: equipment?.default_pm_template_id,
    initializePMChecklist,
  });

  const { data: linkedEquipment = [] } = useWorkOrderEquipment(workOrderId || '');

  const canEditInlineFields = canEdit && !isWorkOrderLocked;
  const canEditAssignment = permissionLevels.canAssign && !isWorkOrderLocked;
  const canEditEquipmentLocation =
    canEditInlineFields &&
    equipment != null &&
    permissions.equipment.getPermissions(equipment.team_id || undefined).canEdit;

  const { saveAssignedLocation, isSavingLocation: isSavingWorkOrderEquipmentLocation } =
    useSaveEquipmentAssignedLocation(currentOrganization?.id, equipment?.id);
  const { isLoaded: isPlacesLoadedForWorkOrderLocation } = useGoogleMapsLoader({
    enabled: isEditingWorkOrderEquipmentLocation,
  });

  const equipmentLocationEdit = useMemo((): EquipmentLocationEditProps | undefined => {
    if (!canEditEquipmentLocation) {
      return undefined;
    }

    return {
      canEditLocation: true,
      isEditingAddress: isEditingWorkOrderEquipmentLocation,
      isSavingAddress: isSavingWorkOrderEquipmentLocation,
      isPlacesLoaded: isPlacesLoadedForWorkOrderLocation,
      onStartAddressEdit: () => setIsEditingWorkOrderEquipmentLocation(true),
      onCancelAddressEdit: () => setIsEditingWorkOrderEquipmentLocation(false),
      onSaveAddress: async (data) => {
        try {
          await saveAssignedLocation(data);
          setIsEditingWorkOrderEquipmentLocation(false);
        } catch (error) {
          logger.error('Error updating equipment location from work order', error);
          toast.error('Failed to update equipment location');
        }
      },
    };
  }, [
    canEditEquipmentLocation,
    isEditingWorkOrderEquipmentLocation,
    isPlacesLoadedForWorkOrderLocation,
    isSavingWorkOrderEquipmentLocation,
    saveAssignedLocation,
  ]);

  const {
    showMobileSidebar,
    setShowMobileSidebar,
    handleStatusUpdate,
    handlePMUpdate,
    handleUpdateWorkOrder,
    showPMWarning,
    setShowPMWarning,
    pmChangeType,
    handleConfirmPMChange,
    handleCancelPMChange,
    getPMDataDetails,
    isUpdating: isUpdatingWorkOrder,
  } = useWorkOrderDetailsActions(workOrderId || '', currentOrganization?.id || '', pmData);

  const pmWarningDetails = useMemo(() => getPMDataDetails(), [getPMDataDetails]);

  const workOrderDetailedPermissions = workOrder
    ? permissions.workOrders.getDetailedPermissions({
        ...workOrder,
        organizationId: currentOrganization?.id ?? '',
        teamId: workOrder.team_id ?? equipment?.team_id ?? undefined,
      })
    : null;
  const canManagePM = Boolean(workOrderDetailedPermissions?.canEditPM && !isWorkOrderLocked);
  const pmManagementPendingConfirmRef = React.useRef(false);

  const handleSavePMManagement = React.useCallback(
    async (data: Parameters<typeof handleUpdateWorkOrder>[0]) => {
      if (!canManagePM) {
        toast.error('You do not have permission to manage PM checklists on this work order.');
        return;
      }
      const equipmentIdForPm = selectedEquipmentId || workOrder?.equipment_id || '';
      const outcome = await handleUpdateWorkOrder(data, workOrder?.has_pm, equipmentIdForPm);
      if (outcome === 'completed') {
        setShowPMManagementDialog(false);
      } else {
        pmManagementPendingConfirmRef.current = true;
      }
    },
    [canManagePM, handleUpdateWorkOrder, selectedEquipmentId, workOrder?.equipment_id, workOrder?.has_pm],
  );

  const handleConfirmPMChangeFromDetails = React.useCallback(async () => {
    await handleConfirmPMChange();
    if (pmManagementPendingConfirmRef.current) {
      pmManagementPendingConfirmRef.current = false;
      setShowPMManagementDialog(false);
    }
  }, [handleConfirmPMChange]);

  const handleCancelPMChangeFromDetails = React.useCallback(() => {
    pmManagementPendingConfirmRef.current = false;
    handleCancelPMChange();
  }, [handleCancelPMChange]);

  const workTimer = useWorkTimer(workOrderId);
  const offlineQueue = useOfflineQueue();

  const {
    showMobileActionSheet,
    setShowMobileActionSheet,
    showMobileCompleteDialog,
    setShowMobileCompleteDialog,
    showFieldAcceptDialog,
    setShowFieldAcceptDialog,
    showMobilePDFDialog,
    setShowMobilePDFDialog,
    mobilePdfDialogFocusDrive,
    openMobilePdfDialog,
    mobileReviewOpen,
    setMobileReviewOpen,
    mobileStatusMutation,
    fieldAcceptanceMutation,
    startMobileWorkOrder,
    putAssignedMobileWorkOrderOnHold,
    pauseResumeMobileWorkOrder,
    handleFieldAcceptComplete,
    completeMobileWorkOrder,
  } = useWorkOrderDetailsMobileWorkflow({
    workOrder,
    organizationId: currentOrganization?.id,
    workTimer,
  });

  const { openNoteFormTrigger, openCaptureTrigger, openNotesComposer, openPhotoCapture } =
    useWorkOrderDetailsNotesComposer({
      notesSectionRef,
      isOnline: offlineQueue.isOnline,
    });

  const { saveField } = useWorkOrderInlineFieldSave(workOrderId || '', workOrder?.updated_at);
  const handleSaveDescription = React.useCallback(
    async (description: string) => {
      await saveField('description', description);
    },
    [saveField],
  );

  const exports = useWorkOrderDetailsExports({
    workOrder,
    equipment,
    pmData,
    organizationId: currentOrganization?.id,
    organizationName: currentOrganization?.name,
    isManager: permissionLevels.isManager,
  });

  useWorkOrderDetailsActionQuery({
    actionParam,
    shouldAutoOpenNoteForm,
    shouldAutoOpenPDFDialog,
    shouldAutoDownloadWorksheet,
    shouldAutoFocusPM,
    workOrderLoading,
    hasWorkOrder: Boolean(workOrder),
    setSearchParams,
    notesSectionRef,
    pmSectionRef,
    onAutoOpenPDFDialog: () => openMobilePdfDialog(false),
    onAutoDownloadWorksheet: exports.handleMobileDownloadWorksheet,
  });

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
  const hideInlineNoteAddButton = shouldHideInlineNoteAddButton(showMobileActionFooter);

  const canCompletePmGate = !workOrder.has_pm || pmData?.status === 'completed';
  const pmChecklist = getPMChecklistStats(pmData?.checklist_data);
  const syncState = buildOfflineSyncState(offlineQueue);
  const teamSummary = buildWorkOrderTeamSummary(workOrder, equipment);
  const assigneeNameSummary = buildWorkOrderAssigneeSummary(workOrder.assigneeName);
  const mobileAssigneeSummary = buildMobileWorkOrderAssigneeSummary(workOrder.assigneeName);

  const scrollToPMSection = () => {
    pmSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToCostsSection = () => {
    costsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const canCaptureCosts =
    canViewWorkOrderCosts && (canAddCosts || canEditCosts) && !isWorkOrderLocked;

  return (
    <div className="min-h-screen bg-background texture-grain">
      <WorkOrderDetailsMobileHeader
        workOrder={{ title: workOrder.title }}
        showExports={permissionLevels.exportAudience !== 'none'}
        onOpenActionSheet={() => setShowMobileActionSheet(true)}
      />

      <WorkOrderDetailsDesktopHeader
        workOrder={workOrder}
        formMode={formMode}
        permissionLevels={permissionLevels}
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
            getMobileWorkOrderDetailsBottomPaddingClass(isMobile),
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
              canUsePrivateNotes={canUsePrivateNotes}
              canUpload={canUpload}
              canAddCosts={canAddCosts}
              canEditCosts={canEditCosts}
              canViewWorkOrderCosts={canViewWorkOrderCosts}
              hideInlineNoteAddButton={hideInlineNoteAddButton}
              shouldAutoOpenNoteForm={shouldAutoOpenNoteForm}
              openNoteFormTrigger={openNoteFormTrigger}
              openCaptureTrigger={openCaptureTrigger}
              showMobileActionFooter={showMobileActionFooter}
              footerRoleEligible={footerRoleEligible}
              syncState={syncState}
              teamSummary={teamSummary}
              assigneeNameSummary={assigneeNameSummary}
              mobileAssigneeSummary={mobileAssigneeSummary}
              mobileReviewOpen={mobileReviewOpen}
              onMobileReviewOpenChange={setMobileReviewOpen}
              pmSectionRef={pmSectionRef}
              notesSectionRef={notesSectionRef}
              costsSectionRef={costsSectionRef}
              stagger={stagger}
              onAcceptWorkOrder={() => setShowFieldAcceptDialog(true)}
              onStartWork={startMobileWorkOrder}
              onResumeWork={pauseResumeMobileWorkOrder}
              onPutAssignedOnHold={putAssignedMobileWorkOrderOnHold}
              onContinueChecklist={scrollToPMSection}
              onAddNote={openNotesComposer}
              onAddPhoto={openPhotoCapture}
              onComplete={() => setShowMobileCompleteDialog(true)}
              onRetrySync={offlineQueue.retryFailed}
              canEditInlineFields={canEditInlineFields}
              canEditAssignment={canEditAssignment}
              onSaveDescription={handleSaveDescription}
              equipmentLocationEdit={equipmentLocationEdit}
              canManagePM={canManagePM}
              onManagePM={() => setShowPMManagementDialog(true)}
              onPMUpdate={handlePMUpdate}
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
              canUsePrivateNotes={canUsePrivateNotes}
              canUpload={canUpload}
              canAddCosts={canAddCosts}
              canEditCosts={canEditCosts}
              canViewWorkOrderCosts={canViewWorkOrderCosts}
              hideInlineNoteAddButton={hideInlineNoteAddButton}
              shouldAutoOpenNoteForm={shouldAutoOpenNoteForm}
              openNoteFormTrigger={openNoteFormTrigger}
              teamData={teamData}
              assigneeData={assigneeData}
              pmSectionRef={pmSectionRef}
              notesSectionRef={notesSectionRef}
              stagger={stagger}
              onPMUpdate={handlePMUpdate}
              canEditInlineFields={canEditInlineFields}
              onSaveDescription={handleSaveDescription}
              equipmentLocationEdit={equipmentLocationEdit}
              canManagePM={canManagePM}
              onManagePM={() => setShowPMManagementDialog(true)}
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
          canViewWorkOrderCosts={canViewWorkOrderCosts}
        />
      </div>

      <WorkOrderDetailsOverlays
        isMobile={isMobile}
        workOrder={workOrder}
        organizationId={currentOrganization.id}
        equipmentTeamId={equipment?.team_id}
        permissionLevels={permissionLevels}
        canAddNotes={canAddNotes}
        canCaptureCosts={canCaptureCosts}
        canCompletePmGate={canCompletePmGate}
        showMobileActionFooter={showMobileActionFooter}
        syncState={syncState}
        workTimer={workTimer}
        showMobilePDFDialog={showMobilePDFDialog}
        onMobilePDFDialogOpenChange={setShowMobilePDFDialog}
        mobilePdfDialogFocusDrive={mobilePdfDialogFocusDrive}
        onOpenMobilePdfDialog={() => openMobilePdfDialog(false)}
        onOpenMobileDrivePdfDialog={() => openMobilePdfDialog(true)}
        onMobilePDFExport={exports.handleMobilePDFExport}
        isMobilePDFGenerating={exports.isMobilePDFGenerating}
        isGoogleWorkspaceConnected={exports.isGoogleWorkspaceConnected}
        googleDocsDestination={exports.googleDocsDestination}
        onMobileSaveToDrive={exports.handleMobileSaveToDrive}
        isMobileSavingToDrive={exports.isMobileSavingToDrive}
        showMobileActionSheet={showMobileActionSheet}
        onMobileActionSheetOpenChange={setShowMobileActionSheet}
        onDownloadWorksheet={exports.handleMobileDownloadWorksheet}
        isMobileWorksheetGenerating={exports.isMobileWorksheetGenerating}
        onDownloadXlsx={() => exports.exportSingle(workOrder.id)}
        isExportingXlsx={exports.isExportingSingle}
        onDownloadCsv={() => exports.exportSingleCsv(workOrder.id)}
        isExportingCsv={exports.isExportingSingleCsv}
        onDownloadDocx={() => exports.exportSingleDocx(workOrder.id)}
        isExportingDocx={exports.isExportingSingleDocx}
        docxDisabled={!exports.canExportGoogleDoc}
        onDriveDocs={() => exports.exportSingleToDocs(workOrder.id)}
        isExportingToDocs={exports.isExportingSingleToDocs}
        onDriveSheets={() => exports.exportSingleToSheets(workOrder.id)}
        isExportingToSheets={exports.isExportingSingleToSheets}
        isExportBusy={exports.isExportBusy}
        showMobileCompleteDialog={showMobileCompleteDialog}
        onMobileCompleteDialogOpenChange={setShowMobileCompleteDialog}
        mobileStatusMutation={mobileStatusMutation}
        onCompleteMobileWorkOrder={completeMobileWorkOrder}
        showFieldAcceptDialog={showFieldAcceptDialog}
        onFieldAcceptDialogClose={() => setShowFieldAcceptDialog(false)}
        onFieldAcceptComplete={handleFieldAcceptComplete}
        fieldAcceptanceMutation={fieldAcceptanceMutation}
        onOpenNotesComposer={openNotesComposer}
        onScrollToCosts={scrollToCostsSection}
        onStartMobileWorkOrder={startMobileWorkOrder}
        onPutAssignedMobileWorkOrderOnHold={putAssignedMobileWorkOrderOnHold}
        onPauseResumeMobileWorkOrder={pauseResumeMobileWorkOrder}
        onOpenCompleteDialog={() => setShowMobileCompleteDialog(true)}
        onScrollToChecklist={scrollToPMSection}
        onRequestAccept={() => setShowFieldAcceptDialog(true)}
        onRetrySync={offlineQueue.retryFailed}
        onShowWorkOrderQr={() => setShowWorkOrderQr(true)}
      />

      <WorkOrderQRCodeDisplay
        open={showWorkOrderQr}
        onClose={() => setShowWorkOrderQr(false)}
        workOrderId={workOrder.id}
        workOrderTitle={workOrder.title}
        onPrintFieldWorksheet={() => void exports.handleMobileDownloadWorksheet()}
        isPrintingWorksheet={exports.isMobileWorksheetGenerating}
        showFieldWorksheet={permissionLevels.exportAudience === 'admin'}
      />

      <PMChangeWarningDialog
        open={showPMWarning}
        onOpenChange={setShowPMWarning}
        onConfirm={() => {
          void handleConfirmPMChangeFromDetails();
        }}
        onCancel={handleCancelPMChangeFromDetails}
        changeType={pmChangeType}
        hasExistingNotes={pmWarningDetails.hasNotes}
        hasCompletedItems={pmWarningDetails.hasCompletedItems}
      />

      <WorkOrderPMManagementDialog
        open={showPMManagementDialog}
        onClose={() => setShowPMManagementDialog(false)}
        workOrder={workOrder}
        pmData={pmData}
        equipment={
          equipment
            ? {
                id: equipment.id,
                name: equipment.name,
                default_pm_template_id: equipment.default_pm_template_id ?? null,
              }
            : null
        }
        equipmentId={selectedEquipmentId || workOrder.equipment_id}
        pmLoading={pmLoading}
        isUpdating={isUpdatingWorkOrder}
        onSave={handleSavePMManagement}
      />
    </div>
  );
};

export default WorkOrderDetails;
