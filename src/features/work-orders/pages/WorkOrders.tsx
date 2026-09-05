import React, { lazy, Suspense, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, ShieldCheck, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useTeamBasedWorkOrders, useTeamBasedAccess } from '@/features/teams/hooks/useTeamBasedWorkOrders';
import { useUpdateWorkOrderStatus } from '@/features/work-orders/hooks/useWorkOrderData';
import { useWorkOrderAcceptance } from '@/features/work-orders/hooks/useWorkOrderAcceptance';
import { useBatchAssignUnassignedWorkOrders } from '@/features/work-orders/hooks/useBatchAssignUnassignedWorkOrders';
import { useWorkOrderFilters } from '@/features/work-orders/hooks/useWorkOrderFilters';
import { useUser } from '@/contexts/useUser';
import { useSelectedTeam } from '@/hooks/useSelectedTeam';
import { UNASSIGNED_TEAM_ID } from '@/contexts/selected-team-context';
import type { WorkOrder, WorkOrderAcceptanceModalState, WorkOrderData } from '@/features/work-orders/types/workOrder';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { SortDirection, SortField } from '@/features/work-orders/hooks/useWorkOrderFilters';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import WorkOrderForm from '@/features/work-orders/components/WorkOrderForm';
import WorkOrderAcceptanceModal from '@/features/work-orders/components/WorkOrderAcceptanceModal';
import { AutoAssignmentBanner } from '@/features/work-orders/components/AutoAssignmentBanner';
import { WorkOrderFilters } from '@/features/work-orders/components/WorkOrderFilters';
import { WorkOrdersList } from '@/features/work-orders/components/WorkOrdersList';
import WorkOrderQRCodeDisplay from '@/features/work-orders/components/WorkOrderQRCodeDisplay';
import { WorkOrderDeleteConfirmDialog } from '@/features/work-orders/components/WorkOrderDeleteConfirmDialog';
import { useDeleteWorkOrder } from '@/features/work-orders/hooks/useDeleteWorkOrder';
import { useWorkOrderImageCount } from '@/features/work-orders/hooks/useWorkOrderImageCount';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';
import type { MergedWorkOrder } from '@/features/work-orders/hooks/useOfflineMergedWorkOrders';
import { useEquipmentSummaries } from '@/features/equipment/hooks/useEquipment';
import { useOfflineMergedWorkOrders } from '@/features/work-orders/hooks/useOfflineMergedWorkOrders';
import { usePMTemplates } from '@/features/pm-templates/hooks/usePMTemplates';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { MobileListGlanceCount } from '@/components/common/MobileListGlanceCount';
import {
  applyCalendarDrag,
  applyDueWrite,
  calendarEditability,
  parseDue,
  parseUrlDate,
  persistDue,
  resolveWorkOrdersChrome,
  serializeChromeParams,
  toCalendarItem,
  WORK_ORDERS_VIEW_MODE_KEY,
  CalendarRangeToggle,
  WorkOrdersViewToggle,
  type CreateDuePrefill,
} from '@/features/work-orders/calendar';
import { WorkOrderCalendarPanel } from '@/features/work-orders/calendar/WorkOrderCalendarPanel';

const WorkOrderCalendar = lazy(async () => {
  const { WorkOrderCalendar: Calendar } = await import(
    '@/features/work-orders/calendar/WorkOrderCalendar'
  );
  return { default: Calendar };
});
import { useUpdateWorkOrder } from '@/features/work-orders/hooks/useWorkOrderUpdate';
import { filterWorkOrders } from '@/features/work-orders/hooks/workOrderFilterUtils';
import { getPreferenceLocalStorage, setPreferenceLocalStorage } from '@/lib/cookieConsent';

const VALID_SORT_FIELDS: readonly SortField[] = ['created', 'due_date', 'priority', 'status'];
const VALID_SORT_DIRECTIONS: readonly SortDirection[] = ['asc', 'desc'];

const WorkOrders = () => {
  const [showForm, setShowForm] = useState(false);
  const [createPrefill, setCreatePrefill] = useState<CreateDuePrefill | null>(null);
  const [calendarEpoch, setCalendarEpoch] = useState(0);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [qrWorkOrder, setQrWorkOrder] = useState<WorkOrder | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkOrder | null>(null);
  const [acceptanceModal, setAcceptanceModal] = useState<WorkOrderAcceptanceModalState>({
    open: false,
    workOrder: null
  });

  const { currentOrganization } = useOrganization();
  const { currentUser } = useUser();
  const permissions = useUnifiedPermissions();
  const canDeleteWorkOrders = permissions.hasRole(['owner', 'admin']);
  const deleteWorkOrderMutation = useDeleteWorkOrder();
  const { data: deleteTargetImageData } = useWorkOrderImageCount(deleteTarget?.id);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initializedFromUrl = useRef(false);
  const { selectedTeamId, setSelectedTeamId } = useSelectedTeam();

  // Use team-based access control
  const { userTeamIds, isManager, isLoading: teamAccessLoading } = useTeamBasedAccess();
  
  // Use team-based work orders hook with proper admin flag
  const { data: allWorkOrders = [], isLoading: workOrdersLoading } = useTeamBasedWorkOrders();
  
  const updateStatusMutation = useUpdateWorkOrderStatus();
  const acceptanceMutation = useWorkOrderAcceptance();
  const batchAssignMutation = useBatchAssignUnassignedWorkOrders();

  // Pre-warm caches so the Create Work Order dialog works offline.
  // Equipment selector and PM template selector both need warm caches.
  // We use the lightweight summaries projection here — the selector only needs
  // id/name/manufacturer/model/serial/team/working_hours, NOT the full row.
  // The full row is fetched on-demand by `useEquipmentById` when a specific
  // work order is opened. This keeps the work-orders list initial payload
  // small on Slow 4G for large fleets.
  useEquipmentSummaries(currentOrganization?.id);
  usePMTemplates();

  // Merge server work orders with any pending offline queue items
  const mergedWorkOrders = useOfflineMergedWorkOrders(allWorkOrders);

  // Use custom filters hook
  const {
    filters,
    filteredWorkOrders,
    totalCount,
    activePresets,
    sortField,
    sortDirection,
    getActiveFilterCount,
    clearAllFilters,
    toggleQuickFilter,
    updateFilter,
    updateSort
  } = useWorkOrderFilters(mergedWorkOrders, currentUser?.id);

  const updateWorkOrder = useUpdateWorkOrder();

  const chrome = useMemo(() => resolveWorkOrdersChrome({
    urlDate: parseUrlDate(searchParams.get('date')),
    viewParam: searchParams.get('view'),
    rangeParam: searchParams.get('range'),
    woParam: searchParams.get('wo'),
    persist: getPreferenceLocalStorage(WORK_ORDERS_VIEW_MODE_KEY),
    isMobile,
  }), [isMobile, searchParams]);

  const creatingFromCalendar = showForm || createPrefill != null;
  const selectedWorkOrderId =
    chrome.surface === 'calendar' && !creatingFromCalendar
      ? chrome.selectedWorkOrderId
      : null;

  const calendarRows = useMemo(() => {
    if (chrome.surface !== 'calendar') return filteredWorkOrders;
    return filterWorkOrders(
      mergedWorkOrders as WorkOrderData[],
      { ...filters, dueDateFilter: 'all' },
      currentUser?.id,
    );
  }, [chrome.surface, currentUser?.id, filteredWorkOrders, filters, mergedWorkOrders]);

  const calendarItems = useMemo(() => {
    return calendarRows.map((wo) => {
      const row = wo as MergedWorkOrder & WorkOrderData;
      return toCalendarItem(row, calendarEditability({
        engineCanEdit: permissions.workOrders.getPermissions(row).canEdit,
        status: row.status,
        isOfflinePending: Boolean(row._isPendingSync) || row.id.startsWith('offline-'),
      }));
    });
  }, [calendarRows, permissions]);

  const writeChrome = useCallback((patch: Parameters<typeof serializeChromeParams>[1]) => {
    setSearchParams(serializeChromeParams(chrome, patch, searchParams), { replace: true });
  }, [chrome, searchParams, setSearchParams]);

  const openCreate = useCallback((prefill: CreateDuePrefill | null = null) => {
    setCreatePrefill(prefill);
    setShowForm(true);
    if (chrome.surface === 'calendar') {
      writeChrome({ selectedWorkOrderId: null });
    }
  }, [chrome.surface, writeChrome]);

  const persistCalendarDue = useCallback((workOrder: MergedWorkOrder, write: Parameters<typeof applyCalendarDrag>[2]) => {
    const editability = calendarEditability({
      engineCanEdit: permissions.workOrders.getPermissions(workOrder as WorkOrderData).canEdit,
      status: workOrder.status,
      isOfflinePending: Boolean(workOrder._isPendingSync) || workOrder.id.startsWith('offline-'),
    });
    const result = applyCalendarDrag(editability, parseDue(workOrder), write);
    if (result.kind === 'rejected') return;
    const nextDue = persistDue(result.due);
    updateWorkOrder.mutate(
      {
        workOrderId: workOrder.id,
        data: {
          dueDate: nextDue.dueDate ?? '',
          dueDateHasTime: nextDue.dueDateHasTime,
        },
      },
      { onError: () => setCalendarEpoch((epoch) => epoch + 1) },
    );
  }, [permissions, updateWorkOrder]);

  // Apply URL parameter filters on initial load.
  // The `team` parameter writes to the GLOBAL `useSelectedTeam` selection (not
  // the page-local filter) — the page is now driven by the TopBar selection,
  // so a deep link like `/dashboard/work-orders?team=<uuid>` updates the
  // global scope and the sync effect below mirrors it onto the page filter.
  // updateFilter and toggleQuickFilter are stable (useCallback in useWorkOrderFilters).
  useEffect(() => {
    if (initializedFromUrl.current) return;
    const date = searchParams.get('date');
    const team = searchParams.get('team');
    const status = searchParams.get('status');
    const sort = searchParams.get('sort');
    let didApply = false;

    if (team) {
      // 'all' in a deep link means "clear the team filter" (global scope = null).
      // 'unassigned' is already the UNASSIGNED_TEAM_ID sentinel value.
      // Any other value is treated as a team UUID.
      setSelectedTeamId(team === 'all' ? null : team);
      didApply = true;
    }
    if (date === 'overdue') {
      toggleQuickFilter('overdue');
      didApply = true;
    }
    if (status) {
      const validStatuses = ['submitted', 'accepted', 'assigned', 'in_progress', 'on_hold', 'completed', 'cancelled'];
      if (validStatuses.includes(status)) {
        updateFilter('statusFilter', status);
        didApply = true;
      }
    }
    if (sort) {
      const [field, direction] = sort.split(':');
      const isValidField = VALID_SORT_FIELDS.includes(field as SortField);
      const isValidDirection = VALID_SORT_DIRECTIONS.includes(direction as SortDirection);

      if (isValidField && isValidDirection) {
        updateSort(field as SortField, direction as SortDirection);
        didApply = true;
      }
    }

    if (didApply) {
      initializedFromUrl.current = true;
    }
  }, [searchParams, toggleQuickFilter, updateFilter, updateSort, setSelectedTeamId]);

  // Mirror the global TopBar team selection onto the page-local filter.
  // `null` (= "All teams") and `UNASSIGNED_TEAM_ID` are translated to the
  // sentinel values `useWorkOrderFilters` understands.
  useEffect(() => {
    const value =
      selectedTeamId === null
        ? 'all'
        : selectedTeamId === UNASSIGNED_TEAM_ID
          ? 'unassigned'
          : selectedTeamId;
    updateFilter('teamFilter', value);
  }, [selectedTeamId, updateFilter]);

  useEffect(() => {
    const defaultSortParam = 'created:desc';
    const nextSortParam = `${sortField}:${sortDirection}`;
    const currentSortParam = searchParams.get('sort') ?? defaultSortParam;

    if (currentSortParam === nextSortParam) {
      return;
    }

    const nextSearchParams = new URLSearchParams(searchParams);
    if (nextSortParam === defaultSortParam) {
      nextSearchParams.delete('sort');
    } else {
      nextSearchParams.set('sort', nextSortParam);
    }
    setSearchParams(nextSearchParams, { replace: true });
  }, [searchParams, setSearchParams, sortDirection, sortField]);

  // Check for unassigned work orders in single-user organization
  const unassignedCount = allWorkOrders.filter(order => 
    order.status === 'submitted' && !order.assigneeName && !order.teamName
  ).length;
  const isSingleUserOrg = currentOrganization?.memberCount === 1;

  const handleStatusUpdate = async (workOrderId: string, newStatus: string) => {
    if (!currentOrganization) return;
    
    try {
      await updateStatusMutation.mutateAsync({
        workOrderId,
        status: newStatus,
        organizationId: currentOrganization.id
      });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleAcceptClick = (workOrder: WorkOrderData) => {
    setAcceptanceModal({ open: true, workOrder });
  };

  const handleAcceptance = async (assigneeId?: string) => {
    if (!currentOrganization || !acceptanceModal.workOrder) return;
    
    await acceptanceMutation.mutateAsync({
      workOrderId: acceptanceModal.workOrder.id,
      organizationId: currentOrganization.id,
      assigneeId
    });

    setAcceptanceModal({ open: false, workOrder: null });
  };

  const handleQuickFilter = (preset: string) => {
    toggleQuickFilter(preset as import('@/features/work-orders/hooks/useWorkOrderFilters').QuickFilterPreset);
    setShowMobileFilters(false);
  };


  const handleAssignClick = () => {
    // For now, we'll focus on the assignment hover functionality
    // In the future, this could open a dedicated assignment modal
  };

  const handleShowQR = useCallback((workOrder: WorkOrder) => {
    setQrWorkOrder(workOrder);
  }, []);

  const handlePrintFieldWorksheet = useCallback(() => {
    if (!qrWorkOrder) return;
    setQrWorkOrder(null);
    navigate(`/dashboard/work-orders/${qrWorkOrder.id}?action=download-worksheet`);
  }, [navigate, qrWorkOrder]);

  const handleDeleteClick = useCallback((workOrder: WorkOrder) => {
    if ((workOrder as MergedWorkOrder)._isPendingSync) {
      toast.info('Pending sync', {
        description: 'Delete is available after the work order syncs.',
      });
      return;
    }
    setDeleteTarget(workOrder);
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    if (!canDeleteWorkOrders) {
      setDeleteTarget(null);
      return;
    }
    try {
      await deleteWorkOrderMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      // Error is handled in the mutation
    }
  };

  const isLoading = teamAccessLoading || workOrdersLoading;

  if (isLoading) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <PageHeader 
          title="Work Orders" 
          description="Loading team-based work orders..." 
        />
        <div className="grid gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </Page>
    );
  }


  const hasActiveFilters = getActiveFilterCount() > 0 || filters.searchQuery.length > 0;

  const accessDescription =
    !isManager && userTeamIds.length === 0
      ? 'No team assignments - contact your administrator for access'
      : undefined;

  // Generate meta badge based on access level
  const getAccessBadge = () => {
    if (isManager) {
      return (
        <Badge variant="secondary" className="text-xs gap-1">
          <ShieldCheck className="h-3 w-3" />
          Admin
        </Badge>
      );
    } else if (userTeamIds.length > 0) {
      return (
        <Badge variant="outline" className="text-xs gap-1">
          <Users className="h-3 w-3" />
          {userTeamIds.length} team{userTeamIds.length === 1 ? '' : 's'}
        </Badge>
      );
    }
    return null;
  };

  const selectedCalendarWorkOrder = selectedWorkOrderId
    ? calendarRows.find((row) => row.id === selectedWorkOrderId) as MergedWorkOrder | undefined
    : undefined;
  const createDuePersist = createPrefill
    ? persistDue(applyDueWrite({ kind: 'none' }, createPrefill))
    : null;

  return (
    <Page maxWidth="7xl" padding="responsive">
      <div className="space-y-4">
        <PageHeader 
          title="Work Orders" 
          description={accessDescription}
          meta={getAccessBadge()}
          hideDescriptionOnMobile={Boolean(accessDescription)}
          inlineMetaOnMobile
          actions={
            !isMobile ? (
              <Button
                type="button"
                data-testid="create-work-order-button"
                onClick={() => openCreate(null)}
                className="w-full sm:w-auto"
              >
                <Plus className="mr-2 h-4 w-4" />
                <span>Create Work Order</span>
              </Button>
            ) : undefined
          }
        />

        {isSingleUserOrg && (
          <AutoAssignmentBanner
            unassignedCount={unassignedCount}
            onAssignAll={() => currentOrganization && batchAssignMutation.mutate(currentOrganization.id)}
            isAssigning={batchAssignMutation.isPending}
          />
        )}

        <div className={cn(isMobile && 'space-y-2.5 pb-24', !isMobile && 'space-y-4')}>
          <div
            className={
              isMobile
                ? 'sticky top-0 z-sticky -mx-3 bg-background/95 px-3 pb-1 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:-mx-4 sm:px-4'
                : undefined
            }
          >
            <WorkOrderFilters
              filters={filters}
              activeFilterCount={getActiveFilterCount()}
              activePresets={activePresets}
              showMobileFilters={showMobileFilters}
              onShowMobileFiltersChange={setShowMobileFilters}
              onFilterChange={updateFilter}
              onClearFilters={clearAllFilters}
              onQuickFilter={handleQuickFilter}
              sortField={sortField}
              sortDirection={sortDirection}
              onSortChange={updateSort}
              resultCount={filteredWorkOrders.length}
              totalCount={totalCount}
              hideDueDateFilter={chrome.surface === 'calendar'}
              showSearchAndSort={chrome.surface === 'list'}
              rangeToggle={
                chrome.surface === 'calendar' ? (
                  <CalendarRangeToggle
                    range={chrome.range}
                    onChange={(range) => writeChrome({ range })}
                  />
                ) : undefined
              }
              viewToggle={
                isMobile ? undefined : (
                  <WorkOrdersViewToggle
                    surface={chrome.surface}
                    onChange={(surface) => {
                      setPreferenceLocalStorage(WORK_ORDERS_VIEW_MODE_KEY, surface);
                      writeChrome({ surface, selectedWorkOrderId: surface === 'list' ? null : selectedWorkOrderId });
                    }}
                  />
                )
              }
            />
          </div>

          {chrome.surface === 'list' ? (
            <WorkOrdersList
              workOrders={filteredWorkOrders}
              onAcceptClick={handleAcceptClick}
              onStatusUpdate={handleStatusUpdate}
              isUpdating={updateStatusMutation.isPending}
              isAccepting={acceptanceMutation.isPending}
              hasActiveFilters={hasActiveFilters}
              activePresets={activePresets}
              onCreateClick={() => openCreate(null)}
              onAssignClick={handleAssignClick}
              onReopenClick={() => undefined}
              onShowQR={handleShowQR}
              canDelete={canDeleteWorkOrders}
              onDeleteClick={handleDeleteClick}
            />
          ) : (
            <Suspense fallback={<div className="min-h-[24rem]" aria-busy="true" />}>
              <WorkOrderCalendar
                key={calendarEpoch}
                items={calendarItems}
                range={chrome.range}
                anchor={chrome.anchor}
                selectedWorkOrderId={selectedWorkOrderId}
                onIntent={(intent) => {
                  if (intent.type === 'select') {
                    setShowForm(false);
                    setCreatePrefill(null);
                    writeChrome({ selectedWorkOrderId: intent.workOrderId });
                    return;
                  }
                  if (intent.type === 'create') {
                    openCreate(intent.prefill);
                    return;
                  }
                  const wo = calendarRows.find((row) => row.id === intent.workOrderId);
                  if (!wo) return;
                  persistCalendarDue(wo as MergedWorkOrder, intent.write);
                }}
                onChromeChange={(next) => writeChrome(next)}
              />
            </Suspense>
          )}

          {isMobile && totalCount > 0 && (
            <MobileListGlanceCount
              resultCount={filteredWorkOrders.length}
              totalCount={totalCount}
              hasActiveFilters={hasActiveFilters}
              singularLabel="work order"
              pluralLabel="work orders"
              className="border-t pt-4"
            />
          )}
        </div>

        {isMobile && (
          <Button
            type="button"
            data-testid="create-work-order-button"
            size="icon"
            className="fixed bottom-[78px] right-4 z-fixed h-14 w-14 rounded-full shadow-elevation-3"
            onClick={() => openCreate(null)}
            aria-label="Create work order"
          >
            <Plus className="h-6 w-6" />
          </Button>
        )}

      {selectedCalendarWorkOrder ? (
        <WorkOrderCalendarPanel
          workOrder={selectedCalendarWorkOrder}
          editability={calendarEditability({
            engineCanEdit: permissions.workOrders.getPermissions(selectedCalendarWorkOrder as WorkOrderData).canEdit,
            status: selectedCalendarWorkOrder.status,
            isOfflinePending:
              Boolean(selectedCalendarWorkOrder._isPendingSync)
              || selectedCalendarWorkOrder.id.startsWith('offline-'),
          })}
          onClose={() => writeChrome({ selectedWorkOrderId: null })}
          onDueWrite={(write) => persistCalendarDue(selectedCalendarWorkOrder, write)}
        />
      ) : null}

      <WorkOrderForm
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setCreatePrefill(null);
        }}
        prefillDueDate={createDuePersist?.dueDate}
        prefillHasTime={createDuePersist?.dueDateHasTime ?? false}
        stayOnList={chrome.surface === 'calendar'}
        onCreated={(workOrderId) => {
          setShowForm(false);
          setCreatePrefill(null);
          writeChrome({ selectedWorkOrderId: workOrderId });
        }}
      />

      {/* Work Order Acceptance Modal */}
      {currentOrganization && (
        <WorkOrderAcceptanceModal
          open={acceptanceModal.open}
          onClose={() => setAcceptanceModal({ open: false, workOrder: null })}
          workOrder={acceptanceModal.workOrder}
          organizationId={currentOrganization.id}
          onAccept={handleAcceptance}
        />
      )}

      <WorkOrderQRCodeDisplay
        open={qrWorkOrder !== null}
        onClose={() => setQrWorkOrder(null)}
        workOrderId={qrWorkOrder?.id ?? ''}
        workOrderTitle={qrWorkOrder?.title}
        onPrintFieldWorksheet={handlePrintFieldWorksheet}
        showFieldWorksheet={isManager}
      />

      <WorkOrderDeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        imageData={deleteTargetImageData}
        isDeleting={deleteWorkOrderMutation.isPending}
        onConfirm={handleDeleteConfirm}
      />
      </div>
    </Page>
  );
};

export default WorkOrders;
