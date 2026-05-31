import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useSearchParams, Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ChevronDown, Clipboard, CheckCircle, History } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useWorkOrderDetailsData } from '@/features/work-orders/components/hooks/useWorkOrderDetailsData';
import { useWorkOrderDetailsActions } from '@/features/work-orders/hooks/useWorkOrderDetailsActions';
import { useWorkOrderEquipment } from '@/features/work-orders/hooks/useWorkOrderEquipment';
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
import { WorkOrderDetailsPMInfo } from '@/features/work-orders/components/WorkOrderDetailsPMInfo';
import { PMChangeWarningDialog } from '@/features/work-orders/components/PMChangeWarningDialog';
import { WorkOrderDetailsSidebar } from '@/features/work-orders/components/WorkOrderDetailsSidebar';
import { WorkOrderDetailsMobile } from '@/features/work-orders/components/WorkOrderDetailsMobile';

import { WorkOrderPDFExportDialog } from '@/features/work-orders/components/WorkOrderPDFExportDialog';
import { MobileWorkOrderActionSheet } from '@/features/work-orders/components/MobileWorkOrderActionSheet';
import { MobileWorkOrderActionFooter } from '@/features/work-orders/components/MobileWorkOrderActionFooter';
import { MobileWorkOrderFieldNextAction } from '@/features/work-orders/components/MobileWorkOrderFieldNextAction';
import { useWorkTimer } from '@/features/work-orders/hooks/useWorkTimer';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useInitializePMChecklist } from '@/features/pm-templates/hooks/useInitializePMChecklist';
import { PMChecklistItem } from '@/features/pm-templates/services/preventativeMaintenanceService';
import { toast } from 'sonner';
import { useWorkOrderPDF } from '@/features/work-orders/hooks/useWorkOrderPDFData';
import { useGoogleWorkspaceConnectionStatus } from '@/features/organization/hooks/useGoogleWorkspaceConnectionStatus';
import { useGoogleWorkspaceExportDestination } from '@/features/organization/hooks/useGoogleWorkspaceExportDestination';
import { HistoryTab } from '@/components/audit';
import { cn } from '@/lib/utils';
import { canExportWorkOrderGoogleDoc } from '@/features/work-orders/utils/googleDocsExportAvailability';
import { MobileWorkOrderCompactSummary } from '@/features/work-orders/components/MobileWorkOrderCompactSummary';
import { useAuth } from '@/hooks/useAuth';
import { isOfflineId } from '@/features/work-orders/hooks/useOfflineMergedWorkOrders';
import { useWorkOrderStatusUpdate } from '@/features/work-orders/hooks/useWorkOrderStatusUpdate';
import { useOfflineQueue } from '@/contexts/OfflineQueueContext';
import type { WorkOrderStatus } from '@/features/work-orders/types/workOrder';
import { useWorkOrderAcceptance } from '@/features/work-orders/hooks/useWorkOrderAcceptance';
import WorkOrderAcceptanceModal from '@/features/work-orders/components/WorkOrderAcceptanceModal';
import type { WorkOrderLike } from '@/features/work-orders/utils/workOrderTypeConversion';

const WorkOrderDetails = () => {
  const { workOrderId } = useParams<{ workOrderId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();

  // Handle quick action query params (from WorkOrderQuickActions dropdown)
  const actionParam = searchParams.get('action');
  const shouldAutoOpenNoteForm = actionParam === 'add-note';
  const shouldAutoOpenPDFDialog = actionParam === 'download-pdf';
  const shouldAutoFocusPM = actionParam === 'pm';
  const notesSectionRef = useRef<HTMLDivElement>(null);
  const pmSectionRef = useRef<HTMLDivElement>(null);
  const actionHandledRef = useRef(false);

  // State for selected equipment (for multi-equipment work orders)
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>('');
  const [pmInitializing, setPmInitializing] = useState(false);

  // State for mobile action sheet
  const [showMobileActionSheet, setShowMobileActionSheet] = useState(false);

  // State for mobile complete confirmation dialog
  const [showMobileCompleteDialog, setShowMobileCompleteDialog] = useState(false);
  const [showFieldAcceptDialog, setShowFieldAcceptDialog] = useState(false);

  // Trigger to programmatically open the note form from mobile action bar/sheet
  const [openNoteFormTrigger, setOpenNoteFormTrigger] = useState(0);
  const [openCaptureTrigger, setOpenCaptureTrigger] = useState(0);
  const [mobileReviewOpen, setMobileReviewOpen] = useState(false);

  const { user } = useAuth();

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
  const fieldAcceptanceMutation = useWorkOrderAcceptance();

  const documentTitle = workOrder
    ? `${workOrder.title}${equipment ? ` – ${equipment.name}` : ''}`
    : undefined;
  useDocumentTitle(documentTitle);

  // Update selectedEquipmentId when workOrder loads
  React.useEffect(() => {
    if (workOrder?.equipment_id && !selectedEquipmentId) {
      setSelectedEquipmentId(workOrder.equipment_id);
    }
  }, [workOrder?.equipment_id, selectedEquipmentId]);

  // Memoize object props to avoid breaking child component memoization
  // Extract individual fields so useMemo deps are explicit and lint-clean
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
            // null means the init was queued offline — the offline banner
            // already surfaces the pending state; don't show a misleading
            // "initialized" toast when no PM record exists yet.
            if (result !== null) {
              toast.success('PM checklist initialized');
            }
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
  const { exportSingle, isExportingSingle, exportSingleToDocs, isExportingSingleToDocs } = useWorkOrderExcelExport(
    currentOrganization?.id || '',
    currentOrganization?.name || ''
  );

  // Offline-aware mobile status mutation for field actions.
  const mobileStatusMutation = useWorkOrderStatusUpdate();

  // Timer hook for tracking work time (mobile in-progress bar)
  const workTimer = useWorkTimer(workOrderId);

  const offlineQueue = useOfflineQueue();

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

  // Reset action handled ref when action param changes (new navigation)
  useEffect(() => {
    if (!actionParam) {
      actionHandledRef.current = false;
    }
  }, [actionParam]);

  // PDF generation hook for mobile
  const { 
    downloadPDF: downloadMobilePDF, 
    isGenerating: isMobilePDFGenerating,
    saveToDrive: saveMobilePDFToDrive,
    isSavingToDrive: isMobileSavingToDrive,
    downloadFieldWorksheet: downloadMobileWorksheet,
    isGeneratingWorksheet: isMobileWorksheetGenerating,
  } = useWorkOrderPDF({
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
      location: equipment.location,
      customerId: equipment.customer_id ?? null,
    } : null,
    pmData,
    organizationName: currentOrganization?.name,
    teamId: equipment?.team_id,
  });
  
  // Google Workspace connection status (for showing "Save to Google Drive" option)
  const { isConnected: isGoogleWorkspaceConnected, connectionStatus } = useGoogleWorkspaceConnectionStatus({
    organizationId: currentOrganization?.id,
  });
  const { destination: googleDocsDestination } = useGoogleWorkspaceExportDestination(currentOrganization?.id, permissionLevels.isManager);
  const canExportGoogleDoc = canExportWorkOrderGoogleDoc({
    isConnected: isGoogleWorkspaceConnected,
    scopes: connectionStatus?.scopes,
    hasDestination: Boolean(googleDocsDestination),
  });

  // Handle mobile PDF export with options from dialog
  const handleMobilePDFExport = async (options: { includeCosts: boolean }) => {
    // Let errors propagate so the dialog can detect failures and stay open for retry.
    // The useWorkOrderPDF hook already logs and shows a toast on error.
    await downloadMobilePDF(options);
  };

  // Handle mobile PDF save to Drive with options from dialog
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

  // Only redirect if we definitely don't have the required data and aren't loading
  if (!workOrderId) {
    logNavigationEvent('REDIRECT_NO_WORK_ORDER_ID');
    return <Navigate to="/dashboard/work-orders" replace />;
  }

  // Show loading state while fetching data or organization
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

  const footerRoleEligible =
    permissionLevels.isManager ||
    (permissionLevels.isTechnician && workOrder.assignee_id === user?.id) ||
    (!!user?.id &&
      !!workOrder.created_by &&
      workOrder.created_by === user.id &&
      workOrder.status === 'submitted');

  const showMobileActionFooter =
    isMobile &&
    footerRoleEligible &&
    !isWorkOrderLocked &&
    workOrder.status !== 'completed' &&
    workOrder.status !== 'cancelled';
  const hideInlineNoteAddButton = showMobileActionFooter && workOrder.status !== 'submitted';

  const canCompletePmGate = !workOrder.has_pm || pmData?.status === 'completed';
  const pmChecklist = getPMChecklistStats(pmData?.checklist_data);
  const syncState = {
    isOnline: offlineQueue.isOnline,
    isSyncing: offlineQueue.isSyncing,
    pendingCount: offlineQueue.pendingCount,
    failedCount: offlineQueue.failedCount,
  };

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
      {/* Mobile Header */}
      <WorkOrderDetailsMobileHeader
        workOrder={{ title: workOrder.title }}
        canEdit={canEdit}
        onEditClick={handleEditWorkOrder}
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
          location: equipment.location,
          customer_id: equipment.customer_id ?? null,
        } : null}
        pmData={pmData}
        organizationName={currentOrganization.name}
        organizationId={currentOrganization.id}
      />

      <div className={cn('p-4 lg:p-6', isMobile ? 'block' : 'grid grid-cols-1 lg:grid-cols-3 gap-6')}>
        {/* Main Content */}
        <div
          className={cn(
            isMobile ? 'space-y-4' : 'lg:col-span-2 space-y-6',
            showMobileActionFooter && 'pb-32'
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
              <MobileWorkOrderCompactSummary
                workOrder={{
                  status: workOrder.status,
                  priority: workOrder.priority,
                  due_date: workOrder.dueDate,
                }}
                equipment={
                  equipment
                    ? { id: equipment.id, name: equipment.name, status: equipment.status }
                    : undefined
                }
                team={(() => {
                  const teamId = workOrder.team_id || equipment?.team_id;
                  return workOrder.teamName && teamId ? { id: teamId, name: workOrder.teamName } : undefined;
                })()}
                assignee={workOrder.assigneeName ? { name: workOrder.assigneeName } : undefined}
              />
              {/* Mobile Work Order Details */}
              <div {...stagger(0)}>
                <WorkOrderDetailsMobile
                workOrder={{
                  ...workOrder,
                  created_at: workOrder.created_date || workOrder.createdDate,
                  due_date: workOrder.dueDate,
                  estimated_hours: workOrder.estimatedHours,
                  has_pm: workOrder.has_pm,
                  pm_status: pmData?.status,
                  pm_progress: pmChecklist.progress,
                  pm_total: pmChecklist.total
                }}
                equipment={equipment ? {
                  id: equipment.id,
                  name: equipment.name,
                  manufacturer: equipment.manufacturer,
                  model: equipment.model,
                  serial_number: equipment.serial_number,
                  status: equipment.status,
                  location: equipment.location,
                  team_id: equipment.team_id,
                  custom_attributes: equipment.custom_attributes as Record<string, unknown> | null,
                  image_url: equipment.image_url
                } : undefined}
                team={(() => {
                  const teamId = workOrder.team_id || equipment?.team_id;
                  return workOrder.teamName && teamId ? { id: teamId, name: workOrder.teamName } : undefined;
                })()}
                assignee={workOrder.assigneeName ? { id: '', name: workOrder.assigneeName } : undefined}
                effectiveLocation={workOrder.effectiveLocation}
              />
              </div>

              {!showMobileActionFooter ? (
                <div {...stagger(1)}>
                  <MobileWorkOrderFieldNextAction
                    workOrder={{
                      id: workOrder.id,
                      status: workOrder.status,
                      has_pm: workOrder.has_pm,
                      updated_at: workOrder.updated_at,
                    }}
                    pm={{
                      status: pmData?.status,
                      progress: pmChecklist.progress,
                      total: pmChecklist.total,
                    }}
                    permissions={{
                      canAddNotes,
                      canUpload,
                      canWork: footerRoleEligible,
                    }}
                    sync={syncState}
                    onAcceptWorkOrder={() => setShowFieldAcceptDialog(true)}
                    onStartWork={startMobileWorkOrder}
                    onResumeWork={pauseResumeMobileWorkOrder}
                    onContinueChecklist={scrollToPMSection}
                    onAddNote={openNotesComposer}
                    onAddPhoto={openPhotoCapture}
                    onComplete={() => setShowMobileCompleteDialog(true)}
                    onRetrySync={offlineQueue.retryFailed}
                  />
                </div>
              ) : null}

              {/* PM Checklist - Responsive */}
              {workOrder.has_pm && (permissionLevels.isManager || permissionLevels.isTechnician) && (
                <div {...stagger(2)}>
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
                    <Card className="shadow-elevation-2" role="status" aria-label="Loading PM checklist">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Clipboard className="h-5 w-5" />
                          Loading PM Checklist...
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-32 bg-muted animate-pulse rounded" aria-hidden="true" />
                      </CardContent>
                    </Card>
                  )}
                </div>
                </div>
              )}

              {/* Mobile Images Section */}
              <div {...stagger(3)}>
              <WorkOrderImagesSection 
                workOrderId={workOrder.id}
                organizationId={workOrder.organization_id}
                canUpload={canUpload}
                showPrivateNotes={permissionLevels.isManager}
                primaryImageId={workOrder.primary_image_id}
              />
              </div>

              {/* Mobile Notes Section */}
              <div {...stagger(4)}>
              <div ref={notesSectionRef}>
                <WorkOrderNotesSection 
                  workOrderId={workOrder.id}
                  canAddNotes={canAddNotes}
                  showPrivateNotes={permissionLevels.isManager}
                  hideInlineAddButton={hideInlineNoteAddButton}
                  autoOpenForm={shouldAutoOpenNoteForm}
                  openFormTrigger={openNoteFormTrigger}
                  openCaptureTrigger={openCaptureTrigger}
                />
              </div>
              </div>

              {/* Itemized costs — bottom of field flow, always findable */}
              {(permissionLevels.isManager || permissionLevels.isTechnician) && (
                <div {...stagger(5)}>
                  <WorkOrderCostsSection
                    workOrderId={workOrder.id}
                    canAddCosts={canAddCosts && !isWorkOrderLocked}
                    canEditCosts={canEditCosts && !isWorkOrderLocked}
                    primaryEquipmentId={workOrder.equipment_id}
                    variant="mobileField"
                  />
                </div>
              )}

              <div {...stagger(6)}>
                <Card className="shadow-elevation-2">
                  <Collapsible open={mobileReviewOpen} onOpenChange={setMobileReviewOpen}>
                    <CardHeader>
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="flex min-h-[44px] w-full items-center justify-between gap-3 text-left"
                        >
                          <CardTitle className="text-lg">Review & office details</CardTitle>
                          <ChevronDown
                            className={cn(
                              'h-5 w-5 text-muted-foreground transition-transform',
                              mobileReviewOpen && 'rotate-180',
                            )}
                            aria-hidden
                          />
                        </button>
                      </CollapsibleTrigger>
                    </CardHeader>
                    <CollapsibleContent>
                      <CardContent className="space-y-4 pt-0">
                        <WorkOrderDetailsPMInfo
                          workOrder={workOrder}
                          pmData={pmData}
                          permissionLevels={permissionLevels}
                        />

                        <WorkOrderTimeline
                          workOrder={workOrder}
                          showDetailedHistory={permissionLevels.isManager}
                        />

                        {permissionLevels.isManager && currentOrganization && (
                          <Card className="shadow-elevation-2">
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                                <History className="h-5 w-5" />
                                Change History (Field Edits)
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="mb-3 text-sm text-muted-foreground">
                                Shows who changed work order fields and when.
                              </p>
                              <HistoryTab
                                entityType="work_order"
                                entityId={workOrder.id}
                                organizationId={currentOrganization.id}
                              />
                            </CardContent>
                          </Card>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              </div>
            </>
          ) : (
            <>
              {/* Desktop Layout - Keep existing structure */}
              <div {...stagger(0)}>
                <WorkOrderDetailsInfo workOrder={workOrder} equipment={equipment} effectiveLocation={workOrder.effectiveLocation} />
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
              {workOrder.has_pm && (permissionLevels.isManager || permissionLevels.isTechnician) && (
                <div ref={pmSectionRef}>
                  {pmData && (
                    <div {...stagger(2)}>
                      <PMChecklistComponent
                        key={selectedEquipmentId} // Force re-render on equipment change
                        pm={pmData}
                        onUpdate={handlePMUpdate}
                        readOnly={isWorkOrderLocked || (!permissionLevels.isManager && !permissionLevels.isTechnician)}
                        isAdmin={permissionLevels.isManager}
                        workOrder={workOrder}
                        equipment={equipment}
                        team={teamData}
                        organization={currentOrganization}
                        assignee={assigneeData}
                      />
                    </div>
                  )}

                  {pmLoading && (
                    <div {...stagger(2)}>
                      <Card className="shadow-elevation-2" role="status" aria-label="Loading PM checklist">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Clipboard className="h-5 w-5" />
                            Loading PM Checklist...
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-32 bg-muted animate-pulse rounded" aria-hidden="true" />
                        </CardContent>
                      </Card>
                    </div>
                  )}
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

              {/* Images Section */}
              <div {...stagger(4)}>
              <WorkOrderImagesSection 
                workOrderId={workOrder.id}
                organizationId={workOrder.organization_id}
                canUpload={canUpload}
                showPrivateNotes={permissionLevels.isManager}
                primaryImageId={workOrder.primary_image_id}
              />
              </div>

              {/* Notes Section */}
              <div {...stagger(5)}>
              <div ref={notesSectionRef}>
                <WorkOrderNotesSection 
                  workOrderId={workOrder.id}
                  canAddNotes={canAddNotes}
                  showPrivateNotes={permissionLevels.isManager}
                  hideInlineAddButton={hideInlineNoteAddButton}
                  autoOpenForm={shouldAutoOpenNoteForm}
                  openFormTrigger={openNoteFormTrigger}
                />
              </div>
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
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5" />
                      Change History (Field Edits)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-3 text-sm text-muted-foreground">
                      Shows who changed work order fields and when.
                    </p>
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
          team={workOrder.team}
          isWorkOrderLocked={isWorkOrderLocked}
          baseCanAddNotes={baseCanAddNotes}
          onStatusUpdate={handleStatusUpdate}
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

      {/* Mobile PDF Export Dialog */}
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

      {/* Mobile Action Sheet */}
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

      {/* Mobile Complete Confirmation Dialog */}
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

function getPMChecklistStats(checklistData: unknown): { progress: number; total: number } {
  try {
    const checklist = typeof checklistData === 'string'
      ? JSON.parse(checklistData)
      : checklistData;

    if (!Array.isArray(checklist)) {
      return { progress: 0, total: 0 };
    }

    return {
      progress: checklist.filter((item: PMChecklistItem) => item.condition !== null && item.condition !== undefined).length,
      total: checklist.length,
    };
  } catch {
    return { progress: 0, total: 0 };
  }
}

export default WorkOrderDetails;
