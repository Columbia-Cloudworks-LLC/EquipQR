import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Settings2, RotateCcw, AlertTriangle, RefreshCw, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  useTeamBasedDashboardAccess,
  useTeamBasedDashboardStats,
  useTeamBasedRecentWorkOrders,
} from '@/features/teams/hooks/useTeamBasedDashboard';
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
import { useIsMobile } from '@/hooks/use-mobile';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useSelectedTeam } from '@/hooks/useSelectedTeam';
import { UNASSIGNED_TEAM_ID } from '@/contexts/selected-team-context';
import { useWorkOrderPermissionLevels } from '@/features/work-orders/hooks/useWorkOrderPermissionLevels';
import { useTeamMembership } from '@/features/teams/hooks/useTeamMembership';
import MobileDashboardHero from '@/features/dashboard/components/MobileDashboardHero';
import { orderWidgetsForMobile } from '@/features/dashboard/registry/widgetRegistry';
import { prioritizeWorkOrdersForDashboard } from '@/features/dashboard/utils/prioritizeWorkOrdersForDashboard';
import type { WorkOrder } from '@/features/work-orders/types/workOrder';
import { cn } from '@/lib/utils';

type DashboardRoleBucket = 'technician_requestor' | 'manager_admin' | 'viewer';

const Dashboard = () => {
  useDocumentTitle('Dashboard');
  const isMobile = useIsMobile();
  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const { toast } = useToast();
  const organizationId = currentOrganization?.id;
  const { hasTeamAccess, isLoading: accessLoading } = useTeamBasedDashboardAccess();
  const { selectedTeamId, selectedTeam } = useSelectedTeam();
  const { isManager, isTechnician } = useWorkOrderPermissionLevels();
  const { teamMemberships } = useTeamMembership();

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
  const { data: recentWorkOrders = [] } = useTeamBasedRecentWorkOrders(organizationId);

  const roleBucket: DashboardRoleBucket = useMemo(() => {
    if (isManager) return 'manager_admin';
    const managesTeam = teamMemberships.some((m) => m.role === 'manager');
    if (managesTeam) return 'manager_admin';
    const onlyViewer =
      teamMemberships.length > 0 && teamMemberships.every((m) => m.role === 'viewer');
    if (onlyViewer) return 'viewer';
    if (isTechnician) return 'technician_requestor';
    return 'technician_requestor';
  }, [isManager, isTechnician, teamMemberships]);

  const selectedTeamLabel = useMemo(() => {
    if (!selectedTeamId) return 'All teams';
    if (selectedTeamId === UNASSIGNED_TEAM_ID) return 'Unassigned';
    return selectedTeam?.team_name ?? 'Selected team';
  }, [selectedTeamId, selectedTeam]);

  const overdueCount = dashboardStats?.overdueWorkOrders ?? 0;
  const pmOverdueCount = pmStatuses?.filter((s) => s.is_overdue).length ?? 0;
  const needsAttentionCount =
    (dashboardStats?.maintenanceEquipment ?? 0) + (dashboardStats?.inactiveEquipment ?? 0);

  const prioritizedOpenWorkOrders = useMemo(() => {
    const rows = recentWorkOrders as WorkOrder[];
    const open = rows.filter((w) => w.status !== 'completed' && w.status !== 'cancelled');
    return prioritizeWorkOrdersForDashboard(open, 5);
  }, [recentWorkOrders]);

  const mobileWorkOrderPreview = useMemo(
    () => prioritizedOpenWorkOrders.slice(0, 3),
    [prioritizedOpenWorkOrders]
  );

  const displayWidgets = useMemo(
    () => (isMobile ? orderWidgetsForMobile(activeWidgets) : activeWidgets),
    [activeWidgets, isMobile]
  );

  const lastUpdatedText = useMemo(() => {
    if (!dataUpdatedAt) return null;
    const minutes = Math.floor((Date.now() - dataUpdatedAt) / 60_000);
    if (minutes < 1) return 'Updated just now';
    if (minutes === 1) return 'Updated 1 min ago';
    return `Updated ${minutes} min ago`;
  }, [dataUpdatedAt]);

  const alertInfo = useMemo(() => {
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
  }, [overdueCount, needsAttentionCount, pmOverdueCount]);

  const alertHref = useMemo(() => {
    if (overdueCount > 0 || pmOverdueCount > 0) return '/dashboard/work-orders?date=overdue';
    return '/dashboard/equipment';
  }, [overdueCount, pmOverdueCount]);

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

  useEffect(() => {
    if (import.meta.env.VITEST) return;
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
        {isMobile ? (
          <h1 className="sr-only">Dashboard</h1>
        ) : (
          <PageHeader title="Dashboard" description="Loading your fleet overview..." />
        )}
        <DashboardStatsGrid
          stats={null}
          activeWorkOrdersCount={0}
          needsAttentionCount={0}
          isLoading
        />
      </Page>
    );
  }

  const toolbar = (
    <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
      {lastUpdatedText && (
        <span className="text-xs text-muted-foreground hidden md:inline mr-1">{lastUpdatedText}</span>
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
  );

  return (
    <Page maxWidth="full" padding="responsive">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-3">
              {isMobile ? (
                <>
                  <h1 className="sr-only">Dashboard</h1>
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Team scope</p>
                    <p className="text-sm text-foreground">{selectedTeamLabel}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      View:&nbsp;
                      {roleBucket === 'manager_admin'
                        ? 'Manager / admin analytics'
                        : roleBucket === 'viewer'
                          ? 'Viewer'
                          : 'Field / requestor'}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <PageHeader title="Dashboard" />
                  {alertInfo && (
                    <div className="inline-flex max-w-full items-start gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive dark:border-destructive/40 dark:bg-destructive/15">
                      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" aria-hidden />
                      <span className="min-w-0 whitespace-normal break-words">{alertInfo}</span>
                    </div>
                  )}
                </>
              )}
            </div>
            {toolbar}
          </div>

          {isMobile && (
            <>
              <MobileDashboardHero />
              {alertInfo && (
                <Link
                  to={alertHref}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-xl border border-destructive/35 bg-destructive/10 px-4 py-3',
                    'text-sm font-semibold text-destructive shadow-sm transition-colors hover:bg-destructive/15',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    'touch-manipulation min-h-[48px]'
                  )}
                  data-testid="dashboard-mobile-alert-card"
                >
                  <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" aria-hidden />
                  <span className="min-w-0 flex-1 whitespace-normal break-words leading-snug">{alertInfo}</span>
                  <ChevronRight className="h-5 w-5 flex-shrink-0 opacity-70" aria-hidden />
                </Link>
              )}
              {mobileWorkOrderPreview.length > 0 && (
                <section aria-label="Priority open work" className="space-y-2">
                  <h2 className="text-sm font-semibold text-foreground">Open work — tap to open</h2>
                  <ul className="space-y-2">
                    {mobileWorkOrderPreview.map((wo) => {
                      const eqName = wo.equipment?.name;
                      return (
                        <li key={wo.id}>
                          <Link
                            to={`/dashboard/work-orders/${wo.id}`}
                            className={cn(
                              'flex flex-col gap-0.5 rounded-lg border bg-card px-3 py-2.5 text-left transition-colors',
                              'hover:bg-muted/60 active:scale-[0.99] touch-manipulation min-h-[48px]',
                              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                            )}
                          >
                            <span className="font-medium text-foreground leading-snug break-words">{wo.title}</span>
                            {eqName ? (
                              <span className="text-xs text-muted-foreground">{eqName}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Work order</span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}
            </>
          )}

          <DashboardGrid activeWidgets={displayWidgets} />
        </div>
      </div>

      <WidgetManager
        open={managerOpen}
        onOpenChange={setManagerOpen}
        activeWidgetIds={activeWidgets}
        onSave={handleReorderSave}
        onOpenCatalog={() => setCatalogOpen(true)}
      />

      <WidgetCatalog
        open={catalogOpen}
        onOpenChange={setCatalogOpen}
        activeWidgetIds={activeWidgets}
        onAddWidget={addWidget}
        onRemoveWidget={removeWidget}
      />

      <DashboardFAB />
    </Page>
  );
};

export default Dashboard;
