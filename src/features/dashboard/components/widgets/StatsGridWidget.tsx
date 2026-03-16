import React from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useTeamBasedDashboardStats, useTeamBasedRecentWorkOrders } from '@/features/teams/hooks/useTeamBasedDashboard';
import { DashboardStatsGrid } from '@/features/dashboard/components/DashboardStatsGrid';
import { useOrgEquipmentPMStatuses } from '@/features/equipment/hooks/useEquipmentPMStatus';

const StatsGridWidget: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id;
  const { data: stats, isLoading: statsLoading } = useTeamBasedDashboardStats(organizationId);
  const { data: workOrders } = useTeamBasedRecentWorkOrders(organizationId);
  const { data: pmStatuses } = useOrgEquipmentPMStatuses(organizationId);

  const activeWorkOrdersCount = workOrders?.filter((wo) => wo.status !== 'completed').length || 0;
  const pmOverdueCount = pmStatuses?.filter((s) => s.is_overdue).length ?? 0;
  const needsAttentionCount =
    (stats?.maintenanceEquipment ?? 0) + (stats?.inactiveEquipment ?? 0) + pmOverdueCount;

  return (
    <DashboardStatsGrid
      stats={stats}
      activeWorkOrdersCount={activeWorkOrdersCount}
      needsAttentionCount={needsAttentionCount}
      isLoading={statsLoading}
    />
  );
};

export default StatsGridWidget;
