// fallow-ignore-file code-duplication
// Duplication rationale: Large details page with repeated section chrome
import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineQueue } from '@/contexts/OfflineQueueContext';
import {
  buildMobileWorkOrderAssigneeSummary,
  buildOfflineSyncState,
  buildWorkOrderAssigneeSummary,
  buildWorkOrderTeamSummary,
  isFooterRoleEligible,
  shouldHideInlineNoteAddButton,
  shouldShowMobileActionFooter,
} from '@/features/work-orders/utils/workOrderDetailsViewModel';
import { WorkOrderDetailsMobileContent } from '@/features/work-orders/components/WorkOrderDetailsMobileContent';
import { WorkOrderDetailsDesktopContent } from '@/features/work-orders/components/WorkOrderDetailsDesktopContent';
import { WorkOrderDetailsOverlays } from '@/features/work-orders/components/WorkOrderDetailsOverlays';
import { PMChangeWarningDialog } from '@/features/work-orders/components/PMChangeWarningDialog';

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

  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>('');

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

  const { pmInitializing } = useWorkOrderDetailsPMInitialization({
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

  const {
    showMobileSidebar,
    setShowMobileSidebar,
    handleStatusUpdate,
    handlePMUpdate,
    showPMWarning,
    setShowPMWarning,
    pmChangeType,
    handleConfirmPMChange,
    handleCancelPMChange,
    getPMDataDetails,
  } = useWorkOrderDetailsActions(workOrderId || '', currentOrganization?.id || '', pmData);

  const pmWarningDetails = useMemo(() => getPMDataDetails(), [getPMDataDetails]);

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
  const hideInlineNoteAddButton = shouldHideInlineNoteAddButton(showMobileActionFooter, workOrder.status);
  const canEditInlineFields = canEdit && !isWorkOrderLocked;
  const canEditAssignment = permissionLevels.canAssign && !isWorkOrderLocked;

  const canCompletePmGate = !workOrder.has_pm || pmData?.status === 'completed';
  const pmChecklist = getPMChecklistStats(pmData?.checklist_data);
  const syncState = buildOfflineSyncState(offlineQueue);
  const teamSummary = buildWorkOrderTeamSummary(workOrder, equipment);
  const assigneeNameSummary = buildWorkOrderAssigneeSummary(workOrder.assigneeName);
  const mobileAssigneeSummary = buildMobileWorkOrderAssigneeSummary(workOrder.assigneeName);

  const scrollToPMSection = () => {
    pmSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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
              canUsePrivateNotes={canUsePrivateNotes}
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
              onPutAssignedOnHold={putAssignedMobileWorkOrderOnHold}
              onContinueChecklist={scrollToPMSection}
              onAddNote={openNotesComposer}
              onAddPhoto={openPhotoCapture}
              onComplete={() => setShowMobileCompleteDialog(true)}
              onRetrySync={offlineQueue.retryFailed}
              canEditInlineFields={canEditInlineFields}
              canEditAssignment={canEditAssignment}
              onSaveDescription={handleSaveDescription}
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

      <WorkOrderDetailsOverlays
        isMobile={isMobile}
        workOrder={workOrder}
        organizationId={currentOrganization.id}
        equipmentTeamId={equipment?.team_id}
        permissionLevels={permissionLevels}
        canAddNotes={canAddNotes}
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
        onViewFullDetails={() => {
          setShowMobileActionSheet(false);
          setShowMobileSidebar(true);
        }}
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
        onOpenPhotoCapture={openPhotoCapture}
        onStartMobileWorkOrder={startMobileWorkOrder}
        onPutAssignedMobileWorkOrderOnHold={putAssignedMobileWorkOrderOnHold}
        onPauseResumeMobileWorkOrder={pauseResumeMobileWorkOrder}
        onOpenCompleteDialog={() => setShowMobileCompleteDialog(true)}
        onScrollToChecklist={scrollToPMSection}
        onRequestAccept={() => setShowFieldAcceptDialog(true)}
        onRetrySync={offlineQueue.retryFailed}
      />

      <PMChangeWarningDialog
        open={showPMWarning}
        onOpenChange={setShowPMWarning}
        onConfirm={() => {
          void handleConfirmPMChange();
        }}
        onCancel={handleCancelPMChange}
        changeType={pmChangeType}
        hasExistingNotes={pmWarningDetails.hasNotes}
        hasCompletedItems={pmWarningDetails.hasCompletedItems}
      />
    </div>
  );
};

export default WorkOrderDetails;
