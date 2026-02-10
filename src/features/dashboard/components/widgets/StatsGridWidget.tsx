import React from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useTeamBasedDashboardStats, useTeamBasedRecentWorkOrders } from '@/features/teams/hooks/useTeamBasedDashboard';
import { DashboardStatsGrid } from '@/features/dashboard/components/DashboardStatsGrid';

/**
 * Self-contained stats grid widget that fetches its own data.
 * Designed to work standalone inside the dashboard grid.
 */
const StatsGridWidget: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id;
  const { data: stats, isLoading: statsLoading } = useTeamBasedDashboardStats(organizationId);
  const { data: workOrders } = useTeamBasedRecentWorkOrders(organizationId);

  const activeWorkOrdersCount = workOrders?.filter((wo) => wo.status !== 'completed').length || 0;

  return (
    <DashboardStatsGrid
      stats={stats}
      activeWorkOrdersCount={activeWorkOrdersCount}
      memberCount={currentOrganization?.memberCount ?? 0}
      isLoading={statsLoading}
    />
  );
};

export default StatsGridWidget;
