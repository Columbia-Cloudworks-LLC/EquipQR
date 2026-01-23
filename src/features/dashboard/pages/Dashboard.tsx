
import React from 'react';

/** Maximum number of items to display in dashboard preview cards */
const DASHBOARD_PREVIEW_LIMIT = 5;

import { useOrganization } from '@/contexts/OrganizationContext';
import { useTeamBasedDashboardStats, useTeamBasedEquipment, useTeamBasedRecentWorkOrders, useTeamBasedDashboardAccess } from '@/features/teams/hooks/useTeamBasedDashboard';
import FleetEfficiencyScatterPlotCard from '@/features/dashboard/components/FleetEfficiencyScatterPlotCard';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import { DashboardHighPriorityWorkOrdersCard } from '@/features/dashboard/components/DashboardHighPriorityWorkOrdersCard';
import { DashboardRecentEquipmentCard } from '@/features/dashboard/components/DashboardRecentEquipmentCard';
import { DashboardRecentWorkOrdersCard } from '@/features/dashboard/components/DashboardRecentWorkOrdersCard';
import { DashboardNoTeamsCard } from '@/features/dashboard/components/DashboardNoTeamsCard';
import { DashboardStatsGrid } from '@/features/dashboard/components/DashboardStatsGrid';

const Dashboard = () => {
  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const organizationId = currentOrganization?.id;
  
  const { hasTeamAccess, isLoading: accessLoading } = useTeamBasedDashboardAccess();
  const { data: stats, isLoading: statsLoading } = useTeamBasedDashboardStats(organizationId);
  const { data: equipment, isLoading: equipmentLoading } = useTeamBasedEquipment(organizationId);
  const { data: workOrders, isLoading: workOrdersLoading } = useTeamBasedRecentWorkOrders(organizationId);

  const isLoading = orgLoading || statsLoading || accessLoading;


  if (!currentOrganization) {
    return (
      <Page maxWidth="7xl" padding="responsive">
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
      <Page maxWidth="7xl" padding="responsive">
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
      <Page maxWidth="7xl" padding="responsive">
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

  const recentEquipment = equipment?.slice(0, DASHBOARD_PREVIEW_LIMIT) || [];
  const recentWorkOrders = workOrders?.slice(0, DASHBOARD_PREVIEW_LIMIT) || [];
  const equipmentHasMore = (equipment?.length ?? 0) > DASHBOARD_PREVIEW_LIMIT;
  const workOrdersHasMore = (workOrders?.length ?? 0) > DASHBOARD_PREVIEW_LIMIT;
  const highPriorityWorkOrders = workOrders?.filter(wo => wo.priority === 'high' && wo.status !== 'completed') || [];
  const activeWorkOrdersCount = workOrders?.filter((wo) => wo.status !== "completed").length || 0;

  return (
    <Page maxWidth="7xl" padding="responsive">
      <div className="flex flex-col space-y-6">
        <PageHeader 
          title="Dashboard" 
          description={`Welcome back to ${currentOrganization.name}`} 
        />

        {/* High Priority section - positioned via CSS to prevent layout shift */}
        {/* Mobile: order-1 (first), Desktop: order-5 (last) */}
        {highPriorityWorkOrders.length > 0 && (
          <div className="order-1 md:order-5">
            <DashboardHighPriorityWorkOrdersCard workOrders={highPriorityWorkOrders} />
          </div>
        )}

        {/* Stats Cards */}
        {/* Mobile: order-2 (second), Desktop: order-1 (first) */}
        <div className="order-2 md:order-1">
          <DashboardStatsGrid
            stats={stats}
            activeWorkOrdersCount={activeWorkOrdersCount}
            memberCount={currentOrganization.memberCount}
          />
        </div>

        {/* Fleet Efficiency */}
        {/* Mobile: order-3 (third), Desktop: order-2 (second) */}
        <section aria-labelledby="fleet-efficiency-heading" className="order-3 md:order-2">
          <FleetEfficiencyScatterPlotCard />
        </section>

        {/* Recent Equipment and Work Orders */}
        {/* Mobile: order-4 (fourth), Desktop: order-3 (third) */}
        <div className="grid gap-6 md:grid-cols-2 order-4 md:order-3">
          <DashboardRecentEquipmentCard
            equipment={recentEquipment}
            isLoading={equipmentLoading}
            hasMore={equipmentHasMore}
          />
          <DashboardRecentWorkOrdersCard
            workOrders={recentWorkOrders}
            isLoading={workOrdersLoading}
            hasMore={workOrdersHasMore}
          />
        </div>
      </div>
    </Page>
  );
};

export default Dashboard;
