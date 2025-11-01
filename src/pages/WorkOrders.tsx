
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useTeamBasedWorkOrders, useTeamBasedAccess } from '@/hooks/useTeamBasedWorkOrders';
import { useUpdateWorkOrderStatus } from '@/hooks/useWorkOrderData';
import { useWorkOrderAcceptance } from '@/hooks/useWorkOrderAcceptance';
import { useBatchAssignUnassignedWorkOrders } from '@/hooks/useBatchAssignUnassignedWorkOrders';
import { useWorkOrderFilters } from '@/hooks/useWorkOrderFilters';

import { useIsMobile } from '@/hooks/use-mobile';
import { useTeams } from '@/hooks/useTeamManagement';
import { useUser } from '@/contexts/useUser';
import { WorkOrderAcceptanceModalState, WorkOrderData } from '@/types/workOrder';
import WorkOrderForm from '@/components/work-orders/WorkOrderForm';
import WorkOrderAcceptanceModal from '@/components/work-orders/WorkOrderAcceptanceModal';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import { WorkOrdersHeader } from '@/components/work-orders/WorkOrdersHeader';
import { AutoAssignmentBanner } from '@/components/work-orders/AutoAssignmentBanner';
import { WorkOrderFilters } from '@/components/work-orders/WorkOrderFilters';
import { WorkOrdersList } from '@/components/work-orders/WorkOrdersList';

const WorkOrders = () => {
  const [showForm, setShowForm] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [acceptanceModal, setAcceptanceModal] = useState<WorkOrderAcceptanceModalState>({
    open: false,
    workOrder: null
  });

  const { currentOrganization } = useOrganization();
  const { currentUser } = useUser();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const initializedFromUrl = useRef(false);

  // Use team-based access control
  const { userTeamIds, isManager, isLoading: teamAccessLoading } = useTeamBasedAccess();
  
  // Use team-based work orders hook with proper admin flag
  const { data: allWorkOrders = [], isLoading: workOrdersLoading } = useTeamBasedWorkOrders();
  const { data: teams = [] } = useTeams(currentOrganization?.id);
  
  const updateStatusMutation = useUpdateWorkOrderStatus();
  const acceptanceMutation = useWorkOrderAcceptance();
  const batchAssignMutation = useBatchAssignUnassignedWorkOrders();
  

  // Use custom filters hook
  const {
    filters,
    filteredWorkOrders,
    getActiveFilterCount,
    clearAllFilters,
    applyQuickFilter,
    updateFilter
  } = useWorkOrderFilters(allWorkOrders, currentUser?.id);

  // Apply URL parameter filters on initial load
  useEffect(() => {
    if (initializedFromUrl.current) return;
    const date = searchParams.get('date');
    if (date === 'overdue') {
      applyQuickFilter('overdue');
      initializedFromUrl.current = true;
    }
  }, [searchParams, applyQuickFilter]);

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
    applyQuickFilter(preset);
    setShowMobileFilters(false);
  };


  const handleAssignClick = () => {
    // For now, we'll focus on the assignment hover functionality
    // In the future, this could open a dedicated assignment modal
  };

  const isLoading = teamAccessLoading || workOrdersLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Work Orders</h1>
          <p className="text-muted-foreground">Loading team-based work orders...</p>
        </div>
        <div className="grid gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }


  const hasActiveFilters = getActiveFilterCount() > 0 || filters.searchQuery.length > 0;

  // Generate appropriate subtitle based on user's access level
  const getSubtitle = () => {
    if (isManager) {
      return 'Showing all work orders (organization admin access)';
    } else if (userTeamIds.length > 0) {
      return `Showing work orders for your ${userTeamIds.length} team${userTeamIds.length === 1 ? '' : 's'}`;
    } else {
      return 'No team assignments - contact your administrator for access';
    }
  };

  return (
    <div className="space-y-4">
      <WorkOrdersHeader 
        onCreateClick={() => setShowForm(true)} 
        subtitle={getSubtitle()}
      />

      {isSingleUserOrg && (
        <AutoAssignmentBanner
          unassignedCount={unassignedCount}
          onAssignAll={() => currentOrganization && batchAssignMutation.mutate(currentOrganization.id)}
          isAssigning={batchAssignMutation.isPending}
        />
      )}

      <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-4'}`}>
        {/* Main Content */}
        <div className={`space-y-4 ${isMobile ? '' : 'lg:col-span-3'}`}>
          <WorkOrderFilters
            filters={filters}
            activeFilterCount={getActiveFilterCount()}
            showMobileFilters={showMobileFilters}
            onShowMobileFiltersChange={setShowMobileFilters}
            onFilterChange={updateFilter}
            onClearFilters={clearAllFilters}
            onQuickFilter={handleQuickFilter}
            teams={teams}
          />

          <WorkOrdersList
            workOrders={filteredWorkOrders}
            onAcceptClick={handleAcceptClick}
            onStatusUpdate={handleStatusUpdate}
            isUpdating={updateStatusMutation.isPending}
            isAccepting={acceptanceMutation.isPending}
            hasActiveFilters={hasActiveFilters}
            onCreateClick={() => setShowForm(true)}
            onAssignClick={handleAssignClick}
            onReopenClick={() => undefined}
          />
        </div>

        {/* Notifications Sidebar - Only show on desktop */}
        {!isMobile && (
          <div className="lg:col-span-1">
            {currentOrganization && (
              <NotificationCenter organizationId={currentOrganization.id} />
            )}
          </div>
        )}
      </div>

      {/* Work Order Form Modal */}
      <WorkOrderForm 
        open={showForm} 
        onClose={() => setShowForm(false)} 
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
    </div>
  );
};

export default WorkOrders;
