import React from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useTeamBasedDashboardStats, useTeamBasedRecentWorkOrders } from '@/features/teams/hooks/useTeamBasedDashboard';
import { DashboardStatsGrid } from '@/features/dashboard/components/DashboardStatsGrid';
import { useDashboardTrends } from '@/features/dashboard/hooks/useDashboardWidgets';
import { useTeamMembership } from '@/features/teams/hooks/useTeamMembership';
import { useWorkOrderPermissionLevels } from '@/features/work-orders/hooks/useWorkOrderPermissionLevels';

const StatsGridWidget: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id;
  const { data: stats, isLoading: statsLoading } = useTeamBasedDashboardStats(organizationId);
  const { data: workOrders } = useTeamBasedRecentWorkOrders(organizationId);

  // Trend data (issue #589) — team-scoped the same way as point-in-time stats.
  const { getUserTeamIds, isLoading: teamsLoading } = useTeamMembership();
  const { isManager } = useWorkOrderPermissionLevels();
  const userTeamIds = getUserTeamIds();
  const { data: trends } = useDashboardTrends(
    organizationId,
    userTeamIds,
    isManager,
    !teamsLoading
  );

  const activeWorkOrdersCount = workOrders?.filter((wo) => wo.status !== 'completed').length || 0;
  const needsAttentionCount = (stats?.maintenanceEquipment ?? 0) + (stats?.inactiveEquipment ?? 0);

  return (
    <DashboardStatsGrid
      stats={stats}
      activeWorkOrdersCount={activeWorkOrdersCount}
      needsAttentionCount={needsAttentionCount}
      isLoading={statsLoading}
      trends={trends ?? null}
    />
  );
};

export default StatsGridWidget;
