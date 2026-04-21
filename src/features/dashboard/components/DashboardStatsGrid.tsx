import React from 'react';
import { Forklift, Wrench, ClipboardList, AlertTriangle } from 'lucide-react';
import { StatsCard } from './StatsCard';
import type { DashboardTrends, StatTrend } from '@/features/dashboard/services/dashboardWidgetService';

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
  /** Optional trend series/deltas sourced from useDashboardTrends (issue #589). */
  trends?: DashboardTrends | null;
}

type CardTrendProps = {
  sparkline: number[] | undefined;
  trend:
    | {
        direction: 'up' | 'down' | 'flat';
        delta: number;
      }
    | undefined;
  trendNote: string | undefined;
};

/**
 * Convert a service-layer StatTrend into the shape StatsCard props expect.
 * Handles polarity overrides so chips stay semantically correct for metrics
 * where lower values are preferable (e.g. overdue work, needs attention).
 */
function toCardProps(
  trend: StatTrend | undefined,
  options?: { invertDirection?: boolean }
): CardTrendProps {
  if (!trend) return { sparkline: undefined, trend: undefined, trendNote: undefined };

  const hasSeries = trend.sparkline.length > 1;
  const hasDelta = trend.delta !== null && trend.delta !== undefined;
  const invertDirection = options?.invertDirection === true;
  const direction =
    invertDirection && trend.direction !== 'flat'
      ? trend.direction === 'up'
        ? 'down'
        : 'up'
      : trend.direction;

  return {
    sparkline: hasSeries ? trend.sparkline : undefined,
    trend: hasDelta ? { direction, delta: Math.abs(trend.delta) } : undefined,
    trendNote: hasSeries && hasDelta ? undefined : 'Insufficient history',
  };
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
  trends,
}) => {
  const overdueCount = stats?.overdueWorkOrders ?? 0;
  const totalEquipment = stats?.totalEquipment ?? 0;
  const totalWorkOrders = stats?.totalWorkOrders ?? 0;

  const teProps = toCardProps(trends?.totalEquipment);
  const owProps = toCardProps(trends?.overdueWorkOrders, { invertDirection: true });
  const twoProps = toCardProps(trends?.totalWorkOrders);
  const naProps = toCardProps(trends?.needsAttention, { invertDirection: true });

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
      <StatsCard
        icon={<Forklift className="h-4 w-4" />}
        label="Total Equipment"
        value={totalEquipment}
        sublabel={`${stats?.activeEquipment ?? 0} active`}
        to={isLoading ? undefined : "/dashboard/equipment"}
        ariaDescription="View all equipment in the fleet"
        loading={isLoading}
        sparkline={teProps.sparkline}
        trend={teProps.trend}
        trendNote={teProps.trendNote}
      />

      <StatsCard
        icon={<AlertTriangle className="h-4 w-4" />}
        label="Overdue Work"
        value={overdueCount}
        sublabel="Past due — open list to reprioritize"
        to={isLoading ? undefined : "/dashboard/work-orders?date=overdue"}
        ariaDescription="View overdue work orders"
        variant={overdueCount > 0 ? 'danger' : 'default'}
        loading={isLoading}
        sparkline={owProps.sparkline}
        trend={owProps.trend}
        trendNote={owProps.trendNote}
      />

      <StatsCard
        icon={<ClipboardList className="h-4 w-4" />}
        label="Total Work Orders"
        value={totalWorkOrders}
        sublabel={`${activeWorkOrdersCount} active`}
        to={isLoading ? undefined : "/dashboard/work-orders"}
        ariaDescription="View all work orders"
        loading={isLoading}
        sparkline={twoProps.sparkline}
        trend={twoProps.trend}
        trendNote={twoProps.trendNote}
      />

      <StatsCard
        icon={<Wrench className="h-4 w-4" />}
        label="Needs attention"
        value={needsAttentionCount}
        sublabel="Maintenance or inactive"
        to={isLoading ? undefined : "/dashboard/equipment?status=out_of_service"}
        ariaDescription="View equipment that needs attention"
        variant={needsAttentionCount > 0 ? 'warning' : 'default'}
        loading={isLoading}
        sparkline={naProps.sparkline}
        trend={naProps.trend}
        trendNote={naProps.trendNote}
      />
    </div>
  );
};
