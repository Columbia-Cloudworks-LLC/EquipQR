import React from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useTeamBasedRecentWorkOrders } from '@/features/teams/hooks/useTeamBasedDashboard';
import { DashboardRecentWorkOrdersCard } from '@/features/dashboard/components/DashboardRecentWorkOrdersCard';

const PREVIEW_LIMIT = 5;

/**
 * Self-contained recent work orders widget that fetches its own data.
 */
const RecentWorkOrdersWidget: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id;
  const { data: workOrders, isLoading } = useTeamBasedRecentWorkOrders(organizationId);

  const recentWorkOrders = workOrders?.slice(0, PREVIEW_LIMIT) || [];
  const hasMore = (workOrders?.length ?? 0) > PREVIEW_LIMIT;

  return (
    <DashboardRecentWorkOrdersCard
      workOrders={recentWorkOrders}
      isLoading={isLoading}
      hasMore={hasMore}
    />
  );
};

export default RecentWorkOrdersWidget;
