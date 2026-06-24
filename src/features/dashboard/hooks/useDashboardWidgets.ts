import { useQuery } from '@tanstack/react-query';
import {
  fetchPMComplianceData,
  fetchEquipmentByStatus,
  fetchCostTrendData,
  fetchDashboardTrends,
  type DashboardTrends,
} from '@/features/dashboard/services/dashboardWidgetService';
import { useDashboardWidgetTeamScope } from '@/features/dashboard/hooks/useDashboardTeamQueryContext';
import { dashboard as dashboardKeys } from '@/lib/queryKeys/dashboard';

/**
 * TanStack Query hooks for dashboard widgets.
 * Each hook wraps its corresponding service function so that widgets
 * consume data via the service → hook → component architecture.
 */

// ─── PM Compliance ──────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  completed: { label: 'Completed', color: 'hsl(var(--chart-1))' },
  in_progress: { label: 'In Progress', color: 'hsl(var(--chart-2))' },
  pending: { label: 'Pending', color: 'hsl(var(--chart-3))' },
  cancelled: { label: 'Cancelled', color: 'hsl(var(--chart-4))' },
  overdue: { label: 'Overdue', color: 'hsl(var(--destructive))' },
} as const;

export interface PMStatusCount {
  status: string;
  count: number;
  label: string;
  color: string;
}

export function usePMCompliance(organizationId: string | undefined) {
  const { selectedTeamId, userTeamIds, isManager } = useDashboardWidgetTeamScope();

  return useQuery({
    queryKey: organizationId
      ? dashboardKeys(organizationId, selectedTeamId).pmCompliance()
      : ['dashboard-pm-compliance', organizationId],
    queryFn: async (): Promise<PMStatusCount[]> => {
      if (!organizationId) return [];

      const { rows, overdueRows } = await fetchPMComplianceData(
        organizationId,
        selectedTeamId,
        userTeamIds,
        isManager,
      );
      const overdueIds = new Set(overdueRows.map((r) => r.id));

      const counts = new Map<string, number>();
      for (const row of rows) {
        if (overdueIds.has(row.id)) {
          counts.set('overdue', (counts.get('overdue') ?? 0) + 1);
        } else {
          const s = row.status ?? 'unknown';
          counts.set(s, (counts.get(s) ?? 0) + 1);
        }
      }

      return Array.from(counts.entries())
        .filter(([, count]) => count > 0)
        .map(([status, count]) => ({
          status,
          count,
          label: STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.label ?? status,
          color: STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.color ?? 'hsl(var(--muted))',
        }));
    },
    enabled: !!organizationId,
    staleTime: 60 * 1000,
  });
}

// ─── Equipment by Status ────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  maintenance: 'Maintenance',
  retired: 'Retired',
  inactive: 'Inactive',
  decommissioned: 'Decommissioned',
};

export interface StatusCount {
  status: string;
  count: number;
  label: string;
}

export function useEquipmentByStatus(organizationId: string | undefined) {
  const { selectedTeamId } = useDashboardWidgetTeamScope();

  return useQuery({
    queryKey: organizationId
      ? dashboardKeys(organizationId, selectedTeamId).equipmentByStatus()
      : ['dashboard-equipment-by-status', organizationId],
    queryFn: async (): Promise<StatusCount[]> => {
      if (!organizationId) return [];

      const rows = await fetchEquipmentByStatus(organizationId, selectedTeamId);

      const counts = new Map<string, number>();
      for (const row of rows) {
        const s = row.status ?? 'unknown';
        counts.set(s, (counts.get(s) ?? 0) + 1);
      }

      return Array.from(counts.entries()).map(([status, count]) => ({
        status,
        count,
        label: STATUS_LABELS[status] ?? status,
      }));
    },
    enabled: !!organizationId,
    staleTime: 60 * 1000,
  });
}

// ─── Cost Trend ─────────────────────────────────────────────────────────────

export interface CostRawItem {
  totalPriceCents: number;
  createdAt: string;
}

export function useCostTrend(organizationId: string | undefined) {
  const { selectedTeamId, userTeamIds, isManager } = useDashboardWidgetTeamScope();

  return useQuery({
    queryKey: organizationId
      ? dashboardKeys(organizationId, selectedTeamId).costTrend()
      : ['dashboard-cost-trend', organizationId],
    queryFn: async (): Promise<CostRawItem[]> => {
      if (!organizationId) return [];
      return fetchCostTrendData(organizationId, selectedTeamId, userTeamIds, isManager);
    },
    enabled: !!organizationId,
    staleTime: 60 * 1000,
  });
}

// ─── Dashboard Trends (issue #589) ──────────────────────────────────────────

/**
 * Real historical data for the four DashboardStatsGrid KPIs. Fed directly into
 * StatsCard `sparkline` and `trend` props. Team-scoped via the TopBar selection
 * passed to get_dashboard_trends (intersected server-side with RBAC).
 */
export function useDashboardTrends(
    organizationId: string | undefined,
    enabled: boolean = true,
    days: number = 7
  ) {
    const { selectedTeamId } = useDashboardWidgetTeamScope();

    return useQuery({
      queryKey: organizationId
        ? dashboardKeys(organizationId, selectedTeamId).trends(days)
        : ['dashboard-trends', organizationId, days],
      queryFn: async (): Promise<DashboardTrends | null> => {
        if (!organizationId) return null;
        return fetchDashboardTrends(organizationId, days, selectedTeamId);
      },
      enabled: !!organizationId && enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
