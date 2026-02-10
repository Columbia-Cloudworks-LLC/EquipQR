
import React, { useState, useCallback } from 'react';
import { Settings2, LayoutGrid, RotateCcw, Plus } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useTeamBasedDashboardAccess } from '@/features/teams/hooks/useTeamBasedDashboard';
import { useDashboardLayout } from '@/features/dashboard/hooks/useDashboardLayout';
import { DashboardGrid } from '@/features/dashboard/components/DashboardGrid';
import { WidgetCatalog } from '@/features/dashboard/components/WidgetCatalog';
import { MobileWidgetReorder } from '@/features/dashboard/components/MobileWidgetReorder';
import { DashboardNoTeamsCard } from '@/features/dashboard/components/DashboardNoTeamsCard';
import { DashboardStatsGrid } from '@/features/dashboard/components/DashboardStatsGrid';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Layout } from 'react-grid-layout';

const Dashboard = () => {
  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const organizationId = currentOrganization?.id;
  const { hasTeamAccess, isLoading: accessLoading } = useTeamBasedDashboardAccess();

  const {
    layouts,
    activeWidgets,
    isLoading: layoutLoading,
    updateLayout,
    addWidget,
    removeWidget,
    resetToDefault,
  } = useDashboardLayout(organizationId);

  const isMobile = useIsMobile();
  const [isEditMode, setIsEditMode] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [reorderOpen, setReorderOpen] = useState(false);

  const isLoading = orgLoading || accessLoading || layoutLoading;

  const handleLayoutChange = useCallback(
    (_layout: Layout[], allLayouts: Record<string, Layout[]>) => {
      updateLayout(allLayouts);
    },
    [updateLayout]
  );

  const handleMobileReorderSave = useCallback(
    (newOrder: string[]) => {
      // Rebuild layouts with the new widget order
      const newLayouts = { ...layouts };
      for (const bp of Object.keys(newLayouts)) {
        const existingItems = newLayouts[bp];
        const reordered: Layout[] = [];
        let currentY = 0;

        for (const widgetId of newOrder) {
          const existing = existingItems.find((item) => item.i === widgetId);
          if (existing) {
            reordered.push({ ...existing, y: currentY });
            currentY += existing.h;
          }
        }
        newLayouts[bp] = reordered;
      }

      updateLayout(newLayouts);
    },
    [layouts, updateLayout]
  );

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

  // Show message for users without team access
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
          memberCount={0}
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
            <div className="flex items-center gap-2 shrink-0 pt-1">
              {isEditMode && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCatalogOpen(true)}
                    className="gap-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Add Widgets</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetToDefault}
                    className="gap-1.5"
                    title="Reset to default layout"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </>
              )}
              {isMobile && !isEditMode ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReorderOpen(true)}
                  className="gap-1.5"
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span>Customize</span>
                </Button>
              ) : (
                <Button
                  variant={isEditMode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setIsEditMode((prev) => !prev)}
                  className="gap-1.5"
                >
                  <Settings2 className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {isEditMode ? 'Done' : 'Customize'}
                  </span>
                </Button>
              )}
            </div>
          </div>

          <DashboardGrid
            activeWidgets={activeWidgets}
            layouts={layouts}
            isEditMode={isEditMode}
            onLayoutChange={handleLayoutChange}
            onRemoveWidget={isEditMode ? removeWidget : undefined}
          />
        </div>
      </div>

      {/* Widget catalog drawer */}
      <WidgetCatalog
        open={catalogOpen}
        onOpenChange={setCatalogOpen}
        activeWidgetIds={activeWidgets}
        onAddWidget={addWidget}
        onRemoveWidget={removeWidget}
      />

      {/* Mobile reorder sheet */}
      <MobileWidgetReorder
        open={reorderOpen}
        onOpenChange={setReorderOpen}
        activeWidgetIds={activeWidgets}
        onSave={handleMobileReorderSave}
      />
    </Page>
  );
};

export default Dashboard;
