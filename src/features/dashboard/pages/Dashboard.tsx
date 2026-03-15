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

const Dashboard = () => {
  const { currentOrganization, isLoading: orgLoading } = useOrganization();
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
  const { dataUpdatedAt } = useTeamBasedDashboardStats(organizationId);

  const lastUpdatedText = useMemo(() => {
    if (!dataUpdatedAt) return null;
    const minutes = Math.floor((Date.now() - dataUpdatedAt) / 60_000);
    if (minutes < 1) return 'Updated just now';
    if (minutes === 1) return 'Updated 1 min ago';
    return `Updated ${minutes} min ago`;
  }, [dataUpdatedAt]);

  const [managerOpen, setManagerOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);

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
          description={`Welcome back to ${currentOrganization.name}`}
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
              description={`Welcome back to ${currentOrganization.name}`}
            />
            <div className="flex items-center gap-3 shrink-0 pt-1">
              {lastUpdatedText && (
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {lastUpdatedText}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={resetToDefault}
                className="gap-1.5"
                title="Reset to default layout"
              >
                <RotateCcw className="h-4 w-4" />
                <span className="hidden sm:inline">Reset</span>
              </Button>
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
