import React from 'react';
import { Forklift, Users, ClipboardList, AlertTriangle } from 'lucide-react';
import { StatsCard } from './StatsCard';

interface DashboardStats {
  totalEquipment: number;
  activeEquipment: number;
  totalWorkOrders: number;
  overdueWorkOrders: number;
}

interface DashboardStatsGridProps {
  stats: DashboardStats | null | undefined;
  activeWorkOrdersCount: number;
  memberCount: number;
  isLoading?: boolean;
}

/**
 * A grid of dashboard stats cards displaying key metrics.
 * Handles both loading and loaded states internally.
 */
export const DashboardStatsGrid: React.FC<DashboardStatsGridProps> = ({
  stats,
  activeWorkOrdersCount,
  memberCount,
  isLoading = false,
}) => {
  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
      <StatsCard
        icon={<Forklift className="h-4 w-4" />}
        label="Total Equipment"
        value={stats?.totalEquipment ?? 0}
        sublabel={`${stats?.activeEquipment ?? 0} active`}
        to={isLoading ? undefined : "/dashboard/equipment"}
        ariaDescription="View all equipment in the fleet"
        loading={isLoading}
      />

      <StatsCard
        icon={<AlertTriangle className="h-4 w-4" />}
        label="Overdue Work"
        value={stats?.overdueWorkOrders ?? 0}
        sublabel="Past due work orders"
        to={isLoading ? undefined : "/dashboard/work-orders?date=overdue"}
        ariaDescription="View overdue work orders"
        loading={isLoading}
      />

      <StatsCard
        icon={<ClipboardList className="h-4 w-4" />}
        label="Total Work Orders"
        value={stats?.totalWorkOrders ?? 0}
        sublabel={`${activeWorkOrdersCount} active`}
        to={isLoading ? undefined : "/dashboard/work-orders"}
        ariaDescription="View all work orders"
        loading={isLoading}
      />

      <StatsCard
        icon={<Users className="h-4 w-4" />}
        label="Org Members"
        value={memberCount}
        sublabel="Active organization members"
        to={isLoading ? undefined : "/dashboard/organization"}
        ariaDescription="View organization members"
        loading={isLoading}
      />
    </div>
  );
};
