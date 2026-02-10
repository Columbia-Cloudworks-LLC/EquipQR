import React from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useTeamBasedRecentWorkOrders } from '@/features/teams/hooks/useTeamBasedDashboard';
import { DashboardHighPriorityWorkOrdersCard } from '@/features/dashboard/components/DashboardHighPriorityWorkOrdersCard';
import EmptyState from '@/components/ui/empty-state';
import { CheckCircle2 } from 'lucide-react';

/**
 * Self-contained high priority work orders widget that fetches its own data.
 */
const HighPriorityWOWidget: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id;
  const { data: workOrders, isLoading } = useTeamBasedRecentWorkOrders(organizationId);

  const highPriorityWorkOrders = workOrders?.filter(
    (wo) => wo.priority === 'high' && wo.status !== 'completed'
  ) || [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded bg-muted" />
        ))}
      </div>
    );
  }

  if (highPriorityWorkOrders.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="No high priority work orders"
        description="All high priority work orders are completed or none exist."
        className="py-6"
      />
    );
  }

  return <DashboardHighPriorityWorkOrdersCard workOrders={highPriorityWorkOrders} />;
};

export default HighPriorityWOWidget;
