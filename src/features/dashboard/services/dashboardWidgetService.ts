import { supabase } from '@/integrations/supabase/client';
import type { SelectedTeamId } from '@/contexts/selected-team-context';
import { UNASSIGNED_TEAM_ID } from '@/contexts/selected-team-context';
import {
  applySelectedTeamFilter,
  isAllTeamsScope,
  resolveDashboardEquipmentIdScope,
  selectedTeamIdToRpcParams,
} from '@/features/dashboard/utils/dashboardTeamScope';

/**
 * Dashboard widget service layer.
 * Centralises Supabase queries so widgets stay focused on presentation.
 */

// ─── PM Compliance ──────────────────────────────────────────────────────────

export interface PMOverdueRow {
  id: string;
}

/**
 * Fetch preventative maintenance records and their overdue subset for a given
 * org. Queries the `preventative_maintenance` table (not work_orders) so that
 * the PM compliance donut chart reflects actual PM status distribution.
 */
export async function fetchPMComplianceData(
  organizationId: string,
  selectedTeamId: SelectedTeamId | undefined = null,
  userTeamIds: string[] = [],
  isOrgAdmin: boolean = false,
) {
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const cutoff = twoYearsAgo.toISOString();

  const equipmentScope = await resolveDashboardEquipmentIdScope(
    organizationId,
    selectedTeamId,
    userTeamIds,
    isOrgAdmin,
  );

  if (equipmentScope.type === 'none') {
    return { rows: [], overdueRows: [] };
  }

  let pmQuery = supabase
    .from('preventative_maintenance')
    .select('id, status, work_order_id, equipment_id')
    .eq('organization_id', organizationId)
    .not('template_id', 'is', null)
    .gte('created_at', cutoff);

  if (equipmentScope.type === 'ids') {
    pmQuery = pmQuery.in('equipment_id', equipmentScope.ids);
  }

  const { data: pmRows, error: pmError } = await pmQuery;

  if (pmError) throw pmError;

  const allRows = pmRows ?? [];
  const activePMs = allRows.filter(r =>
    r.status === 'pending' || r.status === 'in_progress'
  );

  let overdueRows: PMOverdueRow[] = [];

  if (activePMs.length > 0) {
    const { data: pastDueWOs, error: woError } = await supabase
      .from('work_orders')
      .select('id')
      .eq('organization_id', organizationId)
      .in('id', activePMs.map(r => r.work_order_id))
      .not('due_date', 'is', null)
      .lt('due_date', new Date().toISOString());

    if (woError) throw woError;

    const pastDueIds = new Set((pastDueWOs ?? []).map(r => r.id));
    overdueRows = activePMs
      .filter(pm => pastDueIds.has(pm.work_order_id))
      .map(pm => ({ id: pm.id }));
  }

  return {
    rows: allRows.map(r => ({ id: r.id, status: r.status })),
    overdueRows,
  };
}

// ─── Equipment by Status ────────────────────────────────────────────────────

export interface EquipmentStatusRow {
  status: string;
}

/**
 * Fetch the `status` column for all equipment in the given org.
 * Note: fetches only the `status` column (minimal payload). A server-side
 * aggregate (RPC/view with GROUP BY + COUNT) would further reduce transfer
 * for very large fleets — tracked for future optimization.
 */
export async function fetchEquipmentByStatus(
  organizationId: string,
  selectedTeamId: SelectedTeamId | undefined = null,
  userTeamIds: string[] = [],
  isOrgAdmin: boolean = false,
): Promise<EquipmentStatusRow[]> {
  if (!isOrgAdmin) {
    if (selectedTeamId === UNASSIGNED_TEAM_ID) {
      return [];
    }
    if (isAllTeamsScope(selectedTeamId) && userTeamIds.length === 0) {
      return [];
    }
    if (
      selectedTeamId &&
      selectedTeamId !== UNASSIGNED_TEAM_ID &&
      !userTeamIds.includes(selectedTeamId)
    ) {
      return [];
    }
  }

  let query = supabase
    .from('equipment')
    .select('status')
    .eq('organization_id', organizationId);

  if (isAllTeamsScope(selectedTeamId)) {
    if (!isOrgAdmin) {
      query = query.in('team_id', userTeamIds);
    }
  } else {
    query = applySelectedTeamFilter(query, selectedTeamId);
  }

  const { data: rows, error } = await query;

  if (error) throw error;
  return rows ?? [];
}

// ─── Cost Trend ─────────────────────────────────────────────────────────────

export interface CostRow {
  totalPriceCents: number;
  createdAt: string;
}

/**
 * Fetch work order costs for the last 12 months, scoped to an organisation
 * via an inner join on work_orders.organization_id.
 */
export async function fetchCostTrendData(
  organizationId: string,
  selectedTeamId: SelectedTeamId | undefined = null,
  userTeamIds: string[] = [],
  isOrgAdmin: boolean = false,
): Promise<CostRow[]> {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const equipmentScope = await resolveDashboardEquipmentIdScope(
    organizationId,
    selectedTeamId,
    userTeamIds,
    isOrgAdmin,
  );

  if (equipmentScope.type === 'none') {
    return [];
  }

  let query = supabase
    .from('work_order_costs')
    .select('total_price_cents, created_at, work_orders!inner(organization_id, equipment_id)')
    .eq('work_orders.organization_id', organizationId)
    .gte('created_at', twelveMonthsAgo.toISOString())
    .order('created_at', { ascending: true });

  if (equipmentScope.type === 'ids') {
    query = query.in('work_orders.equipment_id', equipmentScope.ids);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data ?? []).map((row) => ({
    totalPriceCents: row.total_price_cents ?? 0,
    createdAt: row.created_at,
  }));
}

// ─── Dashboard Trends (issue #589) ──────────────────────────────────────────

export type TrendDirection = 'up' | 'down' | 'flat';

export interface StatTrend {
  /** Per-day values ordered oldest -> newest, length = requested days. */
  sparkline: number[];
  /** Integer percent change vs prior equal window, or null when prior = 0. */
  delta: number | null;
  direction: TrendDirection;
}

export interface DashboardTrends {
  totalEquipment: StatTrend;
  overdueWorkOrders: StatTrend;
  totalWorkOrders: StatTrend;
  needsAttention: StatTrend;
}

const emptyTrend = (days: number): StatTrend => ({
  sparkline: Array.from({ length: days }, () => 0),
  delta: null,
  direction: 'flat',
});

const emptyTrends = (days: number): DashboardTrends => ({
  totalEquipment: emptyTrend(days),
  overdueWorkOrders: emptyTrend(days),
  totalWorkOrders: emptyTrend(days),
  needsAttention: emptyTrend(days),
});

  /**
   * Fetch real historical trend data for the four dashboard KPIs via the
   * `get_dashboard_trends` RPC. Team scope and admin status are derived
   * entirely server-side from auth.uid() — no auth params are passed by the
   * caller (the RPC's SECURITY DEFINER contract prohibits caller-supplied
   * auth parameters).
   */
export async function fetchDashboardTrends(
    organizationId: string,
    days = 7,
    selectedTeamId: SelectedTeamId | undefined = null,
  ): Promise<DashboardTrends> {
    const { p_team_id, p_unassigned } = selectedTeamIdToRpcParams(selectedTeamId);
    const { data, error } = await supabase.rpc('get_dashboard_trends', {
      p_org_id: organizationId,
      p_days: days,
      p_team_id,
      p_unassigned,
    });

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return emptyTrends(days);

  const toTrend = (
    series: number[] | null | undefined,
    delta: number | null | undefined,
    direction: string | null | undefined
  ): StatTrend => ({
    sparkline: Array.isArray(series) ? series.map((v) => Number(v) || 0) : Array.from({ length: days }, () => 0),
    delta: typeof delta === 'number' ? delta : null,
    direction:
      direction === 'up' || direction === 'down' || direction === 'flat'
        ? direction
        : 'flat',
  });

  return {
    totalEquipment: toTrend(
      row.total_equipment_series,
      row.total_equipment_delta,
      row.total_equipment_direction
    ),
    overdueWorkOrders: toTrend(
      row.overdue_work_series,
      row.overdue_work_delta,
      row.overdue_work_direction
    ),
    totalWorkOrders: toTrend(
      row.total_work_orders_series,
      row.total_work_orders_delta,
      row.total_work_orders_direction
    ),
    needsAttention: toTrend(
      row.needs_attention_series,
      row.needs_attention_delta,
      row.needs_attention_direction
    ),
  };
}

