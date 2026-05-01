import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Settings2, RotateCcw, AlertTriangle, RefreshCw } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useTeamBasedDashboardAccess, useTeamBasedDashboardStats } from '@/features/teams/hooks/useTeamBasedDashboard';
import { useOrgEquipmentPMStatuses } from '@/features/equipment/hooks/useEquipmentPMStatus';
import { useDashboardLayout } from '@/features/dashboard/hooks/useDashboardLayout';
import { DashboardGrid } from '@/features/dashboard/components/DashboardGrid';
import { WidgetCatalog } from '@/features/dashboard/components/WidgetCatalog';
import { WidgetManager } from '@/features/dashboard/components/WidgetManager';
import { DashboardNoTeamsCard } from '@/features/dashboard/components/DashboardNoTeamsCard';
import { DashboardStatsGrid } from '@/features/dashboard/components/DashboardStatsGrid';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import DashboardFAB from '@/features/dashboard/components/DashboardFAB';

const Dashboard = () => {
  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const { toast } = useToast();
  const organizationId = currentOrganization?.id;
  const { hasTeamAccess, isLoading: accessLoading } = useTeamBasedDashboardAccess();

  const {
    activeWidgets,
    isLoading: layoutLoading,
    updateWidgetOrder,
    addWidget,
    removeWidget,
    resetToDefault,
  } = useDashboardLayout(organizationId);
  const { data: dashboardStats, dataUpdatedAt, refetch: refetchStats } = useTeamBasedDashboardStats(organizationId);
  const { data: pmStatuses } = useOrgEquipmentPMStatuses(organizationId);

  const lastUpdatedText = useMemo(() => {
    if (!dataUpdatedAt) return null;
    const minutes = Math.floor((Date.now() - dataUpdatedAt) / 60_000);
    if (minutes < 1) return 'Updated just now';
    if (minutes === 1) return 'Updated 1 min ago';
    return `Updated ${minutes} min ago`;
  }, [dataUpdatedAt]);

  const alertInfo = useMemo(() => {
    const overdueCount = dashboardStats?.overdueWorkOrders ?? 0;
    const pmOverdueCount = pmStatuses?.filter((s) => s.is_overdue).length ?? 0;
    const needsAttentionCount =
      (dashboardStats?.maintenanceEquipment ?? 0) +
      (dashboardStats?.inactiveEquipment ?? 0);
    if (overdueCount === 0 && needsAttentionCount === 0 && pmOverdueCount === 0) return null;
    const parts: string[] = [];
    if (overdueCount > 0) parts.push(`${overdueCount} overdue work order${overdueCount === 1 ? '' : 's'}`);
    if (needsAttentionCount > 0) {
      parts.push(
        `${needsAttentionCount} equipment need${needsAttentionCount === 1 ? 's' : ''} attention (maintenance or inactive)`
      );
    }
    if (pmOverdueCount > 0) {
      parts.push(`${pmOverdueCount} PM${pmOverdueCount === 1 ? '' : 's'} overdue`);
    }
    return parts.join(' · ');
  }, [dashboardStats, pmStatuses]);

  const [managerOpen, setManagerOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);

  const handleResetLayout = useCallback(() => {
    resetToDefault();
    toast({
      title: 'Dashboard layout reset',
      description: 'Your default widget layout has been restored.',
    });
  }, [resetToDefault, toast]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetchStats();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchStats]);

  const handleReorderSave = useCallback(
    (newOrder: string[]) => {
      updateWidgetOrder(newOrder);
    },
    [updateWidgetOrder]
  );

  const isLoading = orgLoading || accessLoading || layoutLoading;

  // Prefetch the three highest-traffic route chunks 1.5 s after mount so they
  // are cached before the user taps a nav item. The delay lets initial data
  // requests take priority over chunk downloads on a constrained link.
  useEffect(() => {
    const timer = setTimeout(() => {
      void import('@/features/equipment/pages/Equipment');
      void import('@/features/work-orders/pages/WorkOrders');
      void import('@/features/inventory/pages/InventoryList');
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  if (!currentOrganization) {
    return (
      <Page maxWidth="full" padding="responsive">
        <PageHeader
          title="Dashboard"
          description="Select an organization to view your dashboard."
        />
      </Page>
    );
  }

  if (!isLoading && !hasTeamAccess) {
    return (
      <Page maxWidth="full" padding="responsive">
        <PageHeader
          title="Dashboard"
          description={`Welcome to ${currentOrganization.name}`}
        />
        <DashboardNoTeamsCard organizationName={currentOrganization.name} />
      </Page>
    );
  }

  if (isLoading) {
    return (
      <Page maxWidth="full" padding="responsive">
        <PageHeader
          title="Dashboard"
          description="Loading your fleet overview..."
        />
        <DashboardStatsGrid
          stats={null}
          activeWorkOrdersCount={0}
          needsAttentionCount={0}
          isLoading
        />
      </Page>
    );
  }

  return (
    <Page maxWidth="full" padding="responsive">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-1.5">
              <PageHeader title="Dashboard" />
              {alertInfo && (
                <div className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive dark:border-destructive/40 dark:bg-destructive/15">
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
                  <span className="truncate">{alertInfo}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
              {lastUpdatedText && (
                <span className="text-xs text-muted-foreground hidden md:inline mr-1">
                  {lastUpdatedText}
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleRefresh}
                disabled={isRefreshing}
                title="Refresh dashboard data"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="sr-only">Refresh dashboard</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Dashboard settings">
                    <Settings2 className="h-4 w-4" />
                    <span className="sr-only">Dashboard settings</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setManagerOpen(true)}>
                    <Settings2 className="mr-2 h-4 w-4" />
                    Customize widgets
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleResetLayout}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset layout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <DashboardGrid activeWidgets={activeWidgets} />
        </div>
      </div>

      {/* Unified widget manager sheet — same on all screen sizes */}
      <WidgetManager
        open={managerOpen}
        onOpenChange={setManagerOpen}
        activeWidgetIds={activeWidgets}
        onSave={handleReorderSave}
        onOpenCatalog={() => setCatalogOpen(true)}
      />

      {/* Widget catalog for adding new widgets */}
      <WidgetCatalog
        open={catalogOpen}
        onOpenChange={setCatalogOpen}
        activeWidgetIds={activeWidgets}
        onAddWidget={addWidget}
        onRemoveWidget={removeWidget}
      />

      {/* Persistent mobile FAB for quick actions */}
      <DashboardFAB />
    </Page>
  );
};

export default Dashboard;
