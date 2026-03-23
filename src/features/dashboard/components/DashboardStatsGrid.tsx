import React from 'react';
import { Forklift, Wrench, ClipboardList, AlertTriangle } from 'lucide-react';
import { StatsCard } from './StatsCard';

/**
 * Generate a synthetic 7-point sparkline anchored at `current`.
 * `shape` controls direction: rising (fleet growth/worsening), falling (improving), or stable.
 * This is a visual placeholder — replace with real 7-day historical data when available.
 */
function makeSparkline(current: number, shape: 'rising' | 'falling' | 'stable'): number[] {
  if (current === 0) return [0, 0, 0, 0, 0, 0, 0];
  const c = current;
  if (shape === 'rising') {
    return [
      Math.round(c * 0.72), Math.round(c * 0.80), Math.round(c * 0.86),
      Math.round(c * 0.91), Math.round(c * 0.94), Math.round(c * 0.97), c,
    ];
  }
  if (shape === 'falling') {
    return [
      c, Math.round(c * 0.97), Math.round(c * 0.94),
      Math.round(c * 0.91), Math.round(c * 0.86), Math.round(c * 0.80), Math.round(c * 0.72),
    ];
  }
  return [c, c, c, c, c, c, c];
}

interface DashboardStats {
  totalEquipment: number;
  activeEquipment: number;
  maintenanceEquipment?: number;
  inactiveEquipment?: number;
  totalWorkOrders: number;
  overdueWorkOrders: number;
}

interface DashboardStatsGridProps {
  stats: DashboardStats | null | undefined;
  activeWorkOrdersCount: number;
  needsAttentionCount: number;
  isLoading?: boolean;
}

/**
 * A grid of dashboard stats cards displaying key metrics.
 * Handles both loading and loaded states internally.
 */
export const DashboardStatsGrid: React.FC<DashboardStatsGridProps> = ({
  stats,
  activeWorkOrdersCount,
  needsAttentionCount,
  isLoading = false,
}) => {
  const overdueCount = stats?.overdueWorkOrders ?? 0;
  const totalEquipment = stats?.totalEquipment ?? 0;
  const totalWorkOrders = stats?.totalWorkOrders ?? 0;

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
      <StatsCard
        icon={<Forklift className="h-4 w-4" />}
        label="Total Equipment"
        value={totalEquipment}
        sublabel={`${stats?.activeEquipment ?? 0} active`}
        to={isLoading ? undefined : "/dashboard/equipment"}
        ariaDescription="View all equipment in the fleet"
        sparkline={isLoading ? undefined : makeSparkline(totalEquipment, 'rising')}
        loading={isLoading}
      />

      <StatsCard
        icon={<AlertTriangle className="h-4 w-4" />}
        label="Overdue Work"
        value={overdueCount}
        sublabel="Past due work orders"
        to={isLoading ? undefined : "/dashboard/work-orders?date=overdue"}
        ariaDescription="View overdue work orders"
        variant={overdueCount > 0 ? 'danger' : 'default'}
        sparkline={isLoading ? undefined : makeSparkline(overdueCount, overdueCount > 0 ? 'rising' : 'stable')}
        loading={isLoading}
      />

      <StatsCard
        icon={<ClipboardList className="h-4 w-4" />}
        label="Total Work Orders"
        value={totalWorkOrders}
        sublabel={`${activeWorkOrdersCount} active`}
        to={isLoading ? undefined : "/dashboard/work-orders"}
        ariaDescription="View all work orders"
        sparkline={isLoading ? undefined : makeSparkline(totalWorkOrders, 'rising')}
        loading={isLoading}
      />

      <StatsCard
        icon={<Wrench className="h-4 w-4" />}
        label="Out of Service"
        value={needsAttentionCount}
        sublabel="In maintenance or inactive"
        to={isLoading ? undefined : "/dashboard/equipment?status=out_of_service"}
        ariaDescription="View out-of-service equipment"
        variant={needsAttentionCount > 0 ? 'warning' : 'default'}
        sparkline={isLoading ? undefined : makeSparkline(needsAttentionCount, needsAttentionCount > 0 ? 'falling' : 'stable')}
        loading={isLoading}
      />
    </div>
  );
};
