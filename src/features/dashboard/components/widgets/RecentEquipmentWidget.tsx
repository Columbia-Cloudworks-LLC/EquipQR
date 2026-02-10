import React from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useTeamBasedEquipment } from '@/features/teams/hooks/useTeamBasedDashboard';
import { DashboardRecentEquipmentCard } from '@/features/dashboard/components/DashboardRecentEquipmentCard';

const PREVIEW_LIMIT = 5;

/**
 * Self-contained recent equipment widget that fetches its own data.
 */
const RecentEquipmentWidget: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id;
  const { data: equipment, isLoading } = useTeamBasedEquipment(organizationId);

  const recentEquipment = equipment?.slice(0, PREVIEW_LIMIT) || [];
  const hasMore = (equipment?.length ?? 0) > PREVIEW_LIMIT;

  return (
    <DashboardRecentEquipmentCard
      equipment={recentEquipment}
      isLoading={isLoading}
      hasMore={hasMore}
    />
  );
};

export default RecentEquipmentWidget;
