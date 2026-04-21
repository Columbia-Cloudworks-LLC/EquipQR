import { useQuery } from '@tanstack/react-query';
import {
  fetchPMComplianceData,
  fetchEquipmentByStatus,
  fetchCostTrendData,
  fetchDashboardTrends,
  type DashboardTrends,
} from '@/features/dashboard/services/dashboardWidgetService';

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
  return useQuery({
    queryKey: ['dashboard-pm-compliance', organizationId],
    queryFn: async (): Promise<PMStatusCount[]> => {
      if (!organizationId) return [];

      const { rows, overdueRows } = await fetchPMComplianceData(organizationId);
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
  return useQuery({
    queryKey: ['dashboard-equipment-by-status', organizationId],
    queryFn: async (): Promise<StatusCount[]> => {
      if (!organizationId) return [];

      const rows = await fetchEquipmentByStatus(organizationId);

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
  return useQuery({
    queryKey: ['dashboard-cost-trend', organizationId],
    queryFn: async (): Promise<CostRawItem[]> => {
      if (!organizationId) return [];
      return fetchCostTrendData(organizationId);
    },
    enabled: !!organizationId,
    staleTime: 60 * 1000,
  });
}

// ─── Dashboard Trends (issue #589) ──────────────────────────────────────────

/**
 * Real historical data for the four DashboardStatsGrid KPIs. Fed directly into
 * StatsCard `sparkline` and `trend` props. Team-scoped via the same pattern as
 * useTeamBasedDashboardStats so trend context matches the current-value chip.
 *
 * staleTime is intentionally higher than the point-in-time stats (5 min vs 30s)
 * because historical trends don't move often and sparkline re-renders are
 * visually noisy.
 */
export function useDashboardTrends(
  organizationId: string | undefined,
  userTeamIds: string[],
  isManager: boolean,
  enabled: boolean = true,
  days: number = 7
) {
  return useQuery({
    queryKey: [
      'dashboard-trends',
      organizationId,
      userTeamIds,
      isManager,
      days,
    ],
    queryFn: async (): Promise<DashboardTrends | null> => {
      if (!organizationId) return null;
      return fetchDashboardTrends(organizationId, userTeamIds, isManager, days);
    },
    enabled: !!organizationId && enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
