import React, { useState, useCallback, useMemo } from 'react';
import { Settings2, RotateCcw } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useTeamBasedDashboardAccess, useTeamBasedDashboardStats } from '@/features/teams/hooks/useTeamBasedDashboard';
import { useDashboardLayout } from '@/features/dashboard/hooks/useDashboardLayout';
import { DashboardGrid } from '@/features/dashboard/components/DashboardGrid';
import { WidgetCatalog } from '@/features/dashboard/components/WidgetCatalog';
import { WidgetManager } from '@/features/dashboard/components/WidgetManager';
import { DashboardNoTeamsCard } from '@/features/dashboard/components/DashboardNoTeamsCard';
import { DashboardStatsGrid } from '@/features/dashboard/components/DashboardStatsGrid';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';

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
  const { data: dashboardStats, dataUpdatedAt } = useTeamBasedDashboardStats(organizationId);

  const lastUpdatedText = useMemo(() => {
    if (!dataUpdatedAt) return null;
    const minutes = Math.floor((Date.now() - dataUpdatedAt) / 60_000);
    if (minutes < 1) return 'Updated just now';
    if (minutes === 1) return 'Updated 1 min ago';
    return `Updated ${minutes} min ago`;
  }, [dataUpdatedAt]);

  const dashboardDescription = useMemo(() => {
    const organizationName = currentOrganization?.name ?? "your organization";
    const overdueCount = dashboardStats?.overdueWorkOrders ?? 0;
    const needsAttentionCount = (dashboardStats?.maintenanceEquipment ?? 0) + (dashboardStats?.inactiveEquipment ?? 0);

    if (overdueCount === 0 && needsAttentionCount === 0) {
      return `Welcome back to ${organizationName}`;
    }

    const overdueLabel = `${overdueCount} overdue work order${overdueCount === 1 ? "" : "s"}`;
    const needsAttentionLabel = `${needsAttentionCount} equipment need${needsAttentionCount === 1 ? "s" : ""} attention`;
    return `${overdueLabel} - ${needsAttentionLabel}`;
  }, [currentOrganization?.name, dashboardStats]);

  const [managerOpen, setManagerOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);

  const handleResetLayout = useCallback(() => {
    resetToDefault();
    toast({
      title: 'Dashboard layout reset',
      description: 'Your default widget layout has been restored.',
    });
  }, [resetToDefault, toast]);

  const handleReorderSave = useCallback(
    (newOrder: string[]) => {
      updateWidgetOrder(newOrder);
    },
    [updateWidgetOrder]
  );

  const isLoading = orgLoading || accessLoading || layoutLoading;

  if (!currentOrganization) {
    return (
      <Page maxWidth="full" padding="responsive">
        <PageHeader
          title="Dashboard"
          description="Please select an organization to view your dashboard."
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
          description={dashboardDescription}
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
            <PageHeader
              title="Dashboard"
              description={dashboardDescription}
            />
            <div className="flex items-center gap-3 shrink-0 pt-1">
              {lastUpdatedText && (
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {lastUpdatedText}
                </span>
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResetLayout}
                      className="gap-1.5"
                      title="Restore default widget layout"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span className="hidden sm:inline">Reset Layout</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Restore default widget layout</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setManagerOpen(true)}
                className="gap-1.5"
              >
                <Settings2 className="h-4 w-4" />
                <span className="hidden sm:inline">Customize</span>
              </Button>
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
    </Page>
  );
};

export default Dashboard;
